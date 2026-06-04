"""
NC1 Markdown Formatter

Converts the NC1 JSON output into a human-readable Markdown string.
Used for logging, debugging, and plain-text display contexts.
"""

from __future__ import annotations

from typing import Any


def format_nc1_output(nc1_output: dict[str, Any]) -> str:
    """Convert an NC1 agent output dict into a formatted Markdown report.

    Args:
        nc1_output: The dict returned by NC1Agent.run().

    Returns:
        A Markdown-formatted string suitable for display or logging.
    """
    lines: list[str] = []

    lines.append("# NC1 — Document Intelligence Report")
    lines.append("")

    auto = nc1_output.get("auto_detected", {})
    lines.append("## Auto-Detected Context")
    lines.append("")
    lines.append("| Field | Value |")
    lines.append("|---|---|")

    field_labels: list[tuple[str, str]] = [
        ("client_industry", "Client Industry"),
        ("proposal_type", "Proposal Type"),
        ("client_priorities", "Client Priorities"),
        ("client_name", "Client Name"),
        ("vendor_name", "Vendor Name"),
        ("project_name", "Project Name"),
        ("proposed_timeline", "Proposed Timeline"),
        ("budget_range", "Budget Range"),
        ("team_size", "Team Size"),
        ("delivery_methodology", "Delivery Methodology"),
    ]

    for key, label in field_labels:
        value = auto.get(key)
        if isinstance(value, list):
            display = ", ".join(value) if value else "—"
        elif value is None:
            display = "—"
        else:
            display = str(value)
        lines.append(f"| {label} | {display} |")

    lines.append("")

    structure = nc1_output.get("structure_map", {})
    lines.append("## Document Structure")
    lines.append("")

    sections = structure.get("sections", [])
    if sections:
        for i, section in enumerate(sections, start=1):
            lines.append(f"{i}. {section}")
    else:
        lines.append("_No sections detected._")

    lines.append("")
    slide_count = structure.get("slide_count", 0)
    has_toc = structure.get("has_toc", False)
    structure_type = structure.get("structure_type", "unknown")
    lines.append(f"- **Document type**: {structure_type.upper()}")
    lines.append(f"- **Slide count**: {slide_count}")
    lines.append(f"- **Table of contents detected**: {'Yes' if has_toc else 'No'}")
    lines.append("")

    quality = nc1_output.get("quality_scan", {})
    lines.append("## Quality Scan")
    lines.append("")

    completeness = quality.get("completeness_score", 0.0)
    lines.append(f"**Completeness score**: {completeness * 100:.0f}%")
    lines.append("")

    sections_present: dict[str, bool] = quality.get("sections_present", {})
    if sections_present:
        lines.append("| Section | Present |")
        lines.append("|---|---|")
        for section_name, present in sections_present.items():
            indicator = "✅" if present else "❌"
            lines.append(f"| {section_name} | {indicator} |")
        lines.append("")

    quality_flags: list[str] = quality.get("quality_flags", [])
    if quality_flags:
        lines.append("**Quality Flags:**")
        lines.append("")
        for flag in quality_flags:
            lines.append(f"- ⚠️ {flag}")
        lines.append("")
    else:
        lines.append("_No quality flags raised._")
        lines.append("")

    confidence: float = nc1_output.get("confidence", 0.0)
    lines.append("## Confidence Score")
    lines.append("")

    confidence_pct = confidence * 100
    if confidence >= 0.85:
        label = "HIGH"
    elif confidence >= 0.70:
        label = "GOOD"
    elif confidence >= 0.50:
        label = "MODERATE — review recommended"
    else:
        label = "LOW — manual review required"

    lines.append(f"**{confidence_pct:.0f}% — {label}**")
    lines.append("")

    return "\n".join(lines)
