"""Converts Agent 1 JSON output to a Markdown report."""


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


def _status_icon(status):
    s = (status or "").upper()
    if s == "COVERED":
        return "✅ COVERED"
    if s == "PARTIAL":
        return "🟡 PARTIAL"
    return "❌ MISSING"


def format_to_markdown(output: dict) -> str:
    lines = ["# Agent 1 — Completeness & Clarity Review\n"]
    sc = output.get("scores", {})

    lines += [
        "## Scores\n",
        "| Dimension | Score |",
        "|-----------|-------|",
        f"| Section Completeness | {_score(sc.get('section_completeness'))} |",
        f"| Writing Quality | {_score(sc.get('writing_quality'))} |",
        f"| Scope Clarity | {_score(sc.get('scope_clarity'))} |",
        f"| Client Coverage | {_score(sc.get('client_coverage'))} |",
        f"| **Overall** | **{_score(sc.get('overall'))}** |",
        "",
    ]

    # Section audit checklist
    audit = output.get("section_audit", [])
    if audit:
        lines += [
            "\n## GSK Proposal Checklist Coverage\n",
            "| ID | Section | Mandatory | Status | Note |",
            "|----|---------|:---------:|--------|------|",
        ]
        for item in audit:
            note = (item.get("note") or "").replace("|", "\\|")
            mandatory = "✓" if item.get("mandatory") else ""
            lines.append(
                f"| {item.get('id','—')} | {item.get('section','—')} "
                f"| {mandatory} | {_status_icon(item.get('status'))} | {note} |"
            )
        covered = sum(1 for i in audit if i.get("status") == "COVERED")
        partial = sum(1 for i in audit if i.get("status") == "PARTIAL")
        missing = sum(1 for i in audit if i.get("status") == "MISSING")
        lines.append(
            f"\n**Summary:** {covered} covered · {partial} partial · {missing} missing "
            f"(of {len(audit)} items)"
        )

    # Writing issues
    writing = output.get("writing_issues", [])
    if writing:
        lines.append("\n\n## Writing Issues\n")
        for i, issue in enumerate(writing, 1):
            lines.append(f"### {i}. {_sev(issue.get('severity'))} — {issue.get('type','')}")
            if issue.get("location"):
                lines.append(f"**Location:** {issue['location']}")
            if issue.get("quote"):
                lines.append(f'\n> "{issue["quote"]}"\n')
            if issue.get("why"):
                lines.append(f"**Why:** {issue['why']}")
            if issue.get("recommendation"):
                lines.append(f"**Recommendation:** {issue['recommendation']}")
            lines.append("")

    # Scope clarity issues
    scope = output.get("scope_clarity_issues", [])
    if scope:
        lines.append("\n## Scope Clarity Issues\n")
        for i, issue in enumerate(scope, 1):
            lines.append(f"### {i}. {_sev(issue.get('severity'))}")
            lines.append(issue.get("issue", ""))
            if issue.get("recommendation"):
                lines.append(f"\n**Recommendation:** {issue['recommendation']}")
            lines.append("")

    # High-risk assumptions
    assumptions = output.get("high_risk_assumptions", [])
    if assumptions:
        lines.append("\n## High-Risk Assumptions\n")
        for i, a in enumerate(assumptions, 1):
            lines.append(f"### {i}. {a.get('assumption','')}")
            if a.get("location"):
                lines.append(f"**Location:** {a['location']}")
            if a.get("risk_if_wrong"):
                lines.append(f"**Risk if wrong:** {a['risk_if_wrong']}")
            lines.append("")

    # Industry-specific gaps
    gaps = output.get("client_specific_gaps", [])
    if gaps:
        lines += [
            "\n## Industry-Specific Gaps\n",
            "| Industry | Gap | Severity |",
            "|----------|-----|----------|",
        ]
        for g in gaps:
            gap_text = (g.get("gap") or "—").replace("|", "\\|")
            lines.append(f"| {g.get('industry_lens','—')} | {gap_text} | {_sev(g.get('severity'))} |")

    # Jargon flags
    jargon = output.get("jargon_flags", [])
    if jargon:
        lines.append("\n\n## Jargon Flags\n")
        for i, f in enumerate(jargon, 1):
            lines.append(f"### {i}. Jargon-dense paragraph")
            if f.get("passage"):
                lines.append(f'> "{f["passage"]}…"')
            if f.get("jargon_terms"):
                lines.append(f"**Terms flagged:** {', '.join(f['jargon_terms'])}")
            if f.get("plain_language_suggestion"):
                lines.append(f"**Suggestion:** {f['plain_language_suggestion']}")
            lines.append("")

    # Rewrite suggestion
    rw = output.get("rewrite")
    if rw:
        lines.append("\n## Rewrite Suggestion\n")
        if rw.get("section"):
            lines.append(f"**Section:** {rw['section']}\n")
        original = (rw.get("original") or "").replace("\n", "\n> ")
        improved = (rw.get("improved") or "").replace("\n", "\n> ")
        lines += [
            "**Original:**",
            f"> {original}\n",
            "**Improved:**",
            f"> {improved}\n",
        ]
        if rw.get("what_changed"):
            lines.append(f"**What changed:** {rw['what_changed']}")

    return "\n".join(lines)
