"""
Skill NC2.3 — Category Grouper

Takes the flat list of structured items from NC2.2 and groups them into logical
evaluation categories. These category groups directly determine the NC3 fan-out
count — one NC3 instance per category.

If the checklist has explicit category headers in the raw source, those are used.
If not, items are clustered by keyword-based semantic similarity.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_KNOWN_CATEGORY_KEYWORDS: frozenset[str] = frozenset({
    "technical", "commercial", "team", "legal", "compliance", "financial",
    "management", "risk", "quality", "delivery", "approach", "resources",
    "experience", "methodology", "pricing", "innovation", "security",
    "infrastructure", "integration", "support",
})

_INFERRED_CATEGORIES: list[tuple[str, list[str]]] = [
    ("Technical Approach", [
        "technical", "architecture", "solution", "infrastructure", "technology",
        "platform", "integration", "api", "system", "software", "hardware",
        "security", "data", "cloud", "devops",
    ]),
    ("Commercial", [
        "price", "cost", "budget", "commercial", "fee", "payment", "invoice",
        "contract", "financial", "investment", "rate", "discount", "penalty",
        "incentive",
    ]),
    ("Team & Resources", [
        "team", "staff", "resource", "consultant", "cv", "biography",
        "experience", "qualification", "certification", "personnel", "headcount",
        "fte", "developer", "engineer", "manager",
    ]),
    ("Legal & Compliance", [
        "legal", "compliance", "regulation", "gdpr", "iso", "standard", "audit",
        "liability", "indemnity", "insurance", "warranty", "sla", "contract",
        "term", "condition", "law",
    ]),
    ("Delivery & Timeline", [
        "timeline", "schedule", "milestone", "delivery", "deadline", "gantt",
        "phase", "sprint", "release", "plan", "roadmap", "date", "duration",
        "week", "month",
    ]),
    ("Risk Management", [
        "risk", "mitigation", "contingency", "issue", "dependency", "assumption",
        "constraint", "failure", "recovery", "backup", "disaster", "resilience",
    ]),
    ("Management Approach", [
        "management", "governance", "steering", "reporting", "communication",
        "escalation", "change management", "project manager", "pmo",
        "methodology", "agile", "waterfall", "prince2",
    ]),
]

_EXPLICIT_HEADING_RE = re.compile(r"^[A-Z][A-Za-z0-9 &/\-]{0,40}$")


def _make_slug(name: str) -> str:
    """Convert a category name to a lowercase underscored slug.

    Args:
        name: Human-readable category name.

    Returns:
        Slug string suitable for use as a dict key.
    """
    return re.sub(r"\W+", "_", name.lower()).strip("_")


class CategoryGrouper:
    """Groups structured checklist items into logical evaluation categories.

    Two modes:
      - Explicit: source file contained section-header rows or a "Category" column.
      - Inferred: keyword matching against 7 predefined category templates.

    A fallback "General" category catches anything that doesn't fit.
    """

    def run(
        self,
        items: list[dict[str, Any]],
        raw_rows: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Group items into evaluation categories.

        Args:
            items: Structured item dicts from NC2.2 CriteriaExtractor.
            raw_rows: Original raw_rows from NC2.1 (used for section header detection).

        Returns:
            List of category dicts, each with:
              id, name, item_count, items, source.
        """
        logger.info("NC2.3 CategoryGrouper.run() items=%d", len(items))

        if not items:
            return [{
                "id": "cat_general",
                "name": "General",
                "item_count": 0,
                "items": [],
                "source": "fallback",
            }]

        column_categories = self._detect_column_categories(items)
        if column_categories:
            result = self._build_from_column(items, column_categories)
            logger.info("NC2.3 used column-based explicit categories: %d", len(result))
            return result

        explicit_headers = self._detect_section_headers(raw_rows)
        if len(explicit_headers) >= 2:
            result = self._build_from_headers(items, raw_rows, explicit_headers)
            logger.info("NC2.3 used explicit section headers: %d categories", len(result))
            return result

        result = self._infer_categories(items)
        logger.info("NC2.3 used keyword inference: %d categories", len(result))
        return result

    def _detect_column_categories(self, items: list[dict[str, Any]]) -> list[str] | None:
        """Detect if items have a "Category" or "Section" raw field that can be used.

        Args:
            items: Structured item dicts.

        Returns:
            List of distinct category values if found and non-trivial; None otherwise.
        """
        category_field: str | None = None
        for candidate in ("Category", "category", "Section", "section", "Group", "group"):
            if any(candidate in item.get("_raw_fields", {}) for item in items):
                category_field = candidate
                break

        if not category_field:
            return None

        values: set[str] = set()
        for item in items:
            v = item.get("_raw_fields", {}).get(category_field, "").strip()
            if v:
                values.add(v)

        if len(values) >= 2:
            return sorted(values)
        return None

    def _build_from_column(
        self,
        items: list[dict[str, Any]],
        categories: list[str],
    ) -> list[dict[str, Any]]:
        """Build category groups from a dedicated Category column in item fields.

        Args:
            items: Structured item dicts.
            categories: Distinct category name strings.

        Returns:
            List of category dicts.
        """
        buckets: dict[str, list[dict]] = {c: [] for c in categories}
        uncategorised: list[dict] = []

        for item in items:
            found = False
            for candidate in ("Category", "category", "Section", "section", "Group", "group"):
                v = item.get("_raw_fields", {}).get(candidate, "").strip()
                if v and v in buckets:
                    buckets[v].append(item)
                    found = True
                    break
            if not found:
                uncategorised.append(item)

        if uncategorised:
            buckets.setdefault("General", []).extend(uncategorised)

        result: list[dict[str, Any]] = []
        for name, bucket_items in buckets.items():
            if not bucket_items:
                continue
            result.append({
                "id": f"cat_{_make_slug(name)}",
                "name": name,
                "item_count": len(bucket_items),
                "items": bucket_items,
                "source": "explicit",
            })

        logger.debug("NC2.3 column-based: %s", [(c["name"], c["item_count"]) for c in result])
        return result

    def _detect_section_headers(
        self, raw_rows: list[dict[str, Any]]
    ) -> list[tuple[int, str]]:
        """Scan raw_rows for rows that look like section/category headers.

        Args:
            raw_rows: Raw row dicts from NC2.1.

        Returns:
            List of (row_index, header_text) tuples for detected headers.
        """
        headers: list[tuple[int, str]] = []
        for row in raw_rows:
            raw_text = row.get("raw_text", "").strip()
            if not raw_text or "|" in raw_text or "?" in raw_text:
                continue
            words = raw_text.split()
            if not (1 <= len(words) <= 6):
                continue
            is_upper = raw_text.isupper()
            is_title = raw_text.istitle()
            is_keyword = any(w.lower() in _KNOWN_CATEGORY_KEYWORDS for w in words)
            if is_upper or is_title or is_keyword:
                headers.append((row.get("row_index", 0), raw_text))
        return headers

    def _build_from_headers(
        self,
        items: list[dict[str, Any]],
        raw_rows: list[dict[str, Any]],
        explicit_headers: list[tuple[int, str]],
    ) -> list[dict[str, Any]]:
        """Assign items to the nearest preceding section header.

        Args:
            items: Structured item dicts.
            raw_rows: Original raw_rows from NC2.1.
            explicit_headers: List of (row_index, header_text) tuples.

        Returns:
            List of category dicts.
        """
        source_order: dict[str, int] = {
            row["source"]: row.get("row_index", idx)
            for idx, row in enumerate(raw_rows)
        }
        header_indices = [(idx, name) for idx, name in explicit_headers]

        buckets: dict[str, list[dict]] = {name: [] for _, name in header_indices}
        buckets["Uncategorised"] = []

        for item in items:
            item_idx = source_order.get(item.get("raw_source", ""), -1)
            assigned = "Uncategorised"
            best_header_idx = -1
            for h_idx, h_name in header_indices:
                if h_idx <= item_idx and h_idx > best_header_idx:
                    best_header_idx = h_idx
                    assigned = h_name
            buckets[assigned].append(item)

        result: list[dict[str, Any]] = []
        for name, bucket_items in buckets.items():
            if not bucket_items:
                continue
            result.append({
                "id": f"cat_{_make_slug(name)}",
                "name": name,
                "item_count": len(bucket_items),
                "items": bucket_items,
                "source": "explicit",
            })
        return result

    def _infer_categories(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Group items by keyword matching against predefined category templates.

        Items that match no category go to "General". If all end up in General,
        split into numbered sections of max 10 items.

        Args:
            items: Structured item dicts.

        Returns:
            List of category dicts.
        """
        buckets: dict[str, list[dict]] = {name: [] for name, _ in _INFERRED_CATEGORIES}
        buckets["General"] = []

        for item in items:
            text_lower = (item.get("text", "") + " " + (item.get("description") or "")).lower()
            assigned = False
            for cat_name, keywords in _INFERRED_CATEGORIES:
                if any(kw in text_lower for kw in keywords):
                    buckets[cat_name].append(item)
                    assigned = True
                    break
            if not assigned:
                buckets["General"].append(item)

        result: list[dict[str, Any]] = []
        for name, bucket_items in buckets.items():
            if not bucket_items:
                continue
            result.append({
                "id": f"cat_{_make_slug(name)}",
                "name": name,
                "item_count": len(bucket_items),
                "items": bucket_items,
                "source": "inferred",
            })

        if len(result) == 1 and result[0]["name"] == "General":
            all_items = result[0]["items"]
            result = []
            chunk_size = 10
            for section_idx, start in enumerate(range(0, len(all_items), chunk_size), start=1):
                chunk = all_items[start: start + chunk_size]
                name = f"Section {section_idx}"
                result.append({
                    "id": f"cat_section_{section_idx}",
                    "name": name,
                    "item_count": len(chunk),
                    "items": chunk,
                    "source": "inferred",
                })

        for cat in result:
            logger.debug("NC2.3 category '%s': %d items", cat["name"], cat["item_count"])

        return result
