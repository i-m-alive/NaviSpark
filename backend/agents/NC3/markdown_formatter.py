"""
NC3 Markdown Formatter

Converts the NC3 fan-out results list into a human-readable Markdown report.
Used for logging, debugging, and the CategoryScoreCard frontend component.
"""

from __future__ import annotations

from typing import Any


def format_nc3_output(nc3_results: list[dict[str, Any]]) -> str:
    """Convert NC3 fan-out results into a formatted Markdown report.

    Args:
        nc3_results: The list returned by run_nc3_fanout() — one dict per category.

    Returns:
        A Markdown-formatted string suitable for display or logging.
    """
    lines: list[str] = []

    lines.append("# NC3 — Proposal Evaluator Report")
    lines.append("")

    # --- Fan-Out Summary table ---
    lines.append("## Fan-Out Summary")
    lines.append("")
    lines.append("| Category | Status | Score | Max | Pass | Partial | Fail |")
    lines.append("|---|---|---|---|---|---|---|")

    error_count = 0
    for result in nc3_results:
        status = result.get("status", "error")
        if status == "error":
            error_count += 1
        lines.append(
            f"| {result.get('category_name', '?')} "
            f"| {status} "
            f"| {result.get('score', 0.0)} "
            f"| {result.get('max_score', 0.0)} "
            f"| {result.get('items_passed', 0)} "
            f"| {result.get('items_partial', 0)} "
            f"| {result.get('items_failed', 0)} |"
        )

    lines.append("")
    lines.append(
        f"**Total categories evaluated:** {len(nc3_results)} "
        f"| **Errors:** {error_count}"
    )
    lines.append("")

    # --- Per-category detail ---
    all_gaps: list[dict[str, Any]] = []

    for result in nc3_results:
        cat_name = result.get("category_name", "Unknown")
        status = result.get("status", "error")
        score = result.get("score", 0.0)
        max_score = result.get("max_score", 0.0)
        items_evaluated = result.get("items_evaluated", 0)
        items_passed = result.get("items_passed", 0)
        items_partial = result.get("items_partial", 0)
        items_failed = result.get("items_failed", 0)

        lines.append(f"## Category: {cat_name}")
        lines.append("")
        lines.append(
            f"**Status:** {status}  |  **Score:** {score} / {max_score}"
        )
        lines.append(
            f"**Items:** {items_evaluated} evaluated — "
            f"{items_passed} PASS, {items_partial} PARTIAL, {items_failed} FAIL"
        )
        lines.append("")

        if status == "error":
            error_msg = result.get("error_message", "Unknown error")
            lines.append(
                f"> ⚠️ **Evaluation Error:** {error_msg}"
            )
            lines.append(
                "> This category will be marked as \"evaluation error\" "
                "in the final NC4 report."
            )
            lines.append("")
            continue

        findings: list[dict[str, Any]] = result.get("findings", [])
        if findings:
            score_meta_sample = findings[0].get("score_meta", {})
            max_per_item = score_meta_sample.get("max_score", 1.0)

            lines.append("| Item ID | Status | Score | Evidence | Gap |")
            lines.append("|---|---|---|---|---|")

            for f in findings:
                item_id = f.get("item_id", "?")
                f_status = f.get("status", "?")
                f_score = f.get("score", 0.0)
                evidence = f.get("evidence") or "—"
                gap = f.get("gap") or "—"

                if len(evidence) > 60:
                    evidence = evidence[:57] + "..."
                if len(gap) > 80:
                    gap = gap[:77] + "..."

                lines.append(
                    f"| {item_id} | {f_status} | {f_score}/{max_per_item} "
                    f"| {evidence} | {gap} |"
                )

                gap_structured = f.get("gap_structured")
                if gap_structured:
                    all_gaps.append(gap_structured)

        lines.append("")

    # --- Gap Summary ---
    lines.append("## Gap Summary — Action Items")
    lines.append("")

    must_fix = [g for g in all_gaps if g.get("action_tier") == "must_fix"]
    should_fix = [g for g in all_gaps if g.get("action_tier") == "should_fix"]
    next_time = [g for g in all_gaps if g.get("action_tier") == "next_time"]

    lines.append("### 🔴 Must Fix")
    lines.append("")
    if must_fix:
        for g in must_fix:
            lines.append(
                f"- [{g.get('item_id', '?')}] ({g.get('category_name', '?')}) "
                f"— {g.get('gap_description', '')}"
            )
    else:
        lines.append("_None._")
    lines.append("")

    lines.append("### 🟡 Should Fix")
    lines.append("")
    if should_fix:
        for g in should_fix:
            lines.append(
                f"- [{g.get('item_id', '?')}] ({g.get('category_name', '?')}) "
                f"— {g.get('gap_description', '')}"
            )
    else:
        lines.append("_None._")
    lines.append("")

    lines.append("### 💡 Next Time")
    lines.append("")
    if next_time:
        for g in next_time:
            lines.append(
                f"- [{g.get('item_id', '?')}] ({g.get('category_name', '?')}) "
                f"— {g.get('gap_description', '')}"
            )
    else:
        lines.append("_None._")
    lines.append("")

    return "\n".join(lines)
