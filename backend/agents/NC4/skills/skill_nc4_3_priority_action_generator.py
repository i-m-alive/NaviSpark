"""
Skill NC4.3 — Priority Action Generator

Collects all gap_structured objects from every FAIL and PARTIAL finding across
all NC3 results, then organises them into three prioritised action lists:
must_fix, should_fix, and next_time.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class PriorityActionGenerator:
    """Builds the three-tier priority action lists from NC3 gap_structured objects.

    Items are sorted by combined_weight descending within each tier so the
    highest-impact gaps appear first in the frontend action lists.
    """

    def run(
        self,
        nc3_results: list[dict[str, Any]],
        nc2_output: dict[str, Any],
    ) -> dict[str, Any]:
        """Build must_fix, should_fix, and next_time action lists.

        Args:
            nc3_results: Full NC3 results list.
            nc2_output: Full NC2 output (used to validate category weights).

        Returns:
            A dict with keys: must_fix, should_fix, next_time, total_actions.
        """
        logger.debug("NC4.3 PriorityActionGenerator.run()")

        _PARSE_ERROR_MARKER = "llm response could not be parsed"

        all_gaps: list[dict[str, Any]] = []
        for result in nc3_results:
            if result.get("status") != "complete":
                continue
            for finding in result.get("findings", []):
                gs = finding.get("gap_structured")
                if gs is None:
                    continue
                # Skip fallback findings generated when the LLM response failed to parse
                gap_desc = (gs.get("gap_description") or "").lower()
                raw_gap  = (finding.get("gap") or "").lower()
                if _PARSE_ERROR_MARKER in gap_desc or _PARSE_ERROR_MARKER in raw_gap:
                    continue
                if not gs.get("gap_description", "").strip():
                    continue
                enriched = dict(gs)
                enriched["evidence"] = finding.get("evidence")
                all_gaps.append(enriched)

        must_fix_raw = sorted(
            [g for g in all_gaps if g.get("action_tier") == "must_fix"],
            key=lambda g: g.get("combined_weight", 0.0),
            reverse=True,
        )
        should_fix_raw = sorted(
            [g for g in all_gaps if g.get("action_tier") == "should_fix"],
            key=lambda g: g.get("combined_weight", 0.0),
            reverse=True,
        )
        next_time_raw = sorted(
            [g for g in all_gaps if g.get("action_tier") == "next_time"],
            key=lambda g: g.get("combined_weight", 0.0),
            reverse=True,
        )

        must_fix = self._build_actions(must_fix_raw, "MF")
        should_fix = self._build_actions(should_fix_raw, "SF")
        next_time = self._build_actions(next_time_raw, "NT")

        total = len(must_fix) + len(should_fix) + len(next_time)

        logger.info(
            "NC4.3 complete. must_fix=%d, should_fix=%d, next_time=%d",
            len(must_fix), len(should_fix), len(next_time),
        )

        return {
            "must_fix": must_fix,
            "should_fix": should_fix,
            "next_time": next_time,
            "total_actions": total,
        }

    def _build_actions(
        self,
        gaps: list[dict[str, Any]],
        prefix: str,
    ) -> list[dict[str, Any]]:
        """Convert raw gap dicts into action dicts with assigned IDs.

        Args:
            gaps: Sorted list of gap_structured dicts enriched with evidence.
            prefix: Two-letter prefix for action IDs ("MF", "SF", "NT").

        Returns:
            List of action dicts.
        """
        actions: list[dict[str, Any]] = []
        for n, g in enumerate(gaps, start=1):
            actions.append({
                "action_id": f"{prefix}-{n:03d}",
                "item_id": g.get("item_id", "?"),
                "category_name": g.get("category_name", "Unknown"),
                "status": g.get("status", "FAIL"),
                "severity": g.get("severity", "minor"),
                "gap_description": g.get("gap_description", ""),
                "suggested_fix": g.get("suggested_fix", ""),
                "item_weight": g.get("item_weight", 1.0),
                "category_weight": g.get("category_weight", 1.0),
                "combined_weight": g.get("combined_weight", 0.0),
                "evidence": g.get("evidence"),
            })
        return actions
