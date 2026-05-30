"""
Formats Agent 5's modification report as human-readable Markdown.
Stored to Supabase alongside the modified PPTX.
"""


def format_to_markdown(result: dict) -> str:
    summary = result.get("modification_summary", {})
    modifications = result.get("modifications", [])
    skipped = result.get("skipped", [])

    lines = [
        "# Agent 5 — PPT Modification Report",
        "",
        "## Summary",
        f"- **Total modifications applied:** {summary.get('total_modifications', 0)}",
        f"- **Must-fix actions addressed:** {summary.get('must_fix_count', 0)}",
        f"- **Should-fix improvements:** {summary.get('should_fix_count', 0)}",
        f"- **Nice-to-have enhancements:** {summary.get('nice_to_have_count', 0)}",
        f"- **Skipped (manual action needed):** {summary.get('skipped_count', 0)}",
        f"- **Coverage:** {summary.get('must_fix_coverage', 'N/A')}",
        "",
        "---",
        "",
    ]

    # ── Modifications ─────────────────────────────────────────────────────────
    if modifications:
        lines.append("## Modifications Applied")
        lines.append("")

        current_priority = None
        priority_labels = {
            "must_fix": "### Must-Fix (Critical)",
            "should_fix": "### Should-Fix (Major)",
            "nice_to_have": "### Nice-to-Have (Minor)",
        }

        for i, mod in enumerate(modifications, 1):
            p = mod.get("priority", "nice_to_have")
            if p != current_priority:
                current_priority = p
                lines.append(priority_labels.get(p, f"### {p}"))
                lines.append("")

            action = mod.get("action", "")
            slide_idx = mod.get("slide_index", "?")
            shape = mod.get("shape_name", "?")
            finding = mod.get("source_finding", "")
            skill = mod.get("source_skill", "?")
            severity = mod.get("severity", "")

            lines.append(f"**{i}. Slide {slide_idx} — `{shape}`** [{severity}]")
            lines.append(f"   - Action: `{action}`")
            lines.append(f"   - Source: Skill {skill} — {finding}")

            if action == "replace_text":
                orig = mod.get("original_text", "")
                new = mod.get("new_text", "")
                lines.append(f"   - **Before:** _{orig[:120]}{'...' if len(orig) > 120 else ''}_")
                lines.append(f"   - **After:**  _{new[:120]}{'...' if len(new) > 120 else ''}_")
            elif action == "append_bullets":
                bullets = mod.get("bullets", [])
                lines.append(f"   - **Bullets added ({len(bullets)}):**")
                for b in bullets:
                    lines.append(f"     - {b}")
            elif action == "append_text":
                new = mod.get("new_text", "")
                lines.append(f"   - **Text appended:** _{new[:150]}{'...' if len(new) > 150 else ''}_")

            lines.append("")

    # ── Skipped ───────────────────────────────────────────────────────────────
    if skipped:
        lines.append("---")
        lines.append("")
        lines.append("## Skipped — Manual Action Required")
        lines.append("")
        lines.append(
            "The following findings could not be auto-modified (e.g., require new slides, "
            "image changes, or numeric data not available to the agent):"
        )
        lines.append("")

        for i, skip in enumerate(skipped, 1):
            finding = skip.get("finding", "Unknown finding")
            reason = skip.get("reason", "")
            manual = skip.get("manual_action_required", "")
            agent = skip.get("source_agent", "")
            lines.append(f"**{i}. {finding}** ({agent})")
            lines.append(f"   - Reason: {reason}")
            if manual:
                lines.append(f"   - Manual action: {manual}")
            lines.append("")

    return "\n".join(lines)
