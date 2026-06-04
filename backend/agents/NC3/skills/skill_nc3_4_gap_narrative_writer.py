"""
Skill NC3.4 — Gap Narrative Writer

For every FAIL or PARTIAL finding, produces a structured "gap_structured" object
that enriches the raw gap string from the LLM. This structured gap becomes the
source for NC4's must-fix / should-fix / next-time action lists.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Severity thresholds use combined_weight = item_weight × category_weight.
#
# Old thresholds (0.30/0.15/0.05) were calibrated for a small number of
# high-weight items (e.g., 3-5 checklist sections, each worth 0.30-0.40).
# Custom checklists typically have 8+ categories at equal weight (0.125 each),
# so every item produced combined_weight ~0.125, classified as "minor", and
# everything landed in "should_fix" — nothing ever in "must_fix" or "next_time".
#
# New thresholds are calibrated to be relative to typical checklist structures:
#   critical  (≥ 0.20): high-weight category — 4 equal categories or fewer, or
#                         a category explicitly given >20% weight
#   major     (≥ 0.08): normal-weight category — 8–12 equal categories covers
#                         this range (1/8 = 0.125, 1/12 = 0.083); FAIL → must_fix
#   minor     (≥ 0.02): low-weight category — 15-50 equal categories
#   advisory  (< 0.02): very low weight; informational only
_SEVERITY_THRESHOLDS: tuple[tuple[float, str], ...] = (
    (0.20, "critical"),
    (0.08, "major"),
    (0.02, "minor"),
    (0.0,  "advisory"),
)

# PARTIAL minor items move to next_time so the 3-tier split is meaningful:
#   must_fix   — FAIL in any important category (major/critical)
#   should_fix — PARTIAL in important category OR FAIL in low-weight category
#   next_time  — PARTIAL in low-weight category; purely advisory items
_ACTION_TIERS: dict[tuple[str, str], str] = {
    ("critical", "FAIL"):    "must_fix",
    ("critical", "PARTIAL"): "must_fix",
    ("major",    "FAIL"):    "must_fix",
    ("major",    "PARTIAL"): "should_fix",
    ("minor",    "FAIL"):    "should_fix",
    ("minor",    "PARTIAL"): "next_time",
    ("advisory", "FAIL"):    "next_time",
    ("advisory", "PARTIAL"): "next_time",
}


class GapNarrativeWriter:
    """Structures FAIL and PARTIAL gap findings with severity, action tiers, and fix suggestions.

    For each non-PASS finding, computes combined weight (item_weight × category_weight),
    determines severity and action tier, then splits the LLM gap text into a
    gap_description and suggested_fix pair.

    PASS findings receive gap_structured = None.
    """

    def run(
        self,
        findings: list[dict[str, Any]],
        category: dict[str, Any],
        scoring_type: str,
    ) -> list[dict[str, Any]]:
        """Write structured gap objects for all FAIL and PARTIAL findings.

        Args:
            findings: Findings list (post NC3.3 validation).
            category: Full NC2 category dict (provides item weights and category weight).
            scoring_type: Global scoring type string (for context, not scoring here).

        Returns:
            The findings list with "gap_structured" added to every finding.
        """
        category_id: str = category.get("id", "unknown")
        category_name: str = category.get("name", "Unknown")
        category_weight: float = float(category.get("weight", 1.0))
        items: list[dict[str, Any]] = category.get("items", [])

        item_weight_map: dict[str, float] = {
            item["id"]: float(item.get("weight", 1.0)) for item in items
        }

        must_fix = 0
        should_fix = 0
        next_time = 0

        for finding in findings:
            status: str = finding.get("status", "FAIL")

            if status == "PASS":
                finding["gap_structured"] = None
                continue

            item_id: str = finding.get("item_id", "?")
            item_weight = item_weight_map.get(item_id, 1.0)
            combined_weight = round(item_weight * category_weight, 4)

            severity = self._get_severity(combined_weight)
            action_tier = _ACTION_TIERS.get((severity, status), "next_time")

            gap_description, suggested_fix = self._split_gap_text(
                finding.get("gap") or ""
            )

            finding["gap_structured"] = {
                "item_id": item_id,
                "category_id": category_id,
                "category_name": category_name,
                "status": status,
                "severity": severity,
                "action_tier": action_tier,
                "gap_description": gap_description,
                "suggested_fix": suggested_fix,
                "item_weight": item_weight,
                "category_weight": category_weight,
                "combined_weight": combined_weight,
            }

            if action_tier == "must_fix":
                must_fix += 1
            elif action_tier == "should_fix":
                should_fix += 1
            else:
                next_time += 1

        logger.info(
            "NC3.4 gap analysis complete. must_fix=%d, should_fix=%d, next_time=%d",
            must_fix, should_fix, next_time,
        )
        return findings

    def _get_severity(self, combined_weight: float) -> str:
        """Map a combined weight value to a severity level.

        Args:
            combined_weight: Product of item_weight and category_weight.

        Returns:
            Severity string: "critical", "major", "minor", or "advisory".
        """
        for threshold, severity in _SEVERITY_THRESHOLDS:
            if combined_weight >= threshold:
                return severity
        return "advisory"

    def _split_gap_text(self, gap_text: str) -> tuple[str, str]:
        """Split a gap string into a description and suggested fix.

        Attempts to split on the first period followed by whitespace. If only
        one sentence is present, provides a generic suggested fix.

        Args:
            gap_text: The raw gap string from the LLM finding.

        Returns:
            Tuple of (gap_description, suggested_fix).
        """
        if not gap_text or not gap_text.strip():
            return (
                "Requirement not met.",
                "Review and address this gap before submission.",
            )

        text = gap_text.strip()

        parts = text.split(". ", 1)
        if len(parts) == 2 and parts[1].strip():
            desc = parts[0].rstrip(".").strip() + "."
            fix = parts[1].strip()
            if not fix.endswith("."):
                fix += "."
            return desc, fix

        return text, "Review and address this gap before submission."
