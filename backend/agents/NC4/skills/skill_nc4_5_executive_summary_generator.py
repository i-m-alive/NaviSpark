"""
Skill NC4.5 — Executive Summary Generator

Produces a 4–5 sentence plain-English executive summary covering: the overall
score, the most critical gaps, the top strengths, and the final recommendation.
Entirely deterministic string templating — no LLM call.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class ExecutiveSummaryGenerator:
    """Generates a plain-English executive summary from NC4 aggregated data.

    Five sentences are assembled independently and joined with spaces:
      S1 — Overall score and pass rate.
      S2 — Verdict and must-fix count.
      S3 — Top strengths.
      S4 — Most critical gap.
      S5 — Final recommendation.
    """

    def run(
        self,
        overall_score: float,
        verdict: str,
        priority_actions: dict[str, Any],
        top_3_strengths: list[dict[str, Any]],
        category_scores: dict[str, float],
        nc1_output: dict[str, Any],
        checklist_coverage: dict[str, Any],
    ) -> str:
        """Write the 4–5 sentence executive summary.

        Args:
            overall_score: Float 0–10 from NC4.1.
            verdict: Verdict string from NC4.6.
            priority_actions: Dict from NC4.3 with must_fix, should_fix, next_time.
            top_3_strengths: List from NC4.4.
            category_scores: {category_name: score} dict from NC4.1.
            nc1_output: Full NC1 output dict.
            checklist_coverage: Coverage dict with total_items, passed, pass_rate.

        Returns:
            Single string — the 4–5 sentence executive summary.
        """
        nc1_auto = nc1_output.get("auto_detected", {})
        client = nc1_auto.get("client_name") or "the client"

        passed = checklist_coverage.get("passed", 0)
        total = checklist_coverage.get("total_items", 0)
        pass_pct = round(checklist_coverage.get("pass_rate", 0.0) * 100, 0)

        s1 = (
            f"This proposal for {client} scored {overall_score:.1f} out of 10.0 overall, "
            f"meeting {passed} of {total} checklist criteria ({pass_pct:.0f}% pass rate)."
        )

        must_fix_list = priority_actions.get("must_fix", [])
        must_fix_count = len(must_fix_list)

        if verdict == "READY TO SEND":
            s2 = "The proposal meets all critical requirements and is ready for submission."
        elif verdict == "NEEDS MAJOR REVISION":
            item_word = "items" if must_fix_count != 1 else "item"
            s2 = (
                f"The evaluation found {must_fix_count} must-fix {item_word} "
                f"that require attention before this proposal can be submitted."
            )
        else:
            s2 = (
                f"With {must_fix_count} critical gaps identified, "
                f"this proposal requires substantial revision and is not ready for submission."
            )

        if top_3_strengths:
            strength_names = [s["category_name"] for s in top_3_strengths[:2]]
            if len(strength_names) >= 2:
                s3 = f"The proposal's strongest areas are {strength_names[0]} and {strength_names[1]}."
            else:
                s3 = f"The proposal's strongest area is {strength_names[0]}."
        else:
            s3 = "No categories scored above the passing threshold."

        if must_fix_list:
            top_gap = must_fix_list[0]
            s4 = (
                f"The most critical gap is in the {top_gap['category_name']} category: "
                f"{top_gap['gap_description']}"
            )
            if not s4.rstrip().endswith("."):
                s4 += "."
        else:
            should_fix_list = priority_actions.get("should_fix", [])
            if should_fix_list:
                top_gap = should_fix_list[0]
                s4 = (
                    f"The primary area for improvement is {top_gap['category_name']}: "
                    f"{top_gap['gap_description']}"
                )
                if not s4.rstrip().endswith("."):
                    s4 += "."
            else:
                s4 = "No significant gaps were identified in the evaluation."

        should_count = len(priority_actions.get("should_fix", []))
        next_count = len(priority_actions.get("next_time", []))

        if verdict == "READY TO SEND":
            if next_count > 0:
                s5 = (
                    f"Minor improvements are recommended for future submissions: "
                    f"{next_count} advisory item{'s' if next_count != 1 else ''} noted."
                )
            else:
                s5 = "No further action required before submission."
        elif verdict == "NEEDS MAJOR REVISION":
            mf_word = "items" if must_fix_count != 1 else "item"
            sf_word = "recommendations" if should_count != 1 else "recommendation"
            s5 = (
                f"Addressing the {must_fix_count} must-fix {mf_word} "
                f"and the {should_count} should-fix {sf_word} "
                f"is recommended before resubmission."
            )
        else:
            s5 = (
                "A comprehensive revision is required; the proposal team should review all "
                "must-fix and should-fix items before preparing a new version."
            )

        summary = " ".join([s1, s2, s3, s4, s5]).strip()
        logger.debug("NC4.5 executive summary generated. length=%d chars", len(summary))
        return summary
