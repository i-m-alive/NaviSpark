"""
Custom Checklist Review Pipeline orchestration.

Stage 1 — Preflight  (run_preflight)
  NC1 + NC2 run in parallel immediately after upload (~20 s).
  NC1 parses the proposal for context.
  NC2 parses the uploaded checklist into structured evaluation criteria.
  Status: uploading (NC1+NC2 running in background) → ready (waiting for user confirmation)

  NOTE: We reuse existing valid status values so no schema migration is needed.
  'uploading' = files stored, preflight running
  'ready'     = preflight done, waiting for user to confirm context and start NC3+NC4

Stage 2 — Evaluation  (run_custom_pipeline)
  Triggered by the user after reviewing / confirming NC1 / NC2 outputs.
  NC3 fans out one instance per checklist category (all parallel).
  NC4 synthesises the per-category results into a final scored report + verdict.
  Status: ready → pipeline_running → complete

Error states: pipeline_failed
"""

import asyncio
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from functools import partial

from services.session_service import get_session, update_session
from services.checklist_parser_service import extract_proposal_text, download_checklist_to_tempfile
from storage import download_file_from_storage, save_agent_output_to_storage
from services import event_emitter

logger = logging.getLogger(__name__)

# Shared pool — NC3 fan-out can be up to 8 categories wide
_executor = ThreadPoolExecutor(max_workers=10)


async def _in_thread(fn):
    """Run a zero-argument callable in the shared thread pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, fn)


def _is_cancelled(session_id: str, user_id: str) -> bool:
    try:
        s = get_session(session_id, user_id)
        return s.get("status") == "cancelled"
    except Exception:
        return False


# ── Stage 1: Preflight ────────────────────────────────────────────────────────

async def run_preflight(session_id: str, user_id: str) -> None:
    """
    NC1 (Document Intelligence) + NC2 (Checklist Intelligence) in parallel.
    Runs automatically as a FastAPI background task right after upload.
    Stores NC1 output in agent1_output, NC2 output in agent2_output.
    """
    from agents.NC1.agent import NC1Agent
    from agents.NC2.agent import NC2Agent

    event_emitter.ensure_session(session_id)
    _pipe = event_emitter.make_emitter(session_id, "pipeline")
    _emit_nc1 = event_emitter.make_emitter(session_id, "nc1")
    _emit_nc2 = event_emitter.make_emitter(session_id, "nc2")
    sid = session_id[:8]
    t0 = time.monotonic()

    def _elapsed() -> str:
        return f"{time.monotonic() - t0:.1f}s"

    try:
        # Status stays 'uploading' while preflight runs — avoids touching the status
        # CHECK constraint. We set it to 'ready' when preflight completes.
        _pipe("Pre-flight started — NC1 + NC2 running in parallel", "running")
        logger.info("[PREFLIGHT] [%s] Started", sid)

        session = get_session(session_id, user_id)
        file_type = session.get("file_type") or "pdf"
        storage_path = session.get("storage_path") or ""
        checklist_path = session.get("checklist_storage_path") or ""

        if not storage_path:
            raise ValueError("No storage_path found — proposal file not uploaded.")
        if not checklist_path:
            raise ValueError("No checklist_storage_path found — checklist not uploaded.")

        # ── Download proposal + extract text ──────────────────────────────────
        _pipe("Downloading and extracting proposal text")
        file_bytes = await _in_thread(partial(download_file_from_storage, storage_path))
        if not file_bytes:
            raise ValueError("Proposal file is empty.")

        proposal_text = await _in_thread(partial(extract_proposal_text, file_bytes, file_type))
        logger.info("[PREFLIGHT] [%s] Proposal text: %d chars", sid, len(proposal_text))

        # ── Download checklist to temp file ───────────────────────────────────
        _pipe("Downloading checklist for parsing")
        tmp_checklist = await _in_thread(partial(download_checklist_to_tempfile, checklist_path))
        logger.info("[PREFLIGHT] [%s] Checklist at: %s", sid, tmp_checklist)

        # ── NC1 + NC2 in parallel ─────────────────────────────────────────────
        _pipe("Launching NC1 (Document Intelligence) + NC2 (Checklist Intelligence)")

        def _run_nc1():
            _emit_nc1("NC1 — Document Intelligence: parsing proposal structure and context")
            agent = NC1Agent()
            result = agent.run(document_text=proposal_text, file_type=file_type)
            _emit_nc1(
                f"NC1 complete — confidence {result.get('confidence', 0):.0%}, "
                f"{len(result.get('structure_map', {}).get('sections', []))} sections detected",
                "completed",
            )
            return result

        def _run_nc2():
            _emit_nc2("NC2 — Checklist Intelligence: parsing checklist and building evaluation framework")
            agent = NC2Agent()
            result = agent.run(file_path=tmp_checklist, nc1_context=None)
            _emit_nc2(
                f"NC2 complete — {result.get('total_items', '?')} items across "
                f"{len(result.get('categories', []))} categories ({result.get('scoring_type', '?')})",
                "completed",
            )
            return result

        nc1_raw, nc2_raw = await asyncio.gather(
            _in_thread(_run_nc1),
            _in_thread(_run_nc2),
            return_exceptions=True,
        )

        # ── Clean up temp file ────────────────────────────────────────────────
        try:
            os.unlink(tmp_checklist)
        except Exception:
            pass

        errors: list[str] = []
        if isinstance(nc1_raw, BaseException):
            errors.append(f"NC1: {nc1_raw}")
            logger.error("[PREFLIGHT] [%s] NC1 FAILED: %s", sid, nc1_raw, exc_info=nc1_raw)
            event_emitter.emit_sync(session_id, "nc1", f"NC1 failed: {nc1_raw}", "error")
        if isinstance(nc2_raw, BaseException):
            errors.append(f"NC2: {nc2_raw}")
            logger.error("[PREFLIGHT] [%s] NC2 FAILED: %s", sid, nc2_raw, exc_info=nc2_raw)
            event_emitter.emit_sync(session_id, "nc2", f"NC2 failed: {nc2_raw}", "error")

        if errors:
            _pipe(f"Pre-flight failed: {'; '.join(errors)}", "error")
            update_session(session_id, user_id, {"status": "pipeline_failed"})
            return

        nc1_output: dict = nc1_raw  # type: ignore[assignment]
        nc2_output: dict = nc2_raw  # type: ignore[assignment]

        # Post-hoc NC2.5 enrichment: re-write evaluation prompts with NC1 context
        nc1_context = nc1_output.get("auto_detected", {})
        if nc1_context:
            try:
                from agents.NC2.agent import NC2Agent as _NC2Cls
                _nc2 = _NC2Cls()
                enriched_cats = _nc2.framework_builder.run(
                    nc2_output.get("categories", []),
                    nc2_output.get("scoring_type", "binary"),
                    nc1_context=nc1_context,
                )
                nc2_output["categories"] = enriched_cats
                logger.info("[PREFLIGHT] [%s] NC2.5 prompt enrichment complete", sid)
            except Exception as exc:
                logger.warning("[PREFLIGHT] [%s] NC2.5 enrichment skipped: %s", sid, exc)

        # ── Persist outputs to Supabase Storage ──────────────────────────────
        nc1_markdown = _generate_nc1_markdown(nc1_output)
        nc2_markdown = _generate_nc2_markdown(nc2_output)
        await asyncio.gather(
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "nc1", nc1_output, nc1_markdown)),
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "nc2", nc2_output, nc2_markdown)),
        )

        update_session(session_id, user_id, {
            "agent1_output": nc1_output,
            "agent2_output": nc2_output,
            "status": "ready",  # 'ready' = preflight done, waiting for user confirmation
        })

        elapsed = time.monotonic() - t0
        n_cats = len(nc2_output.get("categories", []))
        n_items = nc2_output.get("total_items", "?")
        logger.info(
            "[PREFLIGHT] [%s] Complete in %.1fs — %s items, %d categories",
            sid, elapsed, n_items, n_cats,
        )
        _pipe(
            f"Pre-flight complete ({elapsed:.0f}s) — {n_items} checklist items, "
            f"{n_cats} categories ready for review",
            "completed",
        )

    except Exception as exc:
        logger.error("[PREFLIGHT] [%s] FAILED at +%s: %s", sid, _elapsed(), exc, exc_info=True)
        event_emitter.emit_sync(session_id, "pipeline", f"Pre-flight error: {exc}", "error")
        try:
            update_session(session_id, user_id, {"status": "pipeline_failed"})
        except Exception:
            pass
    finally:
        await event_emitter.close_session(session_id)


# ── Stage 2: Evaluation ───────────────────────────────────────────────────────

async def run_custom_pipeline(session_id: str, user_id: str) -> None:
    """
    NC3 fan-out (one per checklist category) + NC4 synthesis.
    Triggered after the user confirms / edits the NC1/NC2 context.
    Stores NC3 array in agent3_output, NC4 in agent4_output.
    """
    from agents.NC3.agent import run_nc3_fanout
    from agents.NC4.agent import NC4Agent

    event_emitter.ensure_session(session_id)
    _pipe = event_emitter.make_emitter(session_id, "pipeline")
    _emit_nc3 = event_emitter.make_emitter(session_id, "nc3")
    _emit_nc4 = event_emitter.make_emitter(session_id, "nc4")
    sid = session_id[:8]
    t0 = time.monotonic()

    def _elapsed() -> str:
        return f"{time.monotonic() - t0:.1f}s"

    try:
        update_session(session_id, user_id, {"status": "pipeline_running"})
        _pipe("Custom evaluation pipeline started", "running")
        logger.info("[CUSTOM] [%s] Pipeline started", sid)

        session = get_session(session_id, user_id)
        nc1_output: dict = session.get("agent1_output") or {}
        nc2_output: dict = session.get("agent2_output") or {}
        file_type = session.get("file_type") or "pdf"

        categories = nc2_output.get("categories", [])
        if not categories:
            raise ValueError(
                "NC2 output contains no categories. "
                "Run the pre-flight step first and ensure the checklist was parsed."
            )

        # Apply any user-edited context overrides stored in the session
        # (frontend may have PATCH'd the session after user edited the confirm panel)
        user_overrides = session.get("nc1_user_overrides") or {}
        if user_overrides:
            nc1_output.setdefault("auto_detected", {}).update(user_overrides)
            logger.info("[CUSTOM] [%s] Applied user NC1 overrides: %s", sid, list(user_overrides))

        nc1_context = nc1_output.get("auto_detected", {})

        # ── Download + extract proposal text ──────────────────────────────────
        _pipe("Downloading proposal for evaluation")
        storage_path = session.get("storage_path") or ""
        if not storage_path:
            raise ValueError("No storage_path found in session.")

        file_bytes = await _in_thread(partial(download_file_from_storage, storage_path))
        proposal_text = await _in_thread(partial(extract_proposal_text, file_bytes, file_type))
        logger.info("[CUSTOM] [%s] Proposal text: %d chars", sid, len(proposal_text))

        # ── Cancellation checkpoint ───────────────────────────────────────────
        if _is_cancelled(session_id, user_id):
            logger.info("[CUSTOM] [%s] Cancelled before NC3.", sid)
            return

        # ── NC3 Fan-out ───────────────────────────────────────────────────────
        _pipe(f"Launching NC3 evaluator — {len(categories)} categories in parallel")
        logger.info("[CUSTOM] [%s] NC3 fan-out: %d categories", sid, len(categories))

        def _run_nc3():
            _emit_nc3(
                f"Evaluating {len(categories)} checklist categories in parallel — "
                "this may take a few minutes"
            )
            results = run_nc3_fanout(nc2_output, proposal_text, nc1_context)
            done = sum(1 for r in results if r.get("status") == "complete")
            errors = sum(1 for r in results if r.get("status") == "error")
            _emit_nc3(
                f"NC3 complete — {done}/{len(results)} categories evaluated"
                + (f" ({errors} errors)" if errors else ""),
                "completed",
            )
            return results

        nc3_results = await _in_thread(_run_nc3)

        if _is_cancelled(session_id, user_id):
            logger.info("[CUSTOM] [%s] Cancelled after NC3.", sid)
            return

        _pipe("All category evaluations complete — synthesising results", "completed")
        logger.info("[CUSTOM] [%s] NC3 done in +%s", sid, _elapsed())

        # ── NC4 Synthesis ─────────────────────────────────────────────────────
        _pipe("Launching NC4 — Synthesis & Report")
        logger.info("[CUSTOM] [%s] NC4 starting", sid)

        def _run_nc4():
            _emit_nc4(
                "NC4 — computing weighted scores, priority actions, verdict and executive summary"
            )
            agent = NC4Agent()
            result = agent.run(
                nc3_results=nc3_results,
                nc2_output=nc2_output,
                nc1_output=nc1_output,
            )
            _emit_nc4(
                f"NC4 complete — verdict: {result.get('verdict', '?')}  "
                f"score: {result.get('overall_score', 0):.1f}/10",
                "completed",
            )
            return result

        nc4_output = await _in_thread(_run_nc4)

        verdict = nc4_output.get("verdict", "n/a")
        score = nc4_output.get("overall_score", 0)
        logger.info("[CUSTOM] [%s] NC4 done — score=%.2f verdict=%s", sid, score, verdict)

        # ── Generate markdown reports ─────────────────────────────────────────
        nc4_markdown = _generate_nc4_markdown(nc4_output, nc2_output, nc3_results)
        nc3_markdown = _generate_nc3_markdown(nc3_results)

        # ── Persist all outputs to Supabase Storage ───────────────────────────
        await asyncio.gather(
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "nc3", nc3_results, nc3_markdown)),
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "nc4", nc4_output, nc4_markdown)),
        )

        report_path = f"uploads/{user_id}/{session_id}/nc4/output.md"
        update_session(session_id, user_id, {
            "agent3_output": nc3_results,
            "agent4_output": nc4_output,
            "report_storage_path": report_path,
            "status": "complete",
        })

        total = time.monotonic() - t0
        logger.info("[CUSTOM] [%s] COMPLETE ✓  total=%.1fs verdict=%s score=%.2f", sid, total, verdict, score)
        _pipe(f"Custom checklist review complete — verdict: {verdict}", "completed")

    except Exception as exc:
        logger.error("[CUSTOM] [%s] FAILED at +%s: %s", sid, _elapsed(), exc, exc_info=True)
        event_emitter.emit_sync(session_id, "pipeline", f"Pipeline error: {exc}", "error")
        try:
            update_session(session_id, user_id, {"status": "pipeline_failed"})
        except Exception:
            pass
    finally:
        await event_emitter.close_session(session_id)


# ── Markdown report generators ────────────────────────────────────────────────

def _generate_nc1_markdown(nc1: dict) -> str:
    if not nc1:
        return ""
    ad = nc1.get("auto_detected", {})
    sm = nc1.get("structure_map", {})
    qs = nc1.get("quality_scan", {})
    lines = ["# NC1 — Document Intelligence Report\n"]
    lines.append(f"**Confidence:** {round((nc1.get('confidence', 0)) * 100)}%\n")
    lines.append("## Auto-Detected Context")
    for k, v in ad.items():
        if v:
            lines.append(f"- **{k.replace('_', ' ').title()}:** {v}")
    lines.append("\n## Structure Map")
    lines.append(f"- Sections detected: {len(sm.get('sections', []))}")
    for s in sm.get("sections", []):
        lines.append(f"  - {s}")
    lines.append("\n## Quality Scan")
    lines.append(f"- Completeness score: {round(qs.get('completeness_score', 0) * 100)}%")
    missing = qs.get("missing_sections", [])
    if missing:
        lines.append(f"- Missing sections: {', '.join(missing)}")
    return "\n".join(lines)


def _generate_nc2_markdown(nc2: dict) -> str:
    if not nc2:
        return ""
    lines = ["# NC2 — Checklist Intelligence Report\n"]
    lines.append(f"**Format:** {nc2.get('format', '?')}  |  **Total items:** {nc2.get('total_items', 0)}  |  **Scoring:** {nc2.get('scoring_type', '?')}")
    lines.append(f"**Weights source:** {nc2.get('weights_source', '?')}\n")
    lines.append("## Categories")
    for cat in nc2.get("categories", []):
        lines.append(f"\n### {cat.get('name', '?')} ({cat.get('item_count', 0)} items, weight: {cat.get('weight', 0):.0%})")
        for item in cat.get("items", [])[:5]:
            lines.append(f"  - [{item.get('id', '?')}] {item.get('text', '')[:100]}")
        if len(cat.get("items", [])) > 5:
            lines.append(f"  - ...and {len(cat['items']) - 5} more items")
    warnings = nc2.get("parse_warnings", [])
    if warnings:
        lines.append("\n## Parse Warnings")
        for w in warnings:
            lines.append(f"- {w}")
    return "\n".join(lines)


def _generate_nc3_markdown(nc3_results: list) -> str:
    if not nc3_results:
        return ""
    lines = ["# NC3 — Proposal Evaluation Report\n"]
    for cat in nc3_results:
        name = cat.get("category_name", "?")
        score = cat.get("score", 0)
        mxs = cat.get("max_score", 0)
        pct = round((score / mxs) * 100) if mxs > 0 else 0
        status = cat.get("status", "?")
        lines.append(f"\n## {name}  ({score:.1f}/{mxs:.1f} — {pct}%)")
        lines.append(f"Status: {status}  |  Passed: {cat.get('items_passed', 0)}  Partial: {cat.get('items_partial', 0)}  Failed: {cat.get('items_failed', 0)}")
        findings = cat.get("findings", [])
        fails = [f for f in findings if f.get("status") == "FAIL"]
        passes = [f for f in findings if f.get("status") == "PASS"]
        if fails:
            lines.append("\n### Gaps")
            for f in fails[:5]:
                lines.append(f"- **{f.get('item_id', '?')}**: {f.get('gap', 'No evidence found')}")
        if passes:
            lines.append("\n### Strengths (sample)")
            for f in passes[:3]:
                ev = f.get("evidence", "")
                if ev:
                    lines.append(f"- **{f.get('item_id', '?')}**: {ev[:120]}")
        if cat.get("error_message"):
            lines.append(f"\n**Error:** {cat['error_message']}")
    return "\n".join(lines)


def _generate_nc4_markdown(nc4: dict, nc2: dict, nc3_results: list) -> str:
    if not nc4:
        return ""
    lines = ["# NC4 — Synthesis & Report\n"]
    verdict = nc4.get("verdict", "?")
    score = nc4.get("overall_score", 0)
    verdict_emoji = "✅" if verdict == "READY TO SEND" else "❌" if verdict == "DO NOT SEND" else "🔄"
    lines.append(f"## {verdict_emoji} Verdict: {verdict}")
    lines.append(f"**Overall Score:** {score:.1f} / 10")
    cov = nc4.get("checklist_coverage", {})
    lines.append(f"**Pass Rate:** {round(cov.get('pass_rate', 0) * 100)}% ({cov.get('passed', 0)}/{cov.get('total_items', 0)} items)\n")

    summary = nc4.get("plain_english_summary", "")
    if summary:
        lines.append("## Executive Summary\n")
        lines.append(summary)

    strengths = nc4.get("top_3_strengths", [])
    if strengths:
        lines.append("\n## Top Strengths\n")
        for s in strengths:
            text = s.get("highlight") or s.get("description") or s.get("category_name") or str(s)
            lines.append(f"- {text}")

    pa = nc4.get("priority_actions", {})
    for tier, heading in [("must_fix", "🔴 Must Fix"), ("should_fix", "🟡 Should Fix"), ("next_time", "🔵 Next Time")]:
        items = pa.get(tier, [])
        if items:
            lines.append(f"\n## {heading}\n")
            for item in items:
                action = item.get("gap_description") or item.get("action") or ""
                fix    = item.get("suggested_fix") or item.get("why") or ""
                cat    = item.get("category_name", "")
                lines.append(f"- [{cat}] **{action}**")
                if fix:
                    lines.append(f"  *Suggested fix: {fix}*")

    cat_scores = nc4.get("category_scores", {})
    if cat_scores:
        lines.append("\n## Category Scores\n")
        lines.append("| Category | Score |")
        lines.append("|----------|-------|")
        for name, s in sorted(cat_scores.items(), key=lambda x: -x[1]):
            lines.append(f"| {name} | {s:.1f} / 10 |")

    sc = nc4.get("section_scorecard", {})
    if sc:
        lines.append("\n## Standard Dimension Scores (NC4.7)\n")
        lines.append("| Dimension | Score |")
        lines.append("|-----------|-------|")
        for k, v in sc.items():
            lines.append(f"| {k.replace('_', ' ').title()} | {v:.1f} / 10 |")

    warnings = nc4.get("consistency_warnings", [])
    if warnings:
        lines.append("\n## Consistency Warnings\n")
        for w in warnings:
            desc = w.get("description", str(w))
            lines.append(f"- {desc}")

    return "\n".join(lines)
