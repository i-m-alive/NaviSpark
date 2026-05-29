"""Converts Agent 2 JSON output to a Markdown report."""


def _score(val):
    return f"{val:.1f} / 10" if val is not None else "—"


def _sev(s):
    if not s:
        return ""
    if s == "CRITICAL":
        return "🔴 CRITICAL"
    if s == "MAJOR":
        return "🟠 MAJOR"
    return "🔵 MINOR"


def format_to_markdown(output: dict) -> str:
    lines = ["# Agent 2 — Estimation & Commercial Integrity Review\n"]
    sc = output.get("scores", {})

    lines += [
        "## Scores\n",
        "| Dimension | Score |",
        "|-----------|-------|",
        f"| Estimation Rigour (30%) | {_score(sc.get('estimation_rigour'))} |",
        f"| Phase Coverage (30%) | {_score(sc.get('phase_coverage'))} |",
        f"| Pricing Completeness (20%) | {_score(sc.get('pricing_completeness'))} |",
        f"| Commercial Model Fit (10%) | {_score(sc.get('commercial_model_fit'))} |",
        f"| Arithmetic Accuracy (10%) | {_score(sc.get('arithmetic_accuracy'))} |",
        f"| **Overall** | **{_score(sc.get('overall'))}** |",
        "",
    ]

    # Commercial model assessment
    cma = output.get("commercial_model_assessment")
    if cma:
        appropriate = "✅ Yes" if cma.get("appropriate_for_scope") else "❌ No"
        lines += [
            "\n## Commercial Model Assessment\n",
            f"**Model:** {cma.get('model_stated','—')}",
            f"**Appropriate for scope:** {appropriate}",
        ]
        if cma.get("concerns"):
            lines.append("\n**Concerns:**")
            for c in cma["concerns"]:
                lines.append(f"- {c}")
        lines.append("")

    # Missing / uncosted phases
    phases = output.get("missing_phases", [])
    if phases:
        lines += [
            "\n## Missing / Uncosted Phases\n",
            "| GSK Item | Phase | Severity |",
            "|----------|-------|----------|",
        ]
        for p in phases:
            lines.append(f"| {p.get('gsk_item','—')} | {p.get('phase','—')} | {_sev(p.get('severity'))} |")

    # Estimation issues
    est = output.get("estimation_issues", [])
    if est:
        lines.append("\n\n## Estimation Issues\n")
        for i, issue in enumerate(est, 1):
            lines.append(
                f"### {i}. {_sev(issue.get('severity'))} — "
                f"{issue.get('gsk_item','')} (Skill {issue.get('skill','')})"
            )
            lines.append(issue.get("issue", ""))
            if issue.get("recommendation"):
                lines.append(f"\n**Recommendation:** {issue['recommendation']}")
            lines.append("")

    # Pricing issues
    pricing = output.get("pricing_issues", [])
    if pricing:
        lines.append("\n## Pricing Issues\n")
        for i, issue in enumerate(pricing, 1):
            lines.append(
                f"### {i}. {_sev(issue.get('severity'))} — "
                f"{issue.get('gsk_item','')} (Skill {issue.get('skill','')})"
            )
            lines.append(issue.get("issue", ""))
            if issue.get("recommendation"):
                lines.append(f"\n**Recommendation:** {issue['recommendation']}")
            lines.append("")

    # Arithmetic flags
    arith = output.get("arithmetic_flags", [])
    if arith:
        lines += [
            "\n## Arithmetic Checks\n",
            "| Check | Finding | Severity |",
            "|-------|---------|----------|",
        ]
        for f in arith:
            check = (f.get("check") or "").replace("|", "\\|")
            finding = (f.get("finding") or "").replace("|", "\\|")
            lines.append(f"| {check} | {finding} | {_sev(f.get('severity'))} |")

    # Internal flags (clearly marked)
    internal = output.get("internal_flags", [])
    if internal:
        lines.append("\n---\n\n## ⚠️ INTERNAL — NOT FOR CLIENT\n")
        for i, f in enumerate(internal, 1):
            lines.append(f"### {i}. {f.get('check','')} — {_sev(f.get('severity'))}")
            lines.append(f.get("finding", ""))
            lines.append("")

    return "\n".join(lines)
