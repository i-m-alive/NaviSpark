"""
Skill NC4.1 — Weighted Score Aggregator

Computes a normalised per-category score (0–10 scale) and a final weighted
overall score (0–10 scale) across all NC3 results. Applies a penalty cap for
categories with a high proportion of failed high-weight items. Excludes NC3
error categories from scoring and flags them separately.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class WeightedScoreAggregator:
    """Aggregates NC3 per-category results into a normalised overall score.

    Normalises each category's raw score to a 0–10 scale, applies optional
    penalty caps, then computes a weight-averaged overall score.

    Error categories (NC3 status == "error") are excluded from calculations
    and listed separately in the output.
    """

    _PENALTY_MULTIPLIER = 0.85
    _FAIL_RATE_THRESHOLD = 0.60
    _HIGH_WEIGHT_THRESHOLD = 0.25

    def run(
        self,
        nc3_results: list[dict[str, Any]],
        nc2_output: dict[str, Any],
    ) -> dict[str, Any]:
        """Compute normalised per-category and weighted overall scores.

        Args:
            nc3_results: Full list from run_nc3_fanout(). Each element has
                category_id, category_name, status, score, max_score, findings.
            nc2_output: Full NC2 output dict — used to get category weights.

        Returns:
            A dict with keys: overall_score, max_score, category_scores,
            category_weights_used, penalty_applied, error_categories,
            scoring_breakdown.
        """
        weight_lookup: dict[str, float] = {
            cat["name"]: float(cat.get("weight", 1.0))
            for cat in nc2_output.get("categories", [])
        }

        complete_results = [r for r in nc3_results if r.get("status") == "complete"]
        error_results = [r for r in nc3_results if r.get("status") != "complete"]
        error_categories = [r.get("category_name", "unknown") for r in error_results]

        if error_results:
            logger.warning(
                "NC4.1 excluding %d error categories: %s",
                len(error_results), error_categories,
            )

        normalised_scores: dict[str, float] = {}
        penalty_applied: dict[str, bool] = {}
        category_weights_used: dict[str, float] = {}
        scoring_breakdown: list[dict[str, Any]] = []

        for result in complete_results:
            cat_name: str = result.get("category_name", "unknown")
            raw_score = float(result.get("score", 0.0))
            raw_max = float(result.get("max_score", 0.0))

            normalised = round((raw_score / raw_max) * 10.0, 4) if raw_max > 0 else 0.0

            apply_penalty = self._should_apply_penalty(result.get("findings", []))
            if apply_penalty:
                normalised = round(normalised * self._PENALTY_MULTIPLIER, 4)

            weight = weight_lookup.get(cat_name, 1.0)
            normalised_scores[cat_name] = normalised
            penalty_applied[cat_name] = apply_penalty
            category_weights_used[cat_name] = weight

            scoring_breakdown.append({
                "category_name": cat_name,
                "raw_score": raw_score,
                "raw_max_score": raw_max,
                "normalised_score": normalised,
                "weight": weight,
                "weighted_contribution": round(normalised * weight, 4),
                "penalty_applied": apply_penalty,
                "items_evaluated": result.get("items_evaluated", 0),
                "items_passed": result.get("items_passed", 0),
                "items_partial": result.get("items_partial", 0),
                "items_failed": result.get("items_failed", 0),
            })

        total_weight = sum(
            weight_lookup.get(r.get("category_name", ""), 1.0)
            for r in complete_results
        )
        if total_weight > 0 and complete_results:
            weighted_sum = sum(
                normalised_scores.get(r.get("category_name", ""), 0.0)
                * weight_lookup.get(r.get("category_name", ""), 1.0)
                for r in complete_results
            )
            overall_score = round(weighted_sum / total_weight, 2)
        else:
            overall_score = 0.0

        penalties_count = sum(1 for v in penalty_applied.values() if v)
        logger.info(
            "NC4.1 complete. overall_score=%.2f, categories=%d, errors=%d, penalties=%d",
            overall_score, len(complete_results), len(error_results), penalties_count,
        )

        return {
            "overall_score": overall_score,
            "max_score": 10.0,
            "category_scores": normalised_scores,
            "category_weights_used": category_weights_used,
            "penalty_applied": penalty_applied,
            "error_categories": error_categories,
            "scoring_breakdown": scoring_breakdown,
        }

    def _should_apply_penalty(self, findings: list[dict[str, Any]]) -> bool:
        """Determine whether the penalty cap applies to this category's score.

        Args:
            findings: The findings list from one NC3 category result.

        Returns:
            True if fail_rate > 60% AND at least one failed item has
            combined_weight >= 0.25.
        """
        total = len(findings)
        if total == 0:
            return False

        fail_items = [f for f in findings if f.get("status") == "FAIL"]
        fail_rate = len(fail_items) / total

        if fail_rate <= self._FAIL_RATE_THRESHOLD:
            return False

        for f in fail_items:
            gs = f.get("gap_structured")
            if gs and gs.get("combined_weight", 0.0) >= self._HIGH_WEIGHT_THRESHOLD:
                return True

        return False
