"""
Skill NC1.1 — Proposal Structure Mapper

Extracts the table of contents, all section headings (for PDF) or slide titles
(for PPTX), and builds a full structural map of the document.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


class ProposalStructureMapper:
    """Extracts structural metadata from a proposal document.

    Supports two document types:
      - PDF: detects headings via all-caps lines, numbered patterns, and blank-line followers.
      - PPTX: detects slide titles from short, non-sentence-ending lines; counts ## Slide markers.

    The TOC is detected by scanning the first 10% of the document for common
    table-of-contents phrases.
    """

    _TOC_PHRASES = re.compile(
        r"\b(table\s+of\s+contents|contents|index)\b",
        re.IGNORECASE,
    )

    _SLIDE_MARKER = re.compile(r"^##\s+Slide\s+\d+", re.MULTILINE)

    _NUMBERED_HEADING = re.compile(
        r"^(\d+(\.\d+)*\.?\s+[A-Z][^\n]{2,60}|[A-Z]\.\s+[A-Z][^\n]{2,60})$",
        re.MULTILINE,
    )

    _ALL_CAPS_LINE = re.compile(
        r"^[A-Z][A-Z0-9 \t\-/&:,]{4,70}$",
        re.MULTILINE,
    )

    _SLIDE_TITLE_PATTERN = re.compile(
        r"^.{3,79}$",
        re.MULTILINE,
    )

    def run(self, document_text: str, file_type: str) -> dict[str, Any]:
        """Extract the structural map of the document.

        Args:
            document_text: Raw extracted text of the proposal.
            file_type: Either "pdf" or "pptx".

        Returns:
            A dict with keys:
              - sections (list[str]): detected headings or slide titles.
              - slide_count (int): number of slides (PPTX only; 0 for PDF).
              - has_toc (bool): whether a table of contents was detected.
              - structure_type (str): mirrors the file_type input.
        """
        logger.debug("NC1.1 ProposalStructureMapper.run() file_type=%s text_len=%d",
                     file_type, len(document_text))

        sections: list[str] = []
        slide_count: int = 0
        has_toc: bool = False

        try:
            has_toc = self._detect_toc(document_text)
        except Exception as exc:
            logger.warning("NC1.1 TOC detection failed: %s", exc)

        if file_type == "pptx":
            try:
                slide_count = self._count_slides(document_text)
                sections = self._extract_slide_titles(document_text)
            except Exception as exc:
                logger.warning("NC1.1 PPTX extraction failed: %s", exc)
        else:
            try:
                sections = self._extract_pdf_headings(document_text)
            except Exception as exc:
                logger.warning("NC1.1 PDF heading extraction failed: %s", exc)

        logger.debug("NC1.1 result: sections=%d, slide_count=%d, has_toc=%s",
                     len(sections), slide_count, has_toc)

        return {
            "sections": sections,
            "slide_count": slide_count,
            "has_toc": has_toc,
            "structure_type": file_type,
        }

    def _detect_toc(self, text: str) -> bool:
        """Return True if a table of contents phrase is found in the first 10% of text.

        Args:
            text: Full document text.

        Returns:
            True if a TOC indicator phrase is found early in the document.
        """
        cutoff = max(1, len(text) // 10)
        return bool(self._TOC_PHRASES.search(text[:cutoff]))

    def _count_slides(self, text: str) -> int:
        """Count occurrences of ## Slide N markers in the text.

        Args:
            text: Full PPTX-extracted document text.

        Returns:
            Integer count of slide markers found.
        """
        return len(self._SLIDE_MARKER.findall(text))

    def _extract_slide_titles(self, text: str) -> list[str]:
        """Extract slide titles from PPTX text.

        Slide titles are identified as short lines (< 80 chars) that do not
        end with mid-sentence punctuation (comma, semicolon). Lines that appear
        immediately after a ## Slide N marker are prioritised, but any short
        non-trailing-punctuation line is considered.

        Args:
            text: Full PPTX-extracted document text.

        Returns:
            Deduplicated list of detected slide title strings.
        """
        titles: list[str] = []
        seen: set[str] = set()
        lines = text.splitlines()

        after_slide_marker = False
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            if self._SLIDE_MARKER.match(stripped):
                after_slide_marker = True
                continue

            if after_slide_marker:
                if len(stripped) <= 79 and not stripped.endswith((",", ";")):
                    key = stripped.lower()
                    if key not in seen:
                        seen.add(key)
                        titles.append(stripped)
                after_slide_marker = False
                continue

            if (
                3 <= len(stripped) <= 79
                and not stripped.endswith((",", ";"))
                and not stripped.endswith(".")
                and not stripped[0].islower()
            ):
                key = stripped.lower()
                if key not in seen:
                    seen.add(key)
                    titles.append(stripped)

        return titles[:50]

    def _extract_pdf_headings(self, text: str) -> list[str]:
        """Extract section headings from PDF text.

        Uses three detection strategies:
          1. Numbered headings (e.g. "1.", "1.1", "A.").
          2. All-caps lines (4–70 characters, mostly uppercase).
          3. Lines followed immediately by a blank line (typical heading layout).

        Args:
            text: Full PDF-extracted document text.

        Returns:
            Deduplicated list of detected heading strings.
        """
        headings: list[str] = []
        seen: set[str] = set()

        def _add(h: str) -> None:
            key = h.strip().lower()
            if key and key not in seen and len(h.strip()) > 2:
                seen.add(key)
                headings.append(h.strip())

        try:
            for match in self._NUMBERED_HEADING.finditer(text):
                _add(match.group(0))
        except Exception as exc:
            logger.warning("NC1.1 numbered heading regex failed: %s", exc)

        try:
            for match in self._ALL_CAPS_LINE.finditer(text):
                candidate = match.group(0).strip()
                words = candidate.split()
                if len(words) >= 2:
                    _add(candidate)
        except Exception as exc:
            logger.warning("NC1.1 all-caps heading regex failed: %s", exc)

        try:
            lines = text.splitlines()
            for i, line in enumerate(lines):
                stripped = line.strip()
                if not stripped:
                    continue
                next_is_blank = (i + 1 < len(lines) and not lines[i + 1].strip())
                prev_is_blank = (i == 0 or not lines[i - 1].strip())
                if next_is_blank and prev_is_blank and 5 <= len(stripped) <= 80:
                    _add(stripped)
        except Exception as exc:
            logger.warning("NC1.1 blank-line heading detection failed: %s", exc)

        return headings[:60]
