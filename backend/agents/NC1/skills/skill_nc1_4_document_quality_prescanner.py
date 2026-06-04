"""
Skill NC1.4 — Document Quality Pre-scanner

Surface-level completeness check. Verifies whether the 8 key proposal sections
are present in the document. Output is passed to NC3 as additional context.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


_KEY_SECTIONS: dict[str, list[str]] = {
    "Executive Summary": [
        "executive summary", "overview", "introduction",
    ],
    "Scope of Work": [
        "scope", "scope of work", "deliverables", "work packages",
    ],
    "Pricing / Commercial": [
        "pricing", "commercial", "cost", "investment", "fees", "budget",
    ],
    "Timeline / Schedule": [
        "timeline", "schedule", "milestones", "gantt", "project plan",
    ],
    "Team / Resources": [
        "team", "resources", "staff", "consultants", "cv", "biographies",
    ],
    "Technical Approach": [
        "technical", "architecture", "solution design", "approach", "methodology",
    ],
    "Risk Management": [
        "risk", "risks", "risk register", "risk management", "mitigation",
    ],
    "References / Case Studies": [
        "references", "case studies", "experience", "credentials", "portfolio",
    ],
}


class DocumentQualityPrescanner:
    """Checks whether the 8 key proposal sections are present in the document.

    Detection uses two sources:
      1. The detected ``sections`` list (headings) from NC1.1.
      2. A full keyword scan of the raw document text.

    A key section is considered present if any of its keywords appear in
    either the headings or the raw text (case-insensitive).
    """

    def run(self, document_text: str, sections: list[str]) -> dict[str, Any]:
        """Scan for the presence of 8 key proposal sections.

        Args:
            document_text: Raw extracted text of the proposal.
            sections: Section headings detected by NC1.1 ProposalStructureMapper.

        Returns:
            A dict with keys:
              - sections_present (dict[str, bool]): presence flag per key section.
              - completeness_score (float): fraction of key sections present (0.0–1.0).
              - missing_sections (list[str]): names of absent key sections.
              - quality_flags (list[str]): notable completeness warnings.
        """
        logger.debug("NC1.4 DocumentQualityPrescanner.run() text_len=%d sections=%d",
                     len(document_text), len(sections))

        lowered_text = document_text.lower()
        lowered_sections = [s.lower() for s in sections]

        sections_present: dict[str, bool] = {}
        for section_name, keywords in _KEY_SECTIONS.items():
            sections_present[section_name] = self._is_present(
                keywords, lowered_text, lowered_sections
            )

        total = len(_KEY_SECTIONS)
        found = sum(1 for v in sections_present.values() if v)
        completeness_score = round(found / total, 4) if total else 0.0

        missing_sections = [k for k, v in sections_present.items() if not v]
        quality_flags = self._build_quality_flags(completeness_score, sections_present)

        logger.debug("NC1.4 completeness=%.2f missing=%s", completeness_score, missing_sections)

        return {
            "sections_present": sections_present,
            "completeness_score": completeness_score,
            "missing_sections": missing_sections,
            "quality_flags": quality_flags,
        }

    def _is_present(
        self,
        keywords: list[str],
        lowered_text: str,
        lowered_sections: list[str],
    ) -> bool:
        """Return True if any keyword is found in the text or sections.

        Args:
            keywords: Keywords indicating the section's presence.
            lowered_text: Lowercased full document text.
            lowered_sections: Lowercased list of detected headings.

        Returns:
            True if at least one keyword matched.
        """
        for kw in keywords:
            try:
                pattern = re.escape(kw)
                if re.search(pattern, lowered_text):
                    return True
                if any(re.search(pattern, s) for s in lowered_sections):
                    return True
            except Exception as exc:
                logger.warning("NC1.4 keyword scan error for '%s': %s", kw, exc)
        return False

    def _build_quality_flags(
        self,
        completeness_score: float,
        sections_present: dict[str, bool],
    ) -> list[str]:
        """Generate quality warning flags based on completeness results.

        Args:
            completeness_score: Fraction of key sections found (0.0–1.0).
            sections_present: Per-section presence mapping.

        Returns:
            List of quality flag strings.
        """
        flags: list[str] = []
        if completeness_score < 0.5:
            flags.append(
                "LOW_COMPLETENESS: Fewer than half of standard proposal sections detected"
            )
        if not sections_present.get("Pricing / Commercial", True):
            flags.append(
                "MISSING_PRICING: No pricing or commercial section detected"
            )
        if not sections_present.get("Executive Summary", True):
            flags.append(
                "MISSING_EXEC_SUMMARY: No executive summary detected"
            )
        return flags
