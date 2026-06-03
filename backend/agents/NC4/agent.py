"""
NC4 Agent — Synthesis & Report
Custom Checklist Review Pipeline

Runs last, sequentially, after all NC3 instances complete (Stage 3).
Aggregates per-category findings into one final scored report with verdict.

Inputs:
    nc3_results : list[dict]  — full list from run_nc3_fanout()
    nc2_output  : dict        — full NC2 output (categories, weights, scoring_type)
    nc1_output  : dict        — full NC1 output (auto_detected, structure_map, confidence)

Output schema:
{
    "overall_score":   float,    # 0.0–10.0
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
    ) -> dict[str, Any]:
        """Execute the full NC4 Synthesis & Report pipeline.

        Args:
            nc3_results: List of per-category results from run_nc3_fanout(). Each
                dict has: category_id, category_name, status, score, max_score,
                items_evaluated, items_passed, items_partial, items_failed,
                findings, error_message.
            nc2_output: Full NC2 Checklist Intelligence output dict.
            nc1_output: Full NC1 Document Intelligence output dict.

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
