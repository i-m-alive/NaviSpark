"""
NC4 Agent — Synthesis & Report
Custom Checklist Review Pipeline

Runs last, sequentially, after all NC3 instances complete (Stage 3).
Aggregates per-category findings into one final scored report with verdict.

Inputs:
    nc3_results       : list[dict]       — full list from run_nc3_fanout()
    nc2_output        : dict             — full NC2 output (categories, weights, scoring_type)
    nc1_output        : dict             — full NC1 output (auto_detected, structure_map, confidence)
    specialist_results: dict | None      — outputs from NCR1/2/3 specialist reviewers.
                        Keys: "ncr1" (clarity_completeness), "ncr2" (commercial_strength),
                        "ncr3" (competitive_position). Each value is an NCR wrapper dict
                        with: status, dimension, score, result, error_message.

Output schema:
{
    "overall_score":   float,    # 0.0–10.0  (based on NC3 checklist only)
    "max_score":       10.0,
    "verdict":         str,      # "READY TO SEND" | "NEEDS MAJOR REVISION" | "DO NOT SEND"
    "verdict_code":    str,      # "READY" | "REVISION" | "DO_NOT_SEND"
    "category_scores": dict,     # {category_name: normalised_score_0_to_10}
    "priority_actions": {
        "must_fix":   list[dict],
        "should_fix": list[dict],
        "next_time":  list[dict],
        "total_actions": int
    },
    "top_3_strengths":       list[dict],
    "plain_english_summary": str,
    "checklist_coverage": {
        "total_items":   int,
        "passed":        int,
        "partial":       int,
        "failed":        int,
        "error_items":   int,
        "pass_rate":     float,
    },
    "consistency_warnings":  list[dict],
    "error_categories":      list[str],
    "scoring_breakdown":     list[dict],
    "verdict_meta": {
        "triggering_rule":            str,
        "must_fix_count":             int,
        "score_band":                 str,
        "critical_category_failures": list[str],
    },
    "nc1_confidence":        float,
    "nc2_checklist_id":      str,
    "nc2_scoring_type":      str,
    "nc2_weights_source":    str,

    # Specialist reviewer additions (present when specialist_results provided)
    "specialist_available":          bool,
    "specialist_scores": {
        "clarity_completeness":  float | None,
        "commercial_strength":   float | None,
        "competitive_position":  float | None,
    },
    "specialist_priority_actions": {
        "must_fix":      list[dict],
        "should_fix":    list[dict],
        "next_time":     list[dict],
        "total_actions": int,
    },
}
"""

from __future__ import annotations

import logging
from typing import Any

from .skills import (
    CrossChecklistConsistencyCheck,
    DimensionMapper,
    ExecutiveSummaryGenerator,
    PriorityActionGenerator,
    StrengthsIdentifier,
    VerdictEngine,
    WeightedScoreAggregator,
)

logger = logging.getLogger(__name__)


class NC4Agent:
    """Synthesis & Report Agent.

    Accepts the complete outputs of NC1, NC2, and NC3. Runs all six NC4 skills
    in the correct sequence and assembles the full NC4 output schema.

    Skill execution order: NC4.1 → NC4.2 → NC4.3 → NC4.4 → NC4.6 → coverage → NC4.5

    Usage:
        agent  = NC4Agent()
        result = agent.run(
            nc3_results=nc3_results,
            nc2_output=nc2_output,
            nc1_output=nc1_output,
        )
    """

    def __init__(self) -> None:
        self.score_aggregator = WeightedScoreAggregator()
        self.consistency_check = CrossChecklistConsistencyCheck()
        self.action_generator = PriorityActionGenerator()
        self.strengths_finder = StrengthsIdentifier()
        self.summary_generator = ExecutiveSummaryGenerator()
        self.verdict_engine = VerdictEngine()
        self.dimension_mapper = DimensionMapper()

    def run(
        self,
        nc3_results: list[dict[str, Any]],
        nc2_output: dict[str, Any],
        nc1_output: dict[str, Any],
        specialist_results: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute the full NC4 Synthesis & Report pipeline.

        Args:
            nc3_results: List of per-category results from run_nc3_fanout(). Each
                dict has: category_id, category_name, status, score, max_score,
                items_evaluated, items_passed, items_partial, items_failed,
                findings, error_message.
            nc2_output: Full NC2 Checklist Intelligence output dict.
            nc1_output: Full NC1 Document Intelligence output dict.
            specialist_results: Optional dict from NCR1/2/3 specialist reviewers.
                Keys: "ncr1", "ncr2", "ncr3". Each value is an NCR wrapper dict
                with status, dimension, score, result, error_message.
                When None, specialist_available=False in output.

        Returns:
            NC4 output dict matching the documented output schema.

        Raises:
            ValueError: If nc3_results is empty.
            RuntimeError: If any skill raises an unhandled exception.
        """
        if not nc3_results:
            raise ValueError(
                "nc3_results is empty — NC4 requires at least one NC3 result."
            )

        logger.info(
            "NC4Agent.run() started. nc3_results=%d, nc2_categories=%d",
            len(nc3_results),
            len(nc2_output.get("categories", [])),
        )

        # --- Skill NC4.1: Weighted Score Aggregator ---
        try:
            aggregation = self.score_aggregator.run(nc3_results, nc2_output)
            overall_score: float = aggregation["overall_score"]
            category_scores: dict[str, float] = aggregation["category_scores"]
            error_categories: list[str] = aggregation["error_categories"]
            scoring_breakdown: list[dict] = aggregation["scoring_breakdown"]
            logger.info("NC4.1 complete. overall_score=%.2f", overall_score)
        except Exception as exc:
            logger.error("NC4.1 WeightedScoreAggregator failed: %s", exc)
            raise RuntimeError(f"NC4.1 failed: {exc}") from exc

        # --- Skill NC4.2: Cross-Checklist Consistency Check ---
        try:
            consistency = self.consistency_check.run(nc3_results, nc1_output)
            logger.info("NC4.2 complete. warnings=%d", consistency["warnings_count"])
        except Exception as exc:
            logger.error("NC4.2 CrossChecklistConsistencyCheck failed: %s", exc)
            raise RuntimeError(f"NC4.2 failed: {exc}") from exc

        # --- Skill NC4.3: Priority Action Generator ---
        try:
            priority_actions = self.action_generator.run(nc3_results, nc2_output)
            logger.info(
                "NC4.3 complete. must_fix=%d, should_fix=%d, next_time=%d",
                len(priority_actions["must_fix"]),
                len(priority_actions["should_fix"]),
                len(priority_actions["next_time"]),
            )
        except Exception as exc:
            logger.error("NC4.3 PriorityActionGenerator failed: %s", exc)
            raise RuntimeError(f"NC4.3 failed: {exc}") from exc

        # --- Skill NC4.4: Strengths Identifier ---
        try:
            top_3_strengths = self.strengths_finder.run(nc3_results, category_scores)
            logger.info("NC4.4 complete. strengths=%d", len(top_3_strengths))
        except Exception as exc:
            logger.error("NC4.4 StrengthsIdentifier failed: %s", exc)
            raise RuntimeError(f"NC4.4 failed: {exc}") from exc

        # --- Skill NC4.6: Verdict Engine (must run BEFORE NC4.5) ---
        try:
            verdict_result = self.verdict_engine.run(
                overall_score,
                priority_actions,
                category_scores,
                nc2_output,
            )
            verdict: str = verdict_result["verdict"]
            verdict_code: str = verdict_result["verdict_code"]
            logger.info(
                "NC4.6 complete. verdict='%s', rule='%s'",
                verdict, verdict_result["triggering_rule"],
            )
        except Exception as exc:
            logger.error("NC4.6 VerdictEngine failed: %s", exc)
            raise RuntimeError(f"NC4.6 failed: {exc}") from exc

        # --- Compute checklist coverage ---
        checklist_coverage = self._compute_coverage(nc3_results, nc2_output)

        # --- Skill NC4.7: Dimension Mapper (maps custom → 15 standard dimensions) ---
        try:
            section_scorecard = self.dimension_mapper.run(nc3_results, overall_score)
            logger.info("NC4.7 complete. dimensions=%d", len(section_scorecard))
        except Exception as exc:
            logger.error("NC4.7 DimensionMapper failed (non-fatal): %s", exc)
            section_scorecard = {}  # Non-fatal — ScoreRadar will fallback gracefully

        # --- Skill NC4.5: Executive Summary Generator ---
        try:
            plain_english_summary = self.summary_generator.run(
                overall_score=overall_score,
                verdict=verdict,
                priority_actions=priority_actions,
                top_3_strengths=top_3_strengths,
                category_scores=category_scores,
                nc1_output=nc1_output,
                checklist_coverage=checklist_coverage,
            )
            logger.info("NC4.5 complete. summary_length=%d", len(plain_english_summary))
        except Exception as exc:
            logger.error("NC4.5 ExecutiveSummaryGenerator failed: %s", exc)
            raise RuntimeError(f"NC4.5 failed: {exc}") from exc

        # --- Process specialist results (NCR1/2/3) ---
        specialist_data = self._process_specialist_results(specialist_results)

        # --- Detect double-flagged issues (NC3 category FAIL + NCR specialist confirmation) ---
        double_flagged = _find_double_flagged(nc3_results, specialist_results)
        logger.info("NC4 double_flagged: %d issues detected", len(double_flagged))

        output: dict[str, Any] = {
            "overall_score": overall_score,
            "max_score": 10.0,
            "verdict": verdict,
            "verdict_code": verdict_code,
            "category_scores": category_scores,
            "section_scorecard": section_scorecard,   # NC4.7: 15 standard dimensions
            "priority_actions": priority_actions,
            "top_3_strengths": top_3_strengths,
            "plain_english_summary": plain_english_summary,
            "checklist_coverage": checklist_coverage,
            "consistency_warnings": consistency["consistency_warnings"],
            "error_categories": error_categories,
            "scoring_breakdown": scoring_breakdown,
            "verdict_meta": {
                "triggering_rule": verdict_result["triggering_rule"],
                "must_fix_count": verdict_result["must_fix_count"],
                "score_band": verdict_result["score_band"],
                "critical_category_failures": verdict_result["critical_category_failures"],
            },
            "nc1_confidence": nc1_output.get("confidence"),
            "nc2_checklist_id": nc2_output.get("checklist_id", "unknown"),
            "nc2_scoring_type": nc2_output.get("scoring_type", "unknown"),
            "nc2_weights_source": nc2_output.get("weights_source", "unknown"),
            # Specialist reviewer results
            "specialist_available":          specialist_data["specialist_available"],
            "specialist_scores":             specialist_data["specialist_scores"],
            "specialist_priority_actions":   specialist_data["specialist_priority_actions"],
            # Full NCR1/2/3 outputs — consumed by CustomInDepthView NCR panels
            "specialist_results":            specialist_results or {},
            # Cross-agent double-flagged issues (NC3 + NCR independently confirm same gap)
            "double_flagged_issues":         double_flagged,
        }

        logger.info(
            "NC4Agent.run() complete. verdict='%s' overall_score=%.2f "
            "must_fix=%d should_fix=%d next_time=%d warnings=%d",
            verdict,
            overall_score,
            len(priority_actions["must_fix"]),
            len(priority_actions["should_fix"]),
            len(priority_actions["next_time"]),
            consistency["warnings_count"],
        )

        return output

    def _process_specialist_results(
        self,
        specialist_results: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Extract specialist dimension scores and priority actions from NCR1/2/3 outputs.

        Args:
            specialist_results: Dict keyed by "ncr1"/"ncr2"/"ncr3", each an NCR wrapper
                dict with: status, dimension, score, result, error_message.

        Returns:
            Dict with specialist_available, specialist_scores, specialist_priority_actions.
        """
        empty = {
            "specialist_available": False,
            "specialist_scores": {
                "clarity_completeness": None,
                "commercial_strength":  None,
                "competitive_position": None,
            },
            "specialist_priority_actions": {
                "must_fix":      [],
                "should_fix":    [],
                "next_time":     [],
                "total_actions": 0,
            },
        }

        if not specialist_results:
            return empty

        specialist_scores: dict[str, Any] = {
            "clarity_completeness": None,
            "commercial_strength":  None,
            "competitive_position": None,
        }
        all_actions: dict[str, list] = {"must_fix": [], "should_fix": [], "next_time": []}

        for key, sr in specialist_results.items():
            if not sr or sr.get("status") != "complete" or not sr.get("result"):
                logger.warning("NC4: specialist '%s' unavailable — status=%s", key, sr.get("status") if sr else "None")
                continue

            dim    = sr.get("dimension", "")
            result = sr["result"]
            score  = float(result.get("scores", {}).get("overall", 0.0))

            if dim in specialist_scores:
                specialist_scores[dim] = score

            if dim == "clarity_completeness":
                _extract_clarity_actions(result, all_actions)
            elif dim == "commercial_strength":
                _extract_commercial_actions(result, all_actions)
            elif dim == "competitive_position":
                _extract_competitive_actions(result, all_actions)

        all_actions_with_total: dict[str, Any] = dict(all_actions)
        all_actions_with_total["total_actions"] = (
            len(all_actions["must_fix"])
            + len(all_actions["should_fix"])
            + len(all_actions["next_time"])
        )

        any_complete = any(v is not None for v in specialist_scores.values())

        logger.info(
            "NC4 specialist processing complete. available=%s scores=%s must_fix=%d should_fix=%d next_time=%d",
            any_complete,
            {k: f"{v:.1f}" if v is not None else "n/a" for k, v in specialist_scores.items()},
            len(all_actions["must_fix"]),
            len(all_actions["should_fix"]),
            len(all_actions["next_time"]),
        )

        return {
            "specialist_available":          any_complete,
            "specialist_scores":             specialist_scores,
            "specialist_priority_actions":   all_actions_with_total,
        }

    def _compute_coverage(
        self,
        nc3_results: list[dict[str, Any]],
        nc2_output: dict[str, Any],
    ) -> dict[str, Any]:
        """Compute checklist coverage statistics across all NC3 results.

        Args:
            nc3_results: Full NC3 results list.
            nc2_output: NC2 output (for total_items baseline).

        Returns:
            Coverage dict with total_items, passed, partial, failed,
            error_items, pass_rate.
        """
        total_from_nc2 = nc2_output.get("total_items", 0)
        passed = 0
        partial = 0
        failed = 0

        for result in nc3_results:
            if result.get("status") != "complete":
                continue
            passed += result.get("items_passed", 0)
            partial += result.get("items_partial", 0)
            failed += result.get("items_failed", 0)

        items_evaluated = passed + partial + failed
        error_items = max(0, total_from_nc2 - items_evaluated)
        pass_rate = round(passed / items_evaluated, 4) if items_evaluated > 0 else 0.0

        return {
            "total_items": total_from_nc2,
            "passed": passed,
            "partial": partial,
            "failed": failed,
            "error_items": error_items,
            "pass_rate": pass_rate,
        }


# ── Specialist action extractors (module-level helpers) ───────────────────────

def _severity_tier(severity: str) -> str:
    """Map CRITICAL/MAJOR/MINOR to must_fix/should_fix/next_time."""
    if severity == "CRITICAL":
        return "must_fix"
    if severity == "MAJOR":
        return "should_fix"
    return "next_time"


def _extract_clarity_actions(result: dict, actions: dict) -> None:
    """Extract priority actions from NCR1 (Clarity & Completeness) output."""
    # Missing mandatory sections → must_fix
    for item in result.get("section_audit", []):
        if item.get("mandatory") and item.get("status") == "MISSING":
            actions["must_fix"].append({
                "dimension":     "Clarity & Completeness",
                "source":        "ncr1",
                "type":          "missing_section",
                "action":        f"Missing required section: {item.get('section', '')}",
                "location":      item.get("section", ""),
                "suggested_fix": item.get("note", "Add this section to the proposal."),
            })

    # Writing quality issues
    for issue in result.get("writing_issues", []):
        tier = _severity_tier(issue.get("severity", "MINOR"))
        actions[tier].append({
            "dimension":     "Clarity & Completeness",
            "source":        "ncr1",
            "type":          issue.get("type", "writing_quality"),
            "action":        issue.get("why", ""),
            "location":      issue.get("location", ""),
            "suggested_fix": f"Rewrite: \"{issue.get('quote', '')[:100]}\"",
        })

    # Scope clarity issues
    for issue in result.get("scope_clarity_issues", []):
        tier = _severity_tier(issue.get("severity", "MINOR"))
        actions[tier].append({
            "dimension":     "Clarity & Completeness",
            "source":        "ncr1",
            "type":          "scope_clarity",
            "action":        issue.get("issue", ""),
            "location":      issue.get("location", ""),
            "suggested_fix": issue.get("recommendation", ""),
        })


def _extract_commercial_actions(result: dict, actions: dict) -> None:
    """Extract priority actions from NCR2 (Commercial Strength) output."""
    for issue in result.get("estimation_issues", []):
        tier = _severity_tier(issue.get("severity", "MINOR"))
        actions[tier].append({
            "dimension":     "Commercial Strength",
            "source":        "ncr2",
            "type":          "estimation",
            "action":        issue.get("issue", ""),
            "location":      issue.get("location", ""),
            "suggested_fix": issue.get("recommendation", ""),
        })

    # NCR2 outputs phase_coverage (PRESENT/PARTIAL/ABSENT) — not missing_phases
    _CRITICAL_PHASES = {"Discovery / Requirements", "Solution Design",
                        "Build / Development", "Testing / QA", "Deployment / Go-Live"}
    for phase in result.get("phase_coverage", []):
        status = phase.get("status", "PRESENT")
        if status not in ("ABSENT", "PARTIAL"):
            continue
        phase_name = phase.get("phase", "")
        severity   = "CRITICAL" if (status == "ABSENT" and phase_name in _CRITICAL_PHASES) else "MAJOR"
        tier       = _severity_tier(severity)
        actions[tier].append({
            "dimension":     "Commercial Strength",
            "source":        "ncr2",
            "type":          "phase_coverage",
            "action":        f"Phase {status.lower()}: {phase_name}",
            "location":      phase_name,
            "suggested_fix": phase.get("note", "Add this phase with effort, cost, and timeline."),
        })

    for issue in result.get("pricing_issues", []):
        tier = _severity_tier(issue.get("severity", "MINOR"))
        actions[tier].append({
            "dimension":     "Commercial Strength",
            "source":        "ncr2",
            "type":          "pricing",
            "action":        issue.get("issue", ""),
            "location":      issue.get("location", ""),
            "suggested_fix": issue.get("recommendation", ""),
        })


def _extract_competitive_actions(result: dict, actions: dict) -> None:
    """Extract priority actions from NCR3 (Competitive Position) output."""
    for issue in result.get("client_fit_issues", []):
        tier = _severity_tier(issue.get("severity", "MINOR"))
        actions[tier].append({
            "dimension":     "Competitive Position",
            "source":        "ncr3",
            "type":          "client_fit",
            "action":        issue.get("issue", ""),
            "location":      issue.get("priority", ""),
            "suggested_fix": issue.get("recommendation", ""),
        })

    for issue in result.get("risk_transparency_issues", []):
        tier = _severity_tier(issue.get("severity", "MINOR"))
        actions[tier].append({
            "dimension":     "Competitive Position",
            "source":        "ncr3",
            "type":          issue.get("type", "risk_transparency"),  # NCR3: type = risk_register|dependency|assumption|pre_project
            "action":        issue.get("issue", ""),
            "location":      issue.get("type", ""),
            "suggested_fix": "Add specific named mitigations with owner and timeline consequence.",
        })

    for issue in result.get("credibility_gaps", []):
        tier = _severity_tier(issue.get("severity", "MINOR"))
        actions[tier].append({
            "dimension":     "Competitive Position",
            "source":        "ncr3",
            "type":          issue.get("type", "credibility"),  # NCR3: type = team|case_study|governance|overclaiming
            "action":        issue.get("issue", ""),
            "location":      issue.get("type", ""),
            "suggested_fix": "Provide specific case studies, named team credentials, or measurable outcomes.",
        })


# ── Double-flagged detection ───────────────────────────────────────────────────

# Keywords mapping NC3 category names → NCR dimension
_DIM_KEYWORDS: dict[str, list[str]] = {
    "clarity_completeness": [
        "scope", "clarity", "completeness", "writing", "document", "section",
        "structure", "narrative", "language", "quality", "format", "content",
        "proposal", "communication", "clarity", "expression",
    ],
    "commercial_strength": [
        "commercial", "pricing", "cost", "estimation", "phase", "timeline",
        "budget", "financial", "payment", "invoice", "schedule", "resource",
        "effort", "delivery", "commercials", "rates", "fee", "charges",
    ],
    "competitive_position": [
        "risk", "credibility", "differentiation", "client", "competitive",
        "fit", "compliance", "governance", "team", "credential", "experience",
        "solution", "approach", "requirement", "vendor", "strength", "value",
        "benefit", "technical", "management",
    ],
}

_NCR_META: dict[str, dict] = {
    "clarity_completeness": {
        "label": "NCR1",
        "name":  "Clarity & Completeness",
        "keys":  ["writing_issues", "scope_clarity_issues"],
    },
    "commercial_strength": {
        "label": "NCR2",
        "name":  "Commercial Strength",
        "keys":  ["estimation_issues", "pricing_issues"],
    },
    "competitive_position": {
        "label": "NCR3",
        "name":  "Competitive Position",
        "keys":  ["client_fit_issues", "risk_transparency_issues", "credibility_gaps"],
    },
}

_DOUBLE_FLAG_SCORE_THRESHOLD = 7.0   # NCR score below this = specialist confirmed the gap
_DOUBLE_FLAG_MIN_NC3_FAILS   = 1     # at least this many FAILs in NC3 category


def _map_category_to_dimension(category_name: str) -> str | None:
    """Return the NCR dimension whose keywords best match the NC3 category name."""
    name_lower = category_name.lower()
    best_dim   = None
    best_count = 0
    for dim, keywords in _DIM_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in name_lower)
        if count > best_count:
            best_count = count
            best_dim   = dim
    return best_dim if best_count > 0 else None


def _top_ncr_issue(ncr_result: dict, issue_keys: list[str]) -> str:
    """Pull the first meaningful issue text from an NCR specialist result."""
    for key in issue_keys:
        for issue in (ncr_result.get(key) or []):
            text = issue.get("issue") or issue.get("why") or issue.get("finding") or ""
            if text and len(text) > 10:
                return text[:180].rstrip(".") + "."
    return ""


def _find_double_flagged(
    nc3_results: list[dict],
    specialist_results: dict | None,
) -> list[dict]:
    """Detect issues flagged independently by BOTH NC3 (checklist) AND an NCR specialist.

    An issue is double-flagged when:
      1. NC3 found ≥1 FAIL in a checklist category, AND
      2. The NCR specialist whose dimension matches that category scored < 7.0
         (meaning the specialist independently confirmed weakness in that area).

    Returns a list of double_flagged dicts compatible with DoubleFlaggedIssues.jsx:
      { agents, issue_summary, shared_keywords, agent_quotes }
    """
    if not specialist_results:
        return []

    double_flagged: list[dict] = []
    seen_dims: set[str] = set()  # one entry per NCR dimension max

    for cat in nc3_results:
        if cat.get("status") != "complete":
            continue

        cat_name  = cat.get("category_name", "Unknown Category")
        nc3_fails = [f for f in cat.get("findings", []) if f.get("status") == "FAIL"]
        if len(nc3_fails) < _DOUBLE_FLAG_MIN_NC3_FAILS:
            continue

        dim = _map_category_to_dimension(cat_name)
        if not dim or dim in seen_dims:
            continue

        ncr_key = {"clarity_completeness": "ncr1",
                   "commercial_strength":  "ncr2",
                   "competitive_position": "ncr3"}[dim]

        sr = specialist_results.get(ncr_key) or {}
        if sr.get("status") != "complete" or not sr.get("result"):
            continue

        ncr_score  = float(sr.get("score", 10.0))
        ncr_output = sr["result"]

        if ncr_score >= _DOUBLE_FLAG_SCORE_THRESHOLD:
            continue   # NCR specialist didn't confirm a weakness here

        # ── Both agents flagged a problem in this dimension ───────────────────
        seen_dims.add(dim)
        meta = _NCR_META[dim]

        shared_kws = [kw for kw in _DIM_KEYWORDS[dim] if kw in cat_name.lower()][:4]

        nc3_quote = (
            f"NC3 Checklist: {len(nc3_fails)} item{'s' if len(nc3_fails) != 1 else ''} "
            f"FAILED in '{cat_name}' category."
        )
        ncr_quote_text = _top_ncr_issue(ncr_output, meta["keys"])
        ncr_quote = (
            f"{meta['label']} {meta['name']}: {ncr_quote_text}"
            if ncr_quote_text
            else f"{meta['label']} {meta['name']}: score {ncr_score:.1f}/10 — independent weakness confirmed."
        )

        double_flagged.append({
            "agents":          ["NC3", meta["label"]],
            "issue_summary":   (
                f"'{cat_name}' failed {len(nc3_fails)} checklist "
                f"item{'s' if len(nc3_fails) != 1 else ''} AND scored {ncr_score:.1f}/10 in the "
                f"{meta['name']} specialist review — two independent agents confirmed this gap."
            ),
            "shared_keywords": shared_kws,
            "agent_quotes":    [nc3_quote, ncr_quote],
        })

    return double_flagged
