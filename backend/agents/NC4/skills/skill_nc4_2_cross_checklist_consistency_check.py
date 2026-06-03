"""
Skill NC4.2 — Cross-Checklist Consistency Check

Scans evidence and gap text across ALL NC3 findings from ALL categories looking
for numerical contradictions and factual inconsistencies. Flags contradictions
as consistency warnings — these appear in the final report but do not affect scores.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_CONTEXTUAL_NOUNS: frozenset[str] = frozenset({
    # Only QUANTITATIVE HEADCOUNT nouns — things where different numbers across
    # categories represent a genuine contradiction (e.g. team size stated as 8
    # in one section and 15 in another).
    "developer", "consultant", "fte", "resource", "staff",
    "team", "member", "engineer", "manager",
    # Intentionally excluded:
    #   "page", "slide"  — document location references in evidence citations
    #   "week", "month", "year", "day"  — timeline references and scores appear
    #       constantly in evidence (e.g. "14-week proposal", "score 2.35", "Week 4")
    #       and produce meaningless cross-category false positives
    #   "million", "thousand"  — currency/budget figures need fuller context than
    #       a ±5-word window can supply
})

_SCOPE_KEY_NOUNS: frozenset[str] = frozenset({
    "architecture", "diagram", "timeline", "schedule", "budget", "pricing",
    "team", "cv", "risk", "compliance", "sla", "methodology", "plan",
    "roadmap", "integration",
})

_NUMBER_RE = re.compile(r"\b(\d+(?:\.\d+)?)\b")
_DURATION_RE = re.compile(r"(\d+)\s*(months?|weeks?|years?)", re.IGNORECASE)
_BUDGET_RE = re.compile(r"[$€£¥][\d,\.]+[KMBkmb]?", re.IGNORECASE)
_MAX_WARNINGS = 10


class CrossChecklistConsistencyCheck:
    """Detects numerical, metadata, and scope contradictions across NC3 findings.

    Three check types are performed:
      1. Numerical contradictions — same contextual noun with different numbers.
      2. Metadata mismatch — NC3 evidence contradicts NC1 auto-detected values.
      3. Scope contradictions — PASS evidence vs FAIL gap text in other categories.

    Warnings are capped at 10, prioritising numerical > metadata > scope.
    """

    def run(
        self,
        nc3_results: list[dict[str, Any]],
        nc1_output: dict[str, Any],
    ) -> dict[str, Any]:
        """Scan all NC3 findings for consistency issues.

        Args:
            nc3_results: Full NC3 results list.
            nc1_output: NC1 output — used to cross-check NC1 metadata.

        Returns:
            A dict with keys: consistency_warnings, warnings_count, clean.
        """
        logger.debug("NC4.2 CrossChecklistConsistencyCheck.run()")

        all_findings: list[tuple[str, str, dict[str, Any]]] = []
        for result in nc3_results:
            if result.get("status") != "complete":
                continue
            cat_name = result.get("category_name", "unknown")
            for f in result.get("findings", []):
                all_findings.append((cat_name, result.get("category_id", ""), f))

        warnings: list[dict[str, Any]] = []
        counter = [0]

        def _add(w: dict[str, Any]) -> None:
            counter[0] += 1
            w["warning_id"] = f"CW-{counter[0]:03d}"
            warnings.append(w)

        numerical = self._check_numerical_contradictions(all_findings)
        for w in numerical:
            if len(warnings) >= _MAX_WARNINGS:
                break
            _add(w)

        nc1_auto = nc1_output.get("auto_detected", {})
        meta = self._check_metadata_mismatches(all_findings, nc1_auto)
        for w in meta:
            if len(warnings) >= _MAX_WARNINGS:
                break
            _add(w)

        scope = self._check_scope_contradictions(all_findings)
        for w in scope:
            if len(warnings) >= _MAX_WARNINGS:
                break
            _add(w)

        logger.info("NC4.2 complete. consistency_warnings=%d", len(warnings))

        return {
            "consistency_warnings": warnings,
            "warnings_count": len(warnings),
            "clean": len(warnings) == 0,
        }

    def _extract_number_contexts(
        self,
        all_findings: list[tuple[str, str, dict[str, Any]]],
    ) -> list[tuple[float, list[str], str, str]]:
        """Extract (number, context_words, category_name, item_id) tuples from evidence.

        Args:
            all_findings: List of (category_name, category_id, finding_dict).

        Returns:
            List of (number, context_words, category_name, item_id) tuples.
        """
        result: list[tuple[float, list[str], str, str]] = []
        for cat_name, _, finding in all_findings:
            evidence = finding.get("evidence") or ""
            if not evidence:
                continue
            item_id = finding.get("item_id", "?")
            words = evidence.split()
            for m in _NUMBER_RE.finditer(evidence):
                try:
                    num = float(m.group(1))
                except ValueError:
                    continue
                word_pos = len(evidence[: m.start()].split())
                ctx_start = max(0, word_pos - 5)
                ctx_end = min(len(words), word_pos + 6)
                ctx_words = words[ctx_start:ctx_end]
                result.append((num, ctx_words, cat_name, item_id))
        return result

    def _check_numerical_contradictions(
        self,
        all_findings: list[tuple[str, str, dict[str, Any]]],
    ) -> list[dict[str, Any]]:
        """Find cases where the same contextual noun appears with different numbers.

        Args:
            all_findings: List of (category_name, category_id, finding_dict).

        Returns:
            List of numerical_contradiction warning dicts (without warning_id).
        """
        contexts = self._extract_number_contexts(all_findings)
        warnings: list[dict[str, Any]] = []
        seen_pairs:   set[tuple] = set()   # item-level dedup (same pair never twice)
        seen_desc:    set[str]  = set()   # description-level dedup (same text never twice)
        seen_val_cat: set[tuple]= set()   # (cat_pair, val_pair) dedup — same numbers across
                                          # same category pair only reported once

        for i, (num_a, ctx_a, cat_a, item_a) in enumerate(contexts):
            nouns_a = {w.lower().rstrip("s") for w in ctx_a} & _CONTEXTUAL_NOUNS
            for j in range(i + 1, len(contexts)):
                num_b, ctx_b, cat_b, item_b = contexts[j]
                if cat_a == cat_b or num_a == num_b:
                    continue
                # Skip clearly non-meaningful values: decimal scores, very small numbers
                if num_a < 2 or num_b < 2:
                    continue
                if num_a != int(num_a) and num_b != int(num_b):
                    continue  # both decimal — likely scores, not counts
                nouns_b = {w.lower().rstrip("s") for w in ctx_b} & _CONTEXTUAL_NOUNS
                common = nouns_a & nouns_b
                if not common:
                    continue
                pair_key = tuple(sorted([
                    f"{cat_a}:{item_a}:{num_a}",
                    f"{cat_b}:{item_b}:{num_b}",
                ]))
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)
                noun = next(iter(common))
                val_a = int(num_a) if num_a == int(num_a) else num_a
                val_b = int(num_b) if num_b == int(num_b) else num_b
                description = (
                    f"Different {noun} counts appear in evidence: {val_a} vs {val_b}."
                )
                # Skip if we've already shown this exact description
                if description in seen_desc:
                    continue
                seen_desc.add(description)
                # Also skip if same (category-pair, value-pair) was already reported
                # under a different noun label — avoids "15 vs 8 developer" + "15 vs 8 team"
                cat_val_key = tuple(sorted([cat_a, cat_b])) + tuple(sorted([val_a, val_b]))
                if cat_val_key in seen_val_cat:
                    continue
                seen_val_cat.add(cat_val_key)
                warnings.append({
                    "type": "numerical_contradiction",
                    "description": description,
                    "category_a": cat_a,
                    "category_b": cat_b,
                    "item_a": item_a,
                    "item_b": item_b,
                    "value_a": f"{val_a} (near '{noun}')",
                    "value_b": f"{val_b} (near '{noun}')",
                })
                if len(warnings) >= _MAX_WARNINGS:
                    break
            if len(warnings) >= _MAX_WARNINGS:
                break

        return warnings

    def _check_metadata_mismatches(
        self,
        all_findings: list[tuple[str, str, dict[str, Any]]],
        nc1_auto: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Compare NC3 evidence against NC1 auto-detected metadata.

        Args:
            all_findings: List of (category_name, category_id, finding_dict).
            nc1_auto: NC1 auto_detected dict.

        Returns:
            List of metadata_mismatch warning dicts (without warning_id).
        """
        warnings: list[dict[str, Any]] = []
        nc1_team = nc1_auto.get("team_size")
        nc1_timeline = nc1_auto.get("proposed_timeline") or ""

        nc1_duration_months: float | None = None
        if nc1_timeline:
            m = re.search(r"(\d+)\s*(month|week|year)", nc1_timeline, re.IGNORECASE)
            if m:
                qty = float(m.group(1))
                unit = m.group(2).lower()
                nc1_duration_months = qty if "month" in unit else (qty / 4.0 if "week" in unit else qty * 12.0)

        for cat_name, _, finding in all_findings:
            evidence = (finding.get("evidence") or "").lower()
            if not evidence:
                continue
            item_id = finding.get("item_id", "?")

            if nc1_team is not None:
                for m in _NUMBER_RE.finditer(evidence):
                    try:
                        n = float(m.group(1))
                    except ValueError:
                        continue
                    if abs(n - nc1_team) > 2 and 2 <= n <= 500:
                        ctx_words = evidence[max(0, m.start() - 30): m.end() + 30]
                        if any(noun in ctx_words for noun in ("team", "fte", "staff", "consultant", "developer", "engineer", "resource")):
                            warnings.append({
                                "type": "metadata_mismatch",
                                "description": (
                                    f"Evidence references {int(n)} people but NC1 detected team_size={nc1_team}."
                                ),
                                "category_a": cat_name,
                                "category_b": "NC1",
                                "item_a": item_id,
                                "item_b": "team_size",
                                "value_a": str(int(n)),
                                "value_b": str(nc1_team),
                            })
                            break

            if nc1_duration_months is not None:
                for dm in _DURATION_RE.finditer(evidence):
                    qty = float(dm.group(1))
                    unit = dm.group(2).lower()
                    months = qty if "month" in unit else (qty / 4.0 if "week" in unit else qty * 12.0)
                    if nc1_duration_months > 0 and abs(months - nc1_duration_months) / nc1_duration_months > 0.20:
                        warnings.append({
                            "type": "metadata_mismatch",
                            "description": (
                                f"Evidence timeline ({int(qty)} {unit}) differs from NC1 timeline '{nc1_auto.get('proposed_timeline')}' by >20%."
                            ),
                            "category_a": cat_name,
                            "category_b": "NC1",
                            "item_a": item_id,
                            "item_b": "proposed_timeline",
                            "value_a": f"{int(qty)} {unit}",
                            "value_b": nc1_auto.get("proposed_timeline", ""),
                        })
                        break

        return warnings[:_MAX_WARNINGS]

    def _check_scope_contradictions(
        self,
        all_findings: list[tuple[str, str, dict[str, Any]]],
    ) -> list[dict[str, Any]]:
        """Find PASS evidence that contradicts FAIL/PARTIAL gaps in other categories.

        Args:
            all_findings: List of (category_name, category_id, finding_dict).

        Returns:
            List of scope_contradiction warning dicts (without warning_id).
        """
        warnings: list[dict[str, Any]] = []

        pass_evidence: list[tuple[str, str, str]] = [
            (cat_name, f.get("item_id", "?"), (f.get("evidence") or "").lower())
            for cat_name, _, f in all_findings
            if f.get("status") == "PASS" and f.get("evidence")
        ]

        fail_gaps: list[tuple[str, str, str]] = [
            (cat_name, f.get("item_id", "?"), (f.get("gap") or "").lower())
            for cat_name, _, f in all_findings
            if f.get("status") in ("FAIL", "PARTIAL") and f.get("gap")
        ]

        seen: set[tuple[str, str]] = set()

        for ev_cat, ev_item, ev_text in pass_evidence:
            ev_nouns = {w for w in ev_text.split() if w in _SCOPE_KEY_NOUNS}
            for gap_cat, gap_item, gap_text in fail_gaps:
                if ev_cat == gap_cat:
                    continue
                for noun in ev_nouns:
                    if (f"no {noun}" in gap_text or f"missing {noun}" in gap_text or
                            f"no {noun}s" in gap_text):
                        key = (ev_cat + ev_item, gap_cat + gap_item + noun)
                        if key in seen:
                            continue
                        seen.add(key)
                        warnings.append({
                            "type": "scope_contradiction",
                            "description": (
                                f"'{ev_cat}' has PASS evidence mentioning '{noun}' "
                                f"but '{gap_cat}' gap indicates it is missing."
                            ),
                            "category_a": ev_cat,
                            "category_b": gap_cat,
                            "item_a": ev_item,
                            "item_b": gap_item,
                            "value_a": f"PASS: evidence mentions '{noun}'",
                            "value_b": f"FAIL/PARTIAL: gap indicates missing '{noun}'",
                        })
                        if len(warnings) >= _MAX_WARNINGS:
                            return warnings

        return warnings
