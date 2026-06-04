"""
NC4 Markdown Formatter

Converts the NC4 JSON output into a complete human-readable Markdown report.
This is the master report for the entire Custom Checklist Review Pipeline.
"""

from __future__ import annotations

from typing import Any


def format_nc4_output(nc4_output: dict[str, Any]) -> str:
    """Convert an NC4 agent output dict into a comprehensive Markdown report.

    Args:
        nc4_output: The dict returned by NC4Agent.run().

    Returns:
        A Markdown-formatted string suitable for display or logging.
    """
    lines: list[str] = []

    lines.append("# NC4 — Synthesis & Report")
    lines.append("## Custom Checklist Review Pipeline — Final Report")
    lines.append("")

    # --- Section 2: Executive Summary ---
    lines.append("## Executive Summary")
    lines.append("")
    lines.append(nc4_output.get("plain_english_summary", "_No summary generated._"))
    lines.append("")
    lines.append("---")
    lines.append("")

    # --- Section 3: Verdict ---
    verdict = nc4_output.get("verdict", "NEEDS MAJOR REVISION")
    verdict_meta = nc4_output.get("verdict_meta", {})
    overall_score = nc4_output.get("overall_score", 0.0)

    lines.append("## Verdict")
    lines.append("")
    lines.append("| Field | Value |")
    lines.append("|---|---|")
    lines.append(f"| **Verdict** | {verdict} |")
    lines.append(f"| **Score** | {overall_score} / 10.0 |")
    lines.append(f"| **Score Band** | {verdict_meta.get('score_band', '?')} |")
    lines.append(f"| **Rule** | {verdict_meta.get('triggering_rule', '?')} |")
    lines.append(f"| **Must Fix** | {verdict_meta.get('must_fix_count', 0)} item(s) |")
    lines.append("")

    if verdict == "READY TO SEND":
        lines.append("> ✅ **READY TO SEND** — This proposal meets all critical requirements.")
    elif verdict == "NEEDS MAJOR REVISION":
        lines.append("> \U0001f7e1 **NEEDS MAJOR REVISION** — Address must-fix items before submission.")
    else:
        lines.append("> \U0001f534 **DO NOT SEND** — Critical gaps identified. Major revision required.")
    lines.append("")

    # --- Section 4: Category Scores ---
    lines.append("## Category Scores")
    lines.append("")
    lines.append("| Category | Score (/10) | Pass | Partial | Fail | Weight | Penalty |")
    lines.append("|---|---|---|---|---|---|---|")

    for bd in nc4_output.get("scoring_breakdown", []):
        weight_pct = f"{bd.get('weight', 0.0):.0%}"
        penalty = "Yes" if bd.get("penalty_applied") else "No"
        lines.append(
            f"| {bd.get('category_name', '?')} "
            f"| {bd.get('normalised_score', 0.0):.1f} "
            f"| {bd.get('items_passed', 0)} "
            f"| {bd.get('items_partial', 0)} "
            f"| {bd.get('items_failed', 0)} "
            f"| {weight_pct} "
            f"| {penalty} |"
        )

    error_cats = nc4_output.get("error_categories", [])
    if error_cats:
        lines.append("")
        lines.append(
            f"> ⚠️ **Evaluation errors** in: {', '.join(error_cats)}. "
            "These categories were excluded from scoring."
        )
    lines.append("")

    # --- Section 5: Priority Actions ---
    priority = nc4_output.get("priority_actions", {})
    must_fix = priority.get("must_fix", [])
    should_fix = priority.get("should_fix", [])
    next_time = priority.get("next_time", [])

    lines.append("## Priority Actions")
    lines.append("")

    lines.append(f"### \U0001f534 Must Fix ({len(must_fix)})")
    lines.append("")
    if must_fix:
        for a in must_fix:
            lines.append(
                f"**[{a['action_id']}]** `{a['category_name']}` — {a['gap_description']}"
            )
            lines.append(f"> \U0001f4a1 **Fix:** {a['suggested_fix']}")
            lines.append(
                f"> Weight: {a.get('combined_weight', 0.0):.2f} | Item: {a.get('item_id', '?')}"
            )
            lines.append("")
            lines.append("---")
            lines.append("")
    else:
        lines.append("_None identified._")
        lines.append("")

    lines.append(f"### \U0001f7e1 Should Fix ({len(should_fix)})")
    lines.append("")
    if should_fix:
        for a in should_fix:
            lines.append(
                f"**[{a['action_id']}]** `{a['category_name']}` — {a['gap_description']}"
            )
            lines.append(f"> \U0001f4a1 **Fix:** {a['suggested_fix']}")
            lines.append(
                f"> Weight: {a.get('combined_weight', 0.0):.2f} | Item: {a.get('item_id', '?')}"
            )
            lines.append("")
            lines.append("---")
            lines.append("")
    else:
        lines.append("_None identified._")
        lines.append("")

    lines.append(f"### \U0001f4a1 Next Time ({len(next_time)})")
    lines.append("")
    if next_time:
        for a in next_time:
            lines.append(
                f"**[{a['action_id']}]** `{a['category_name']}` — {a['gap_description']}"
            )
            lines.append(f"> \U0001f4a1 **Fix:** {a['suggested_fix']}")
            lines.append(
                f"> Weight: {a.get('combined_weight', 0.0):.2f} | Item: {a.get('item_id', '?')}"
            )
            lines.append("")
            lines.append("---")
            lines.append("")
    else:
        lines.append("_None identified._")
        lines.append("")

    # --- Section 6: Top Strengths ---
    lines.append("## Top Strengths")
    lines.append("")
    strengths = nc4_output.get("top_3_strengths", [])
    if strengths:
        for s in strengths:
            lines.append(
                f"**{s['rank']}. {s['category_name']}** — "
                f"Score: {s['score']:.1f}/10 ({s.get('score_pct', 0.0):.0f}%)"
            )
            lines.append(s.get("highlight", ""))
            lines.append("")
    else:
        lines.append("_No categories scored above the passing threshold._")
        lines.append("")

    # --- Section 7: Consistency Warnings ---
    lines.append("## Consistency Warnings")
    lines.append("")
    warnings = nc4_output.get("consistency_warnings", [])
    if not warnings:
        lines.append("_No consistency issues detected._")
    else:
        lines.append("| Warning ID | Type | Description | Category A | Category B |")
        lines.append("|---|---|---|---|---|")
        for w in warnings:
            desc = w.get("description", "")[:80]
            lines.append(
                f"| {w.get('warning_id', '?')} "
                f"| {w.get('type', '?')} "
                f"| {desc} "
                f"| {w.get('category_a', '?')} "
                f"| {w.get('category_b', '?')} |"
            )
    lines.append("")

    # --- Section 8: Checklist Coverage ---
    coverage = nc4_output.get("checklist_coverage", {})
    pass_rate_pct = f"{coverage.get('pass_rate', 0.0):.0%}"

    lines.append("## Checklist Coverage")
    lines.append("")
    lines.append("| Metric | Value |")
    lines.append("|---|---|")
    lines.append(f"| Total Items | {coverage.get('total_items', 0)} |")
    lines.append(f"| Passed | {coverage.get('passed', 0)} ({pass_rate_pct}) |")
    lines.append(f"| Partial | {coverage.get('partial', 0)} |")
    lines.append(f"| Failed | {coverage.get('failed', 0)} |")
    lines.append(f"| Error (not evaluated) | {coverage.get('error_items', 0)} |")
    lines.append("")

    # --- Section 9: Pipeline Metadata ---
    nc1_conf = nc4_output.get("nc1_confidence")
    conf_str = f"{nc1_conf:.2f}" if nc1_conf is not None else "N/A"

    lines.append("## Pipeline Metadata")
    lines.append("")
    lines.append("| Field | Value |")
    lines.append("|---|---|")
    lines.append(f"| Checklist ID | {nc4_output.get('nc2_checklist_id', '?')} |")
    lines.append(f"| Scoring Type | {nc4_output.get('nc2_scoring_type', '?')} |")
    lines.append(f"| Weights Source | {nc4_output.get('nc2_weights_source', '?')} |")
    lines.append(f"| NC1 Confidence | {conf_str} |")
    lines.append("")

    return "\n".join(lines)
