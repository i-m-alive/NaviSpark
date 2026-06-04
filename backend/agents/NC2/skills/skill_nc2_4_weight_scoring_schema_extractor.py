"""
Skill NC2.4 — Weight & Scoring Schema Extractor

Extracts weights and scoring schema from the checklist when present. If not
present, assigns equal weights. Determines whether each item is "binary"
(yes/no) or "scored" (numeric scale). Attaches weight and scoring metadata
to every item and every category.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_WEIGHT_HEADER_ALIASES: frozenset[str] = frozenset({
    "weight", "weighting", "importance", "priority", "score weight",
})
_SCORE_HEADER_ALIASES: frozenset[str] = frozenset({
    "score", "points", "max score", "out of", "rating", "max",
})
_SCALE_1_TO_5_RE = re.compile(
    r"(out\s+of\s+5|scale\s+of\s+5|1\s*[-–]\s*5|/\s*5\b)",
    re.IGNORECASE,
)
_SCALE_1_TO_10_RE = re.compile(
    r"(out\s+of\s+10|scale\s+of\s+10|1\s*[-–]\s*10|/\s*10\b)",
    re.IGNORECASE,
)
_SCORE_TEXT_RE = re.compile(r"(rate|score|rating|scale\s+of)", re.IGNORECASE)


class WeightScoringSchemaExtractor:
    """Attaches weight and scoring schema to every item and category.

    Scoring type hierarchy:
      1. Detect from column headers + sample values → scored_1_to_5 / scored_1_to_10
      2. Add "weighted_" prefix if weight column also found
      3. Default to "binary" when no score column present

    Weights:
      - Explicit: parsed from the weight column (normalised to [0, 1] if needed)
      - Equal: 1.0 per item; category weight = 1 / num_categories
    """

    def run(
        self,
        categories: list[dict[str, Any]],
        headers: list[str] | None = None,
    ) -> dict[str, Any]:
        """Extract or assign weights and determine scoring schema.

        Args:
            categories: Category dicts from NC2.3 CategoryGrouper.
            headers: Column headers from the source file (used to detect weight/score columns).

        Returns:
            A dict with keys:
              - scoring_type (str): one of the five allowed scoring type strings.
              - weights_source (str): "explicit" or "equal".
              - categories (list[dict]): categories with "weight" added.
              - items_with_weights (list[dict]): flat item list with "weight" and "scoring".
        """
        logger.info(
            "NC2.4 WeightScoringSchemaExtractor.run() categories=%d headers=%s",
            len(categories), headers,
        )

        normalised_headers = [h.strip().lower() for h in (headers or [])]
        weight_col = self._find_header(normalised_headers, _WEIGHT_HEADER_ALIASES)
        score_col = self._find_header(normalised_headers, _SCORE_HEADER_ALIASES)
        weights_present = weight_col is not None

        all_items: list[dict[str, Any]] = [
            item for cat in categories for item in cat.get("items", [])
        ]

        scoring_type = self._detect_scoring_type(
            score_col, all_items, weights_present
        )

        if weights_present:
            weights_source = "explicit"
            all_items = self._extract_explicit_weights(all_items, weight_col, headers or [])
        else:
            weights_source = "equal"
            for item in all_items:
                item["weight"] = 1.0

        for item in all_items:
            item["scoring"] = self._detect_item_scoring(item, scoring_type)

        num_cats = len(categories)
        category_weight = round(1.0 / num_cats, 4) if num_cats > 1 else 1.0

        item_lookup: dict[str, dict] = {item["id"]: item for item in all_items}
        for cat in categories:
            cat["weight"] = category_weight
            cat["items"] = [
                item_lookup.get(item["id"], item) for item in cat.get("items", [])
            ]

        logger.info(
            "NC2.4 complete. scoring_type=%s weights_source=%s category_weight=%.4f",
            scoring_type, weights_source, category_weight,
        )

        return {
            "scoring_type": scoring_type,
            "weights_source": weights_source,
            "categories": categories,
            "items_with_weights": all_items,
        }

    def _find_header(
        self,
        normalised_headers: list[str],
        aliases: frozenset[str],
    ) -> str | None:
        """Return the first normalised header that matches an alias set.

        Args:
            normalised_headers: Lowercased header strings.
            aliases: Set of alias strings to match against.

        Returns:
            Matched header string, or None.
        """
        for h in normalised_headers:
            if h in aliases:
                return h
        return None

    def _detect_scoring_type(
        self,
        score_col: str | None,
        items: list[dict[str, Any]],
        weights_present: bool,
    ) -> str:
        """Determine the global scoring type from available evidence.

        Args:
            score_col: Normalised score header name, or None.
            items: All structured items (used to sample score values).
            weights_present: Whether a weight column was found.

        Returns:
            One of the five scoring type strings.
        """
        if score_col is None:
            return "binary"

        sample_values: list[str] = []
        for item in items[:20]:
            raw_fields = item.get("_raw_fields", {})
            for k, v in raw_fields.items():
                if k.strip().lower() in _SCORE_HEADER_ALIASES and v:
                    sample_values.append(v.strip().lower())

        binary_values = {"0", "1", "yes", "no", "pass", "fail", "y", "n"}
        if sample_values and all(v in binary_values for v in sample_values):
            return "binary"

        max_val = 0.0
        for v in sample_values:
            try:
                n = float(re.sub(r"[^\d.]", "", v))
                max_val = max(max_val, n)
            except (ValueError, TypeError):
                pass

        if max_val > 5.0:
            return "weighted_1_to_10" if weights_present else "scored_1_to_10"
        if max_val > 1.0:
            return "weighted_1_to_5" if weights_present else "scored_1_to_5"

        return "binary"

    def _extract_explicit_weights(
        self,
        items: list[dict[str, Any]],
        weight_col: str | None,
        headers: list[str],
    ) -> list[dict[str, Any]]:
        """Parse weight values from item raw fields.

        Args:
            items: Structured items.
            weight_col: Normalised weight column name.
            headers: Original (non-normalised) header strings.

        Returns:
            Items with "weight" key set.
        """
        original_weight_header: str | None = None
        if weight_col and headers:
            for h in headers:
                if h.strip().lower() == weight_col:
                    original_weight_header = h
                    break

        raw_values: list[float] = []
        for item in items:
            raw = None
            raw_fields = item.get("_raw_fields", {})
            if original_weight_header and original_weight_header in raw_fields:
                raw = raw_fields[original_weight_header]
            elif weight_col:
                for k, v in raw_fields.items():
                    if k.strip().lower() == weight_col:
                        raw = v
                        break

            try:
                val = float(re.sub(r"[^\d.]", "", raw or ""))
                raw_values.append(val)
                item["weight"] = val
            except (ValueError, TypeError):
                item["weight"] = 1.0

        if raw_values and max(raw_values, default=1.0) > 1.0:
            max_w = max(raw_values)
            for item in items:
                try:
                    item["weight"] = round(item["weight"] / max_w, 4)
                except (ZeroDivisionError, TypeError):
                    item["weight"] = 1.0

        return items

    def _detect_item_scoring(self, item: dict[str, Any], global_type: str) -> str:
        """Determine the scoring type for an individual item.

        Args:
            item: Structured item dict.
            global_type: Global scoring type from step 1.

        Returns:
            Item-level scoring type string.
        """
        text = (item.get("text", "") + " " + (item.get("pass_condition") or "")).lower()

        try:
            if _SCALE_1_TO_10_RE.search(text):
                return "scored_1_to_10"
            if _SCALE_1_TO_5_RE.search(text):
                return "scored_1_to_5"
            if _SCORE_TEXT_RE.search(text):
                return global_type if "scored" in global_type or "weighted" in global_type else "scored_1_to_5"
        except re.error as exc:
            logger.warning("NC2.4 item scoring regex error: %s", exc)

        return global_type
