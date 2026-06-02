"""
Full 4-agent pipeline orchestration.

Flow:
  1. Set status → pipeline_running  (immediately — UI responds at once)
  2. Download PDF from Supabase Storage
  3. If document > CHUNK_THRESHOLD pages: set status → chunking, run chunking pipeline
  4. Run Agents 1, 2, 3 in parallel (set status → analyzing_proposal)
  5. Save each output (JSON + Markdown) to Supabase Storage
  6. Update DB with all three outputs → status: agents_complete
  7. Run Agent 4 (sequential, depends on 1/2/3)
  8. Save Agent 4 output to Storage, set report_storage_path
  9. Update DB → status: complete
"""

import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from functools import partial

from agents.agent1 import run as _run_agent1
from agents.agent2 import run as _run_agent2
from agents.agent3 import run as _run_agent3
from agents.agent4 import run as _run_agent4
from agents.agent1.markdown_formatter import format_to_markdown as _a1_md
from agents.agent2.markdown_formatter import format_to_markdown as _a2_md
from agents.agent3.markdown_formatter import format_to_markdown as _a3_md
from agents.agent4.markdown_formatter import format_to_markdown as _a4_md
from storage import download_file_from_storage, save_agent_output_to_storage
from services.session_service import get_session, update_session
from services.chunking_service import prepare_document_context
from services.file_service import count_file_pages
from services.token_service import save_token_usage
from services import event_emitter

logger = logging.getLogger(__name__)

# Shared thread pool — 6 workers: 3 for parallel agents + spare capacity
_executor = ThreadPoolExecutor(max_workers=6)


def _is_cancelled(session_id: str, user_id: str) -> bool:
    """Re-fetches the session and returns True if the user requested cancellation."""
    try:
        s = get_session(session_id, user_id)
        return s.get("status") == "cancelled"
    except Exception:
        return False


async def _in_thread(fn):
    """Run a zero-argument callable in the shared thread pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, fn)


async def run_full_pipeline(session_id: str, user_id: str) -> None:
    """
    Orchestrates the complete pipeline as a FastAPI background task.
    All exceptions are caught and written to session status so the
    frontend polling can surface them cleanly.
    """
    pipeline_start = time.monotonic()

    def _elapsed() -> str:
        return f"{time.monotonic() - pipeline_start:.1f}s"

    sid = session_id[:8]  # short ID for cleaner log lines

    # ── Register event feed (must happen before agents start) ─────────────────
    event_emitter.ensure_session(session_id)
    _pipe = event_emitter.make_emitter(session_id, "pipeline")

    try:
        # ── Step 0: Mark pipeline started immediately ─────────────────────────
        update_session(session_id, user_id, {"status": "pipeline_running"})
        _pipe("Pipeline started", "completed")

        session = get_session(session_id, user_id)
        filename = session.get("original_filename", "unknown")
        file_type = session.get("file_type") or "pdf"
        client_industry = session.get("client_industry") or []
        proposal_type = session.get("proposal_type") or ""
        client_priorities = session.get("client_priorities") or []

        logger.info("━" * 60)
        logger.info("[PIPELINE] [%s] STARTED  — '%s'", sid, filename)
        logger.info("[PIPELINE] [%s] File type: %s | Industry: %s | Proposal type: %s",
                    sid, file_type.upper(), ", ".join(client_industry) or "n/a", proposal_type or "n/a")
        logger.info("━" * 60)

        # ── Download ──────────────────────────────────────────────────────────
        logger.info("[PIPELINE] [%s] [+%.1fs] Downloading file from storage...",
                    sid, time.monotonic() - pipeline_start)
        _pipe("Downloading proposal from storage")
        file_bytes = download_file_from_storage(session["storage_path"])
        if not file_bytes:
            raise ValueError("Downloaded proposal file is empty.")
        size_kb = len(file_bytes) / 1024
        logger.info("[PIPELINE] [%s] [+%s] File downloaded — %.1f KB",
                    sid, _elapsed(), size_kb)
        _pipe(f"File downloaded ({size_kb:.0f} KB)", "completed")

        # ── Chunking decision gate ────────────────────────────────────────────
        page_count = session.get("page_count") or count_file_pages(file_bytes, file_type)
        logger.info("[PIPELINE] [%s] [+%s] Page count: %d", sid, _elapsed(), page_count)

        # Chunking emitter is defined in chunking_service; we pass it through
        chunking_emit = event_emitter.make_emitter(session_id, "chunking")

        pre_processed_context = await _in_thread(partial(
            prepare_document_context,
            file_bytes,
            file_type,
            page_count,
            client_industry,
            proposal_type,
            client_priorities,
            sid,
            chunking_emit,
        ))

        if pre_processed_context:
            context_kb = len(pre_processed_context) / 1024
            logger.info("[PIPELINE] [%s] [+%s] Chunked context ready — %.1f KB → agents will use this instead of raw file",
                        sid, _elapsed(), context_kb)
        else:
            logger.info("[PIPELINE] [%s] [+%s] Document within threshold — passing raw file to agents",
                        sid, _elapsed())

        # ── Step 1: Agents 1, 2, 3 in parallel ───────────────────────────────
        logger.info("─" * 60)
        logger.info("[PIPELINE] [%s] [+%s] Launching Agent 1 (Completeness), Agent 2 (Estimation), Agent 3 (Competitive) in parallel...",
                    sid, _elapsed())
        _pipe("Launching parallel specialist review", "completed")
        agents_start = time.monotonic()

        _raw_results = await asyncio.gather(
            _in_thread(partial(
                _run_agent1,
                pdf_bytes=file_bytes,
                file_type=file_type,
                client_industry=client_industry,
                proposal_type=proposal_type,
                client_priorities=client_priorities,
                pre_processed_context=pre_processed_context,
                emit=event_emitter.make_emitter(session_id, "agent1"),
            )),
            _in_thread(partial(
                _run_agent2,
                pdf_bytes=file_bytes,
                file_type=file_type,
                client_industry=client_industry,
                proposal_type=proposal_type,
                client_priorities=client_priorities,
                pre_processed_context=pre_processed_context,
                emit=event_emitter.make_emitter(session_id, "agent2"),
            )),
            _in_thread(partial(
                _run_agent3,
                pdf_bytes=file_bytes,
                file_type=file_type,
                client_industry=client_industry,
                proposal_type=proposal_type,
                client_priorities=client_priorities,
                pre_processed_context=pre_processed_context,
                emit=event_emitter.make_emitter(session_id, "agent3"),
            )),
            return_exceptions=True,
        )

        # Agents now return (result_dict, token_usage) tuples; unpack safely
        r1_raw, r2_raw, r3_raw = _raw_results
        r1 = r1_raw[0] if isinstance(r1_raw, tuple) else r1_raw
        tu1 = r1_raw[1] if isinstance(r1_raw, tuple) else None
        r2 = r2_raw[0] if isinstance(r2_raw, tuple) else r2_raw
        tu2 = r2_raw[1] if isinstance(r2_raw, tuple) else None
        r3 = r3_raw[0] if isinstance(r3_raw, tuple) else r3_raw
        tu3 = r3_raw[1] if isinstance(r3_raw, tuple) else None

        agents_elapsed = time.monotonic() - agents_start

        # Surface any per-agent failures
        errors = []
        if isinstance(r1, BaseException):
            errors.append(f"Agent 1: {r1}")
            logger.error("[PIPELINE] [%s] Agent 1 (Completeness) FAILED: %s", sid, r1, exc_info=r1)
            event_emitter.emit_sync(session_id, "agent1", f"Analysis failed: {r1}", "error")
        else:
            score = r1.get("scores", {}).get("overall", "n/a") if isinstance(r1, dict) else "n/a"
            logger.info("[PIPELINE] [%s] [+%s] Agent 1 (Completeness & Clarity) — DONE  (overall score: %s)",
                        sid, _elapsed(), score)
            # agent1 already emits its own completion message — no duplicate needed here

        if isinstance(r2, BaseException):
            errors.append(f"Agent 2: {r2}")
            logger.error("[PIPELINE] [%s] Agent 2 (Estimation) FAILED: %s", sid, r2, exc_info=r2)
            event_emitter.emit_sync(session_id, "agent2", f"Analysis failed: {r2}", "error")
        else:
            score = r2.get("scores", {}).get("overall", "n/a") if isinstance(r2, dict) else "n/a"
            logger.info("[PIPELINE] [%s] [+%s] Agent 2 (Estimation & Commercial) — DONE  (overall score: %s)",
                        sid, _elapsed(), score)
            # agent2 already emits its own completion message — no duplicate needed here

        if isinstance(r3, BaseException):
            errors.append(f"Agent 3: {r3}")
            logger.error("[PIPELINE] [%s] Agent 3 (Competitive) FAILED: %s", sid, r3, exc_info=r3)
            event_emitter.emit_sync(session_id, "agent3", f"Analysis failed: {r3}", "error")
        else:
            score = r3.get("scores", {}).get("overall", "n/a") if isinstance(r3, dict) else "n/a"
            logger.info("[PIPELINE] [%s] [+%s] Agent 3 (Competitive Strength) — DONE  (overall score: %s)",
                        sid, _elapsed(), score)
            # agent3 already emits its own completion message — no duplicate needed here

        logger.info("[PIPELINE] [%s] Agents 1/2/3 wall-clock time: %.1fs", sid, agents_elapsed)

        if errors:
            logger.error("[PIPELINE] [%s] Pipeline stopping — %d agent(s) failed.", sid, len(errors))
            _pipe(f"Pipeline failed: {'; '.join(errors)}", "error")
            update_session(session_id, user_id, {"status": "pipeline_failed"})
            return

        # ── Cancellation checkpoint 1 ─────────────────────────────────────────
        if _is_cancelled(session_id, user_id):
            logger.info("[PIPELINE] [%s] Cancelled by user after specialist agents.", sid)
            return

        # ── Step 2: Save agent 1/2/3 outputs ─────────────────────────────────
        logger.info("[PIPELINE] [%s] [+%s] Saving Agent 1/2/3 outputs to storage...", sid, _elapsed())
        _pipe("Saving specialist outputs to storage")
        await asyncio.gather(
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "agent1", r1, _a1_md(r1))),
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "agent2", r2, _a2_md(r2))),
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "agent3", r3, _a3_md(r3))),
        )

        # ── Step 3: Persist to DB ─────────────────────────────────────────────
        update_session(session_id, user_id, {
            "agent1_output": r1,
            "agent2_output": r2,
            "agent3_output": r3,
            "status": "agents_complete",
        })
        logger.info("[PIPELINE] [%s] [+%s] Outputs saved — status: agents_complete", sid, _elapsed())

        # ── Save token usage for agents 1/2/3 ────────────────────────────────
        for _agent_name, _tu in [("agent1", tu1), ("agent2", tu2), ("agent3", tu3)]:
            if _tu:
                save_token_usage(session_id, _agent_name, _tu["input_tokens"], _tu["output_tokens"])

        _pipe("All specialist reviews complete", "completed")

        # ── Cancellation checkpoint 2 ─────────────────────────────────────────
        if _is_cancelled(session_id, user_id):
            logger.info("[PIPELINE] [%s] Cancelled by user before Agent 4.", sid)
            return

        # ── Step 4: Agent 4 ───────────────────────────────────────────────────
        logger.info("─" * 60)
        logger.info("[PIPELINE] [%s] [+%s] Launching Agent 4 (Chief Proposal Review Officer / Aggregator)...",
                    sid, _elapsed())
        a4_start = time.monotonic()

        r4_raw = await _in_thread(partial(
            _run_agent4,
            agent1_output=r1,
            agent2_output=r2,
            agent3_output=r3,
            client_industry=client_industry,
            proposal_type=proposal_type,
            client_priorities=client_priorities,
            emit=event_emitter.make_emitter(session_id, "agent4"),
        ))

        # Unpack agent 4 tuple
        r4 = r4_raw[0] if isinstance(r4_raw, tuple) else r4_raw
        tu4 = r4_raw[1] if isinstance(r4_raw, tuple) else None

        verdict = r4.get("verdict", "n/a") if isinstance(r4, dict) else "n/a"
        score = r4.get("weighted_overall_score", "n/a") if isinstance(r4, dict) else "n/a"
        logger.info("[PIPELINE] [%s] [+%s] Agent 4 DONE (%.1fs) — final score: %s | verdict: %s",
                    sid, _elapsed(),
                    time.monotonic() - a4_start, score, verdict)

        # ── Save token usage for agent 4 ──────────────────────────────────────
        if tu4:
            save_token_usage(session_id, "agent4", tu4["input_tokens"], tu4["output_tokens"])

        # ── Step 5: Save Agent 4 output ───────────────────────────────────────
        _pipe("Saving final report to storage")
        await _in_thread(partial(
            save_agent_output_to_storage, user_id, session_id, "agent4", r4, _a4_md(r4)
        ))

        # ── Step 6: Mark complete ─────────────────────────────────────────────
        report_path = f"uploads/{user_id}/{session_id}/agent4/output.md"
        update_session(session_id, user_id, {
            "agent4_output": r4,
            "report_storage_path": report_path,
            "status": "complete",
        })

        total = time.monotonic() - pipeline_start
        logger.info("━" * 60)
        logger.info("[PIPELINE] [%s] COMPLETE ✓  total time: %.1fs", sid, total)
        logger.info("━" * 60)
        _pipe(f"Analysis complete — verdict: {verdict}", "completed")

    except Exception as exc:
        logger.error("[PIPELINE] [%s] FAILED at +%s: %s", sid, _elapsed(), exc, exc_info=True)
        event_emitter.emit_sync(session_id, "pipeline", f"Pipeline error: {exc}", "error")
        try:
            update_session(session_id, user_id, {"status": "pipeline_failed"})
        except Exception:
            pass
    finally:
        await event_emitter.close_session(session_id)
