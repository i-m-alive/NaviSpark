"""
Skill NC4.6 — Verdict Engine

Applies the three-tier verdict rules from the architecture specification to
produce the final verdict string. The verdict is the most prominent output of
the entire pipeline — rendered as a coloured badge in CustomVerdictPanel.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_VERDICT_CODES: dict[str, str] = {
    "READY TO SEND": "READY",
    "NEEDS MAJOR REVISION": "REVISION",
    "DO NOT SEND": "DO_NOT_SEND",
}


class VerdictEngine:
    """Applies five ordered verdict rules to produce the final verdict.

    Rules are evaluated in order — the first matching rule wins:
      1. DO NOT SEND  — overall_score < 5.0
      2. DO NOT SEND  — must_fix_count >= 4
      3. DO NOT SEND  — critical category (weight >= 0.30) scores < 2.0
      4. READY TO SEND — score >= 8.0 AND must_fix == 0
      5. NEEDS MAJOR REVISION — catch-all
    """

    _CRITICAL_WEIGHT_THRESHOLD = 0.30
    _CRITICAL_SCORE_THRESHOLD = 2.0
    _READY_SCORE_THRESHOLD = 8.0
    _DO_NOT_SEND_SCORE_THRESHOLD = 5.0
    _DO_NOT_SEND_MUST_FIX_THRESHOLD = 4

    def run(
        self,
        overall_score: float,
        priority_actions: dict[str, Any],
        category_scores: dict[str, float],
        nc2_output: dict[str, Any],
    ) -> dict[str, Any]:
        """Apply verdict rules and return the full verdict result dict.

        Args:
            overall_score: Float 0–10 from NC4.1.
            priority_actions: Dict from NC4.3 with must_fix list.
            category_scores: {category_name: normalised_score} from NC4.1.
            nc2_output: Full NC2 output — used to identify critical categories.

        Returns:
            A dict with keys: verdict, verdict_code, score_band, must_fix_count,
            triggering_rule, critical_category_failures.
        """
        must_fix_list = priority_actions.get("must_fix", [])
        must_fix_count = len(must_fix_list)

        critical_category_failures: list[str] = []

        verdict = "NEEDS MAJOR REVISION"
        triggering_rule = "default_revision"

        # Rule 1 — DO NOT SEND by score
        if overall_score < self._DO_NOT_SEND_SCORE_THRESHOLD:
            verdict = "DO NOT SEND"
            triggering_rule = "score_below_5.0"

        # Rule 2 — DO NOT SEND by must-fix count
        elif must_fix_count >= self._DO_NOT_SEND_MUST_FIX_THRESHOLD:
            verdict = "DO NOT SEND"
            triggering_rule = "four_or_more_must_fix"

        # Rule 3 — DO NOT SEND by catastrophic critical category failure
        else:
            critical_failures = self._find_critical_failures(
                nc2_output, category_scores
            )
            if critical_failures:
                critical_category_failures = critical_failures
                verdict = "DO NOT SEND"
                triggering_rule = "catastrophic_critical_category_failure"

            # Rule 4 — READY TO SEND
            elif overall_score >= self._READY_SCORE_THRESHOLD and must_fix_count == 0:
                verdict = "READY TO SEND"
                triggering_rule = "score_above_8.0_no_must_fix"

            # Rule 5 — NEEDS MAJOR REVISION (catch-all — already set as default)

        if overall_score >= 8.0:
            score_band = "8.0-10.0"
        elif overall_score >= 5.0:
            score_band = "5.0-7.9"
        else:
            score_band = "0.0-4.9"

        logger.info(
            "NC4.6 verdict='%s' (rule=%s) score=%.2f must_fix=%d",
            verdict, triggering_rule, overall_score, must_fix_count,
        )

        return {
            "verdict": verdict,
            "verdict_code": _VERDICT_CODES.get(verdict, "REVISION"),
            "score_band": score_band,
            "must_fix_count": must_fix_count,
            "triggering_rule": triggering_rule,
            "critical_category_failures": critical_category_failures,
        }

    def _find_critical_failures(
        self,
        nc2_output: dict[str, Any],
        category_scores: dict[str, float],
    ) -> list[str]:
        """Find critical categories (weight >= 0.30) that scored below 2.0.

        Args:
            nc2_output: Full NC2 output with categories and weights.
            category_scores: {category_name: normalised_score} from NC4.1.

        Returns:
            List of category names that are critical and failed the threshold.
        """
        failures: list[str] = []
        for cat in nc2_output.get("categories", []):
            weight = float(cat.get("weight", 0.0))
            name = cat.get("name", "")
            if weight >= self._CRITICAL_WEIGHT_THRESHOLD:
                score = category_scores.get(name, 0.0)
                if score < self._CRITICAL_SCORE_THRESHOLD:
                    failures.append(name)
        return failures
