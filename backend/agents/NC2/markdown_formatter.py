"""
NC2 Markdown Formatter

Converts the NC2 JSON output into a human-readable Markdown report. Used for
logging, debugging, and the ChecklistPreview frontend component.
"""

from __future__ import annotations

from typing import Any


def format_nc2_output(nc2_output: dict[str, Any]) -> str:
    """Convert an NC2 agent output dict into a formatted Markdown report.

    Args:
        nc2_output: The dict returned by NC2Agent.run().

    Returns:
        A Markdown-formatted string suitable for display or logging.
    """
    lines: list[str] = []

    lines.append("# NC2 — Checklist Intelligence Report")
    lines.append("")

    categories: list[dict[str, Any]] = nc2_output.get("categories", [])

    lines.append("## Summary")
    lines.append("")
    lines.append("| Field | Value |")
    lines.append("|---|---|")
    lines.append(f"| Checklist File | {nc2_output.get('checklist_id', '—')} |")
    lines.append(f"| Format Detected | {str(nc2_output.get('format', '—')).upper()} |")
    lines.append(f"| Total Items | {nc2_output.get('total_items', 0)} |")
    lines.append(f"| Categories Found | {len(categories)} |")
    lines.append(f"| Scoring Type | {nc2_output.get('scoring_type', '—')} |")
    lines.append(f"| Weights Source | {nc2_output.get('weights_source', '—')} |")
    lines.append("")

    lines.append("## Categories Overview")
    lines.append("")

    for cat_idx, cat in enumerate(categories, start=1):
        cat_name = cat.get("name", "Unknown")
        weight = cat.get("weight", 0.0)
        weight_pct = round(weight * 100, 1)
        item_count = cat.get("item_count", 0)
        source = cat.get("source", "unknown")

        lines.append(f"### {cat_idx}. {cat_name}  (Weight: {weight_pct}%)")
        lines.append("")
        lines.append(f"- Items: {item_count}")
        lines.append(f"- Grouping method: {source}")
        lines.append("- Items:")

        for item in cat.get("items", []):
            item_id = item.get("id", "?")
            item_text = item.get("text", "")
            item_weight = item.get("weight", 1.0)
            scoring = item.get("scoring", "binary")
            lines.append(
                f"  {item_id}. [{item_id}] {item_text}"
                f"  ← Weight: {item_weight}  Scoring: {scoring}"
            )

        lines.append("")

    lines.append("## Evaluation Prompts Preview")
    lines.append("")

    for cat in categories:
        cat_name = cat.get("name", "Unknown")
        prompt = cat.get("evaluation_prompt", "")
        preview = prompt[:300]
        ellipsis = "..." if len(prompt) > 300 else ""

        lines.append(f"### Category: {cat_name}")
        lines.append("")
        lines.append(f"{preview}{ellipsis}")
        lines.append(f"[Full prompt: {len(prompt)} characters]")
        lines.append("")

    lines.append("## Parse Warnings")
    lines.append("")

    warnings: list[str] = nc2_output.get("parse_warnings", [])
    if warnings:
        for warning in warnings:
            lines.append(f"- {warning}")
    else:
        lines.append("_No parse warnings._")

    lines.append("")

    return "\n".join(lines)
