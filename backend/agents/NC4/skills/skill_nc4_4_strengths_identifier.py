"""
Skill NC4.4 — Strengths Identifier

Identifies the top 3 checklist categories where the proposal performed strongest.
These become the positive highlights in the executive summary and the
top_3_strengths field in the NC4 output.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class StrengthsIdentifier:
    """Identifies the top 3 strongest performing NC3 categories.

    Filters to complete results only, sorts by normalised score descending,
    and generates a one-sentence highlight for each strength.
    """

    def run(
        self,
        nc3_results: list[dict[str, Any]],
        category_scores: dict[str, float],
    ) -> list[dict[str, Any]]:
        """Identify top 3 strongest categories.

        Args:
            nc3_results: Full NC3 results list.
            category_scores: {category_name: normalised_score_0_to_10} from NC4.1.

        Returns:
            List of up to 3 strength dicts, sorted by score descending.
        """
        logger.debug("NC4.4 StrengthsIdentifier.run()")

        complete = [
            r for r in nc3_results
            if r.get("status") == "complete" and category_scores.get(r.get("category_name", ""), 0.0) > 0
        ]

        complete.sort(
            key=lambda r: category_scores.get(r.get("category_name", ""), 0.0),
            reverse=True,
        )

        strengths: list[dict[str, Any]] = []
        for rank, result in enumerate(complete[:3], start=1):
            cat_name = result.get("category_name", "Unknown")
            score = category_scores.get(cat_name, 0.0)
            items_passed = result.get("items_passed", 0)
            items_total = result.get("items_evaluated", 0)
            pass_rate = (items_passed / items_total) if items_total > 0 else 0.0
            pass_rate_pct = pass_rate * 100.0

            highlight = self._generate_highlight(
                cat_name, score, items_passed, items_total, pass_rate_pct
            )

            strengths.append({
                "rank": rank,
                "category_name": cat_name,
                "score": score,
                "score_pct": round((score / 10.0) * 100.0, 1),
                "items_passed": items_passed,
                "items_total": items_total,
                "pass_rate": round(pass_rate, 4),
                "highlight": highlight,
            })

        logger.info("NC4.4 complete. strengths_found=%d", len(strengths))
        return strengths

    def _generate_highlight(
        self,
        category_name: str,
        score: float,
        items_passed: int,
        items_total: int,
        pass_rate_pct: float,
    ) -> str:
        """Generate a one-sentence highlight for a strength category.

        Args:
            category_name: Name of the category.
            score: Normalised score (0–10).
            items_passed: Number of items that passed.
            items_total: Total items evaluated.
            pass_rate_pct: Pass rate as a percentage (0–100).

        Returns:
            One-sentence highlight string.
        """
        if score >= 8.0:
            return (
                f"The proposal fully meets requirements in {category_name} with "
                f"{items_passed} of {items_total} items passing ({pass_rate_pct:.0f}%)."
            )
        if score >= 6.0:
            return (
                f"The proposal demonstrates solid coverage of {category_name}, "
                f"passing {items_passed} of {items_total} items ({pass_rate_pct:.0f}%)."
            )
        if score >= 4.0:
            return (
                f"The proposal shows reasonable effort in {category_name}, with "
                f"{items_passed} of {items_total} items meeting requirements ({pass_rate_pct:.0f}%)."
            )
        return (
            f"Relative to other categories, {category_name} was the stronger area with "
            f"{items_passed} of {items_total} items passing ({pass_rate_pct:.0f}%)."
        )
