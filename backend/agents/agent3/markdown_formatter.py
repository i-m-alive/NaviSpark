"""Converts Agent 3 JSON output to a Markdown report."""


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
    if s in ("COVERED", "PRESENT"):
        return "✅"
    if s in ("PARTIAL", "WEAK"):
        return "🟡"
    return "❌"


def format_to_markdown(output: dict) -> str:
    lines = ["# Agent 3 — Competitive Strength Review\n"]
    sc = output.get("scores", {})

    lines += [
        "## Scores\n",
        "| Dimension | Score |",
        "|-----------|-------|",
        f"| Client Fit | {_score(sc.get('client_fit'))} |",
        f"| Differentiation | {_score(sc.get('differentiation'))} |",
        f"| Risk Transparency | {_score(sc.get('risk_transparency'))} |",
        f"| Credibility | {_score(sc.get('credibility'))} |",
        f"| Narrative | {_score(sc.get('narrative'))} |",
        f"| Industry Factors | {_score(sc.get('industry_factors'))} |",
        f"| **Overall** | **{_score(sc.get('overall'))}** |",
        "",
    ]

    # Differentiation
    diff = output.get("differentiation")
    if diff:
        verdict = "❌ Sounds generic" if diff.get("sounds_generic") else "✅ Has genuine differentiators"
        lines += ["\n## Differentiation Assessment\n", f"**Verdict:** {verdict}"]
        if diff.get("differentiators_found"):
            lines.append("\n**Genuine differentiators found:**")
            for d in diff["differentiators_found"]:
                lines.append(f"- ✅ {d}")
        if diff.get("generic_elements"):
            lines.append("\n**Generic elements to fix:**")
            for g in diff["generic_elements"]:
                lines.append(f"- ⚠️ {g}")
        lines.append("")

    # Narrative flow
    narr = output.get("narrative_assessment")
    if narr:
        lines += [
            "\n## Narrative Flow\n",
            "| Element | Status |",
            '|---------|--------|',
            f'| Flows as a story | {"✅" if narr.get("flows_as_story") else "❌"} |',
            f'| Executive summary compelling | {"✅" if narr.get("exec_summary_compelling") else "❌"} |',
            f'| Clear "why us" | {"✅" if narr.get("clear_why_us") else "❌"} |',
            f'| Clear next step | {"✅" if narr.get("clear_next_step") else "❌"} |',
        ]
        if narr.get("narrative_gaps"):
            lines.append("\n**Narrative gaps:**")
            for g in narr["narrative_gaps"]:
                lines.append(f"- {g}")
        lines.append("")

    # Client fit issues
    client_fit = output.get("client_fit_issues", [])
    if client_fit:
        lines.append("\n## Client Priority Gaps\n")
        for i, issue in enumerate(client_fit, 1):
            lines.append(f"### {i}. {_sev(issue.get('severity'))} — {issue.get('priority','')}")
            lines.append(issue.get("issue", ""))
            if issue.get("recommendation"):
                lines.append(f"\n**Recommendation:** {issue['recommendation']}")
            lines.append("")

    # Risk transparency issues
    risk = output.get("risk_transparency_issues", [])
    if risk:
        lines.append("\n## Risk & Dependency Transparency Issues\n")
        for i, issue in enumerate(risk, 1):
            gsk_ref = f" ({issue['gsk_item']})" if issue.get("gsk_item") else ""
            lines.append(f"### {i}. {_sev(issue.get('severity'))}{gsk_ref}")
            lines.append(issue.get("issue", ""))
            lines.append("")

    # Credibility gaps
    cred = output.get("credibility_gaps", [])
    if cred:
        lines.append("\n## Credibility Gaps\n")
        for i, gap in enumerate(cred, 1):
            gsk_ref = f" ({gap['gsk_item']})" if gap.get("gsk_item") else ""
            lines.append(f"### {i}. {_sev(gap.get('severity'))}{gsk_ref}")
            lines.append(gap.get("issue", ""))
            lines.append("")

    # Overclaiming flags
    overclaiming = output.get("overclaiming_flags", [])
    if overclaiming:
        lines += [
            "\n## Overclaiming Flags\n",
            "| Claim | Location | Severity |",
            "|-------|----------|----------|",
        ]
        for f in overclaiming:
            claim = (f.get("claim") or "").replace("|", "\\|")
            lines.append(f'| "{claim}" | {f.get("location","—")} | {_sev(f.get("severity"))} |')

    # GSK checklist coverage
    checklist = output.get("checklist_coverage", [])
    if checklist:
        lines += [
            "\n\n## GSK Proposal Checklist Coverage\n",
            "| ID | Topic | Skill | Status | Note |",
            "|----|-------|-------|--------|------|",
        ]
        for item in checklist:
            topic = (item.get("topic") or "—").replace("|", "\\|")
            note = (item.get("note") or "").replace("|", "\\|")
            status = f"{_status_icon(item.get('status'))} {item.get('status','—')}"
            lines.append(
                f"| {item.get('id','—')} | {topic} | {item.get('skill','—')} | {status} | {note} |"
            )
        covered = sum(1 for i in checklist if i.get("status") == "COVERED")
        partial = sum(1 for i in checklist if i.get("status") == "PARTIAL")
        missing = sum(1 for i in checklist if i.get("status") == "MISSING")
        lines.append(
            f"\n**Summary:** {covered} covered · {partial} partial · {missing} missing "
            f"(of {len(checklist)} items)"
        )

    # Industry win factors
    industry = output.get("industry_findings", [])
    if industry:
        lines += [
            "\n\n## Industry Win Factors\n",
            "| Factor | Finding | Severity |",
            "|--------|---------|----------|",
        ]
        for f in industry:
            factor = (f.get("factor") or "").replace("|", "\\|")
            finding_icon = _status_icon(f.get("finding"))
            lines.append(f"| {factor} | {finding_icon} {f.get('finding','—')} | {_sev(f.get('severity'))} |")

    return "\n".join(lines)
