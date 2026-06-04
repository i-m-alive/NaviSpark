"""
Skill NC3.3 — Partial Credit Scorer

Validates and normalises all score values in the findings list. Ensures scores
are consistent with the scoring type and item status. Handles edge cases: scores
out of range, scores inconsistent with PASS/FAIL status, and PARTIAL items with
missing gap explanations.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_SCORING_PARAMS: dict[str, tuple[float, float]] = {
    "binary": (1.0, 0.5),
    "scored_1_to_5": (5.0, 2.5),
    "weighted_1_to_5": (5.0, 2.5),
    "scored_1_to_10": (10.0, 5.0),
    "weighted_1_to_10": (10.0, 5.0),
}


class PartialCreditScorer:
    """Validates scores in the findings list against scoring type and status rules.

    Applies five validation rules in order per finding:
      1. Clamp to valid range [0, max_score]
      2. PASS must have full score
      3. FAIL must have zero score
      4. PARTIAL must be strictly between 0 and max_score
      5. PARTIAL must have a gap explanation

    Attaches a "score_meta" dict to each finding documenting the result.
    """

    def run(
        self,
        findings: list[dict[str, Any]],
        scoring_type: str,
        category_items: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Validate and normalise all scores in the findings list.

        Args:
            findings: Findings list (post NC3.2 enrichment).
            scoring_type: Global scoring type string from NC2.
            category_items: Items list from the NC2 category (for reference).

        Returns:
            The findings list with validated scores and "score_meta" added to each.
        """
        logger.debug(
            "NC3.3 PartialCreditScorer.run() findings=%d scoring_type=%s",
            len(findings), scoring_type,
        )

        max_score, half_score = _SCORING_PARAMS.get(
            scoring_type, _SCORING_PARAMS["binary"]
        )

        for finding in findings:
            corrections: list[str] = []

            try:
                score = float(finding.get("score", 0.0))
            except (ValueError, TypeError):
                score = 0.0

            # Rule 1 — Clamp to valid range
            score = max(0.0, min(score, max_score))

            status = finding.get("status", "FAIL")

            # Rule 2 — PASS must have full score
            if status == "PASS" and score < max_score:
                score = max_score
                corrections.append("Score corrected to max for PASS status")

            # Rule 3 — FAIL must have zero score
            if status == "FAIL" and score > 0.0:
                score = 0.0
                corrections.append("Score corrected to 0 for FAIL status")

            # Rule 4 — PARTIAL must be strictly between 0 and max_score
            if status == "PARTIAL":
                if score <= 0.0:
                    score = half_score
                    corrections.append("Score set to half_score for PARTIAL with 0 score")
                elif score >= max_score:
                    score = half_score
                    corrections.append("Score capped at half_score for PARTIAL with max score")

            # Rule 5 — PARTIAL must have a gap explanation
            if status == "PARTIAL" and not finding.get("gap"):
                finding["gap"] = (
                    "Item partially meets the requirement. "
                    "Specific gaps not detailed by evaluator."
                )

            finding["score"] = score
            finding["score_meta"] = {
                "max_score": max_score,
                "half_score": half_score,
                "score_pct": round((score / max_score) * 100, 1) if max_score else 0.0,
                "corrections": corrections,
                "scoring_type": scoring_type,
            }

        logger.debug("NC3.3 complete. findings=%d", len(findings))
        return findings
