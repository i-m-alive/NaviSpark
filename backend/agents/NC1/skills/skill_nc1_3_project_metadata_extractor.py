"""
Skill NC1.3 — Project Metadata Extractor

Extracts concrete metadata fields from the proposal: client name, vendor name,
project name, proposed timeline, budget/pricing hints, team size, and delivery
methodology. All extraction is performed with regex patterns; no LLM calls.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


class ProjectMetadataExtractor:
    """Extracts structured metadata fields from raw proposal text.

    All regex operations are wrapped in try/except so a malformed document
    cannot crash NC1. Missing fields return None rather than empty string.

    Supported fields:
      client_name, vendor_name, project_name, proposed_timeline,
      budget_range, team_size, delivery_methodology.
    """

    _CLIENT_PATTERN = re.compile(
        r"(?:prepared\s+for|submitted\s+to|client|attention|to)\s*[:\-]\s*([A-Z][^\n]{2,80})",
        re.IGNORECASE,
    )
    _VENDOR_PATTERN = re.compile(
        r"(?:prepared\s+by|submitted\s+by|vendor|from|author)\s*[:\-]\s*([A-Z][^\n]{2,80})",
        re.IGNORECASE,
    )
    _PROJECT_PATTERN = re.compile(
        r"(?:project\s+(?:name|title)|project|re|subject|regarding)\s*[:\-]\s*([A-Z][^\n]{2,120})",
        re.IGNORECASE,
    )
    _TIMELINE_DURATION = re.compile(
        r"(\d+)\s*(months?|weeks?|years?|days?)",
        re.IGNORECASE,
    )
    _TIMELINE_QUARTER = re.compile(
        r"(Q[1-4]\s*\d{4})",
        re.IGNORECASE,
    )
    _TIMELINE_BY_DATE = re.compile(
        r"by\s+([A-Z][a-z]+\s+\d{4}|\d{1,2}\s+[A-Z][a-z]+\s+\d{4})",
        re.IGNORECASE,
    )
    _BUDGET_SYMBOL = re.compile(
        r"([$€£¥][\d,\.]+\s*(?:[KMBkmb]|million|thousand|billion)?(?:\s*[\-–—]\s*[$€£¥][\d,\.]+\s*(?:[KMBkmb]|million|thousand|billion)?)?)",
        re.IGNORECASE,
    )
    _BUDGET_WORD = re.compile(
        r"(\d[\d,\.]+)\s*(million|thousand|k\b)",
        re.IGNORECASE,
    )
    _TEAM_SIZE = re.compile(
        r"(?:team\s+of\s+(\d+)|(\d+)\s+(?:FTE|resources|staff|consultants|developers|engineers|specialists|architects))",
        re.IGNORECASE,
    )
    _METHODOLOGY_KEYWORDS = [
        "agile", "scrum", "kanban", "waterfall", "prince2", "safe",
        "scaled agile", "devops", "lean", "itil",
    ]

    def run(self, document_text: str) -> dict[str, Any]:
        """Extract metadata fields from the proposal text.

        Args:
            document_text: Raw extracted text of the proposal.

        Returns:
            A dict with keys: client_name, vendor_name, project_name,
            proposed_timeline, budget_range, team_size, delivery_methodology.
            Any undetected field is None.
        """
        logger.debug("NC1.3 ProjectMetadataExtractor.run() text_len=%d", len(document_text))

        result: dict[str, Any] = {
            "client_name": self._extract_first(self._CLIENT_PATTERN, document_text),
            "vendor_name": self._extract_first(self._VENDOR_PATTERN, document_text),
            "project_name": self._extract_first(self._PROJECT_PATTERN, document_text),
            "proposed_timeline": self._extract_timeline(document_text),
            "budget_range": self._extract_budget(document_text),
            "team_size": self._extract_team_size(document_text),
            "delivery_methodology": self._extract_methodology(document_text),
        }

        logger.debug("NC1.3 result: %s", {k: v for k, v in result.items() if v is not None})
        return result

    def _extract_first(self, pattern: re.Pattern, text: str) -> str | None:
        """Return the first captured group from a pattern match, stripped.

        Args:
            pattern: Compiled regex with at least one capturing group.
            text: Text to search.

        Returns:
            Stripped match string, or None if no match.
        """
        try:
            match = pattern.search(text)
            if match:
                value = match.group(1).strip().rstrip(".,;:")
                return value if value else None
        except Exception as exc:
            logger.warning("NC1.3 regex extraction error: %s", exc)
        return None

    def _extract_timeline(self, text: str) -> str | None:
        """Extract the most informative timeline expression found in the text.

        Priority: quarter expression > duration (N months/weeks) > "by <date>".

        Args:
            text: Raw proposal text.

        Returns:
            Timeline string or None.
        """
        try:
            m = self._TIMELINE_QUARTER.search(text)
            if m:
                return m.group(1).strip()
        except Exception as exc:
            logger.warning("NC1.3 timeline quarter error: %s", exc)

        try:
            m = self._TIMELINE_DURATION.search(text)
            if m:
                return f"{m.group(1)} {m.group(2).lower()}"
        except Exception as exc:
            logger.warning("NC1.3 timeline duration error: %s", exc)

        try:
            m = self._TIMELINE_BY_DATE.search(text)
            if m:
                return f"by {m.group(1).strip()}"
        except Exception as exc:
            logger.warning("NC1.3 timeline by-date error: %s", exc)

        return None

    def _extract_budget(self, text: str) -> str | None:
        """Extract a budget or pricing expression from the text.

        Tries currency-symbol patterns first, then word-based amounts.

        Args:
            text: Raw proposal text.

        Returns:
            Budget string or None.
        """
        try:
            m = self._BUDGET_SYMBOL.search(text)
            if m:
                return m.group(1).strip()
        except Exception as exc:
            logger.warning("NC1.3 budget symbol error: %s", exc)

        try:
            m = self._BUDGET_WORD.search(text)
            if m:
                return f"{m.group(1)} {m.group(2)}"
        except Exception as exc:
            logger.warning("NC1.3 budget word error: %s", exc)

        return None

    def _extract_team_size(self, text: str) -> int | None:
        """Extract the team size as an integer from the text.

        Args:
            text: Raw proposal text.

        Returns:
            Integer team size, or None if not found.
        """
        try:
            m = self._TEAM_SIZE.search(text)
            if m:
                raw = m.group(1) or m.group(2)
                if raw:
                    return int(raw)
        except Exception as exc:
            logger.warning("NC1.3 team size error: %s", exc)
        return None

    def _extract_methodology(self, text: str) -> str | None:
        """Detect delivery methodology via case-insensitive keyword scan.

        Args:
            text: Raw proposal text.

        Returns:
            Methodology name with canonical capitalisation, or None.
        """
        lowered = text.lower()
        try:
            for kw in self._METHODOLOGY_KEYWORDS:
                if re.search(r"\b" + re.escape(kw) + r"\b", lowered):
                    return kw.upper() if kw in ("safe", "itil", "prince2") else kw.capitalize()
        except Exception as exc:
            logger.warning("NC1.3 methodology error: %s", exc)
        return None
