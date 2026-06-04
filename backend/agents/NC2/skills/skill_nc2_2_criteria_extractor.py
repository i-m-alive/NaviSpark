"""
Skill NC2.2 — Criteria Extractor

Takes the raw_rows list from NC2.1 and converts each row into a fully structured
checklist item with all required fields. This is where unstructured checklist text
becomes machine-readable evaluation criteria.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_ID_RE = re.compile(r"^\w{1,5}-\d+$")

_TEXT_ALIASES: frozenset[str] = frozenset({
    "item", "criterion", "criteria", "question", "requirement",
    "check", "checklist item",
})
_DESCRIPTION_ALIASES: frozenset[str] = frozenset({
    "description", "detail", "notes", "context", "additional info",
})
_EVIDENCE_ALIASES: frozenset[str] = frozenset({
    "evidence", "required evidence", "proof", "example", "examples",
})
_PASS_ALIASES: frozenset[str] = frozenset({
    "pass condition", "pass", "criteria", "threshold", "benchmark",
})
_ALL_KNOWN_ALIASES: frozenset[str] = (
    _TEXT_ALIASES | _DESCRIPTION_ALIASES | _EVIDENCE_ALIASES | _PASS_ALIASES
    | frozenset({"id", "category", "weight", "score", "section", "group",
                 "priority", "no", "no.", "#", "ref"})
)


class CriteriaExtractor:
    """Converts raw parsed rows into structured checklist item dicts.

    Each output item has a guaranteed ``id``, ``text``, and ``raw_source``.
    Optional fields (description, required_evidence, pass_condition) are None
    when not found — never empty string.

    Items are filtered to remove header-like rows, empty rows, and section
    headings that carry no evaluable criterion.
    """

    def run(
        self,
        raw_rows: list[dict[str, Any]],
        headers: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Convert raw_rows into structured checklist items.

        Args:
            raw_rows: List of row dicts produced by NC2.1 FormatDetectorParser.
            headers: Optional list of column header strings from the source file.

        Returns:
            List of structured item dicts with keys: id, text, description,
            required_evidence, pass_condition, raw_source, and optionally
            _raw_fields for weight/scoring extraction by NC2.4.
        """
        logger.info(
            "NC2.2 CriteriaExtractor.run() raw_rows=%d headers=%s",
            len(raw_rows), headers,
        )

        field_map = self._build_field_map(headers or [])
        has_text_col = "text" in field_map
        has_desc_col = "description" in field_map

        if not has_text_col and headers:
            desc_norm = {h.strip().lower() for h in headers}
            if "description" in desc_norm:
                for h in (headers or []):
                    if h.strip().lower() == "description":
                        field_map["text"] = h
                        break

        items: list[dict[str, Any]] = []
        item_counter = 0
        skipped = 0

        for row in raw_rows:
            raw_text: str = row.get("raw_text", "").strip()
            fields: dict[str, str] = row.get("fields", {})
            source: str = row.get("source", "")

            if not raw_text:
                logger.debug("NC2.2 skip empty raw_text at %s", source)
                skipped += 1
                continue

            if self._is_header_row(raw_text, headers):
                logger.debug("NC2.2 skip header row at %s: %r", source, raw_text[:60])
                skipped += 1
                continue

            text_value = self._resolve_field("text", field_map, fields, raw_text)

            if self._is_section_heading(text_value):
                logger.debug("NC2.2 skip section heading at %s: %r", source, text_value[:60])
                skipped += 1
                continue

            if not text_value:
                logger.debug("NC2.2 skip empty text at %s", source)
                skipped += 1
                continue

            auto_id = self._detect_id(fields, raw_text)
            item_counter += 1
            item_id = auto_id if auto_id else f"ITEM-{item_counter:03d}"

            description = self._resolve_field("description", field_map, fields, None)
            if description == text_value:
                description = None

            required_evidence = self._resolve_field("required_evidence", field_map, fields, None)
            pass_condition = self._resolve_field("pass_condition", field_map, fields, None)

            items.append({
                "id": item_id,
                "text": text_value,
                "description": description if description else None,
                "required_evidence": required_evidence if required_evidence else None,
                "pass_condition": pass_condition if pass_condition else None,
                "raw_source": source,
                "_raw_fields": fields,
            })

        logger.info(
            "NC2.2 complete. received=%d extracted=%d skipped=%d",
            len(raw_rows), len(items), skipped,
        )
        return items

    def _build_field_map(self, headers: list[str]) -> dict[str, str]:
        """Build a mapping from logical field name → original header string.

        Args:
            headers: Column header strings from the source file.

        Returns:
            Dict mapping "text", "description", "required_evidence",
            "pass_condition" to the matching header string (if found).
        """
        field_map: dict[str, str] = {}
        normalised = [(h, h.strip().lower()) for h in headers]

        has_desc_col = any(n in _DESCRIPTION_ALIASES for _, n in normalised)

        for original, norm in normalised:
            if "text" not in field_map:
                if norm in _TEXT_ALIASES:
                    field_map["text"] = original
                elif not has_desc_col and norm in _DESCRIPTION_ALIASES:
                    field_map["text"] = original

            if "description" not in field_map and norm in _DESCRIPTION_ALIASES:
                field_map["description"] = original

            if "required_evidence" not in field_map and norm in _EVIDENCE_ALIASES:
                field_map["required_evidence"] = original

            if "pass_condition" not in field_map and norm in _PASS_ALIASES:
                field_map["pass_condition"] = original

        return field_map

    def _resolve_field(
        self,
        logical: str,
        field_map: dict[str, str],
        fields: dict[str, str],
        fallback: str | None,
    ) -> str | None:
        """Retrieve a field value using the field_map or fall back to a default.

        Args:
            logical: Logical field name ("text", "description", etc.).
            field_map: Mapping of logical field → header string.
            fields: Actual row key-value dict from NC2.1.
            fallback: Value to return if no mapping or empty value found.

        Returns:
            Stripped field value, or fallback if not found.
        """
        header = field_map.get(logical)
        if header and header in fields:
            value = fields[header].strip()
            return value if value else fallback
        return fallback

    def _detect_id(self, fields: dict[str, str], raw_text: str) -> str | None:
        """Search for a cell matching the item ID pattern (e.g. T-01, C-003).

        Args:
            fields: Original row field dict.
            raw_text: Full concatenated row text.

        Returns:
            The detected ID string, or None if no match found.
        """
        for value in fields.values():
            v = value.strip()
            if _ID_RE.match(v):
                return v

        parts = raw_text.split("|")
        for part in parts:
            part = part.strip()
            if _ID_RE.match(part):
                return part

        return None

    def _is_header_row(self, raw_text: str, headers: list[str] | None) -> bool:
        """Check if a row appears to be a re-occurrence of the header row.

        Args:
            raw_text: The row's concatenated text.
            headers: Known header strings.

        Returns:
            True if the row looks like a header repetition.
        """
        if not headers:
            return False
        words = [w.strip().lower() for w in raw_text.split("|")]
        matched = sum(
            1 for w in words if w in _ALL_KNOWN_ALIASES
        )
        return matched >= max(2, len(words) - 1)

    def _is_section_heading(self, text: str) -> bool:
        """Check if a text value is a section heading rather than a criterion.

        Section headings have fewer than 8 words AND contain no question mark
        AND no recognised verb form.

        Args:
            text: The candidate text.

        Returns:
            True if the text is a section heading and should be skipped.
        """
        words = text.split()
        if len(words) >= 8:
            return False
        if "?" in text:
            return False
        verb_indicators = (
            "is", "are", "has", "have", "does", "do", "will", "can",
            "should", "must", "include", "contain", "provide", "demonstrate",
            "show", "state", "describe", "define", "list", "confirm",
        )
        text_lower = text.lower()
        if any(f" {v} " in f" {text_lower} " for v in verb_indicators):
            return False
        return True
