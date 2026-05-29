"""Converts Agent 4 JSON output to the final Markdown report."""


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


def _render_action_list(items, heading):
    if not items:
        return ""
    lines = [f"\n## {heading}\n"]
    for i, item in enumerate(items, 1):
        lines.append(f"### {i}. {item.get('action','')}")
        if item.get("why"):
            lines.append(f"**Why it matters:** {item['why']}")
        if item.get("source_agents"):
            lines.append(f"**Source:** {', '.join(item['source_agents'])}")
        lines.append("")
    return "\n".join(lines)


def format_to_markdown(output: dict) -> str:
    lines = ["# Agent 4 — Chief Proposal Review Officer (Final Verdict)\n"]

    # Verdict block
    verdict = output.get("verdict", "—")
    verdict_emoji = "✅" if verdict == "READY TO SEND" else ("❌" if verdict == "DO NOT SEND" else "⚠️")
    overall = output.get("overall_score")
    weights = output.get("weights", {})

    lines += [
        f"## {verdict_emoji} Verdict: {verdict}\n",
        f"**Overall Score:** {_score(overall)}\n",
        "| Agent | Score | Weight |",
        "|-------|-------|--------|",
        f"| Agent 1 — Completeness & Clarity | {_score(output.get('agent1_score'))} "
        f"| {int(weights.get('agent1', 0) * 100)}% |",
        f"| Agent 2 — Estimation & Commercial | {_score(output.get('agent2_score'))} "
        f"| {int(weights.get('agent2', 0) * 100)}% |",
        f"| Agent 3 — Competitive Strength | {_score(output.get('agent3_score'))} "
        f"| {int(weights.get('agent3', 0) * 100)}% |",
        "",
    ]
    if output.get("weight_adjusted"):
        lines.append(
            f"> **Weight adjustment:** {output.get('weight_label','')} — {output.get('weight_reason','')}\n"
        )

    # Executive summary
    if output.get("plain_english_summary"):
        lines.append(f"\n## Executive Summary\n\n{output['plain_english_summary']}\n")

    # Top 3 strengths
    strengths = output.get("top_3_strengths", [])
    if strengths:
        lines.append("\n## Top Strengths\n")
        for i, s in enumerate(strengths, 1):
            lines.append(f"{i}. {s}")
        lines.append("")

    # Double-flagged issues
    double_flagged = output.get("double_flagged_issues", [])
    if double_flagged:
        lines += [
            "\n## ⚠️ Double-Flagged Issues (Highest Priority)\n",
            "_These issues were independently detected by two or more specialist agents._\n",
        ]
        for i, issue in enumerate(double_flagged, 1):
            agents_str = " + ".join(issue.get("agents", []))
            lines.append(f"### {i}. {agents_str} — CRITICAL")
            lines.append(issue.get("issue_summary", ""))
            if issue.get("shared_keywords"):
                lines.append(f"\n**Shared signals:** {', '.join(issue['shared_keywords'])}")
            lines.append("")

    # Priority action list
    pa = output.get("priority_actions", {})
    for block in [
        _render_action_list(pa.get("must_fix"), "🔴 Must Fix Before Sending"),
        _render_action_list(pa.get("should_fix"), "🟡 Should Fix If Time Allows"),
        _render_action_list(pa.get("next_time"), "🔵 Note for Next Proposal"),
    ]:
        if block:
            lines.append(block)

    if pa.get("internal"):
        lines.append("\n---\n\n## ⚠️ INTERNAL — NOT FOR CLIENT\n")
        for i, item in enumerate(pa["internal"], 1):
            lines.append(f"### {i}. {item.get('action','')}")
            if item.get("why"):
                lines.append(item["why"])
            lines.append("")

    # Cross-consistency issues
    cc = output.get("cross_consistency_issues", [])
    if cc:
        lines += [
            "\n## Cross-Agent Consistency Issues\n",
            "| Rule | Check | Severity | Finding |",
            "|------|-------|----------|---------|",
        ]
        for issue in cc:
            check = (issue.get("check") or "").replace("|", "\\|")
            finding = (issue.get("finding") or "").replace("|", "\\|")
            lines.append(
                f"| {issue.get('rule_id','—')} | {check} "
                f"| {_sev(issue.get('severity'))} | {finding} |"
            )

    # Section scorecard
    sc = output.get("section_scorecard")
    if sc:
        lines += [
            "\n\n## Dimension Scorecard\n",
            "| Dimension | Score |",
            "|-----------|-------|",
            f"| Section Completeness | {_score(sc.get('section_completeness'))} |",
            f"| Writing Quality | {_score(sc.get('writing_quality'))} |",
            f"| Scope Clarity | {_score(sc.get('scope_clarity'))} |",
            f"| Client Coverage | {_score(sc.get('client_coverage'))} |",
            f"| Estimation Rigour | {_score(sc.get('estimation_rigour'))} |",
            f"| Phase Coverage | {_score(sc.get('phase_coverage'))} |",
            f"| Pricing Completeness | {_score(sc.get('pricing_completeness'))} |",
            f"| Commercial Model Fit | {_score(sc.get('commercial_model_fit'))} |",
            f"| Client Fit | {_score(sc.get('client_fit'))} |",
            f"| Differentiation | {_score(sc.get('differentiation'))} |",
            f"| Risk Transparency | {_score(sc.get('risk_transparency'))} |",
            f"| Credibility | {_score(sc.get('credibility'))} |",
            f"| Narrative | {_score(sc.get('narrative'))} |",
            f"| Industry Factors | {_score(sc.get('industry_factors'))} |",
        ]

    # Unified checklist grid
    cl = output.get("checklist_coverage", [])
    if cl:
        public_items = [i for i in cl if not i.get("internal")]
        covered = sum(1 for i in cl if i.get("status") == "COVERED")
        partial = sum(1 for i in cl if i.get("status") == "PARTIAL")
        missing = sum(1 for i in cl if i.get("status") == "MISSING")
        lines += [
            f"\n\n## GSK Checklist Coverage — All Three Sheets ({len(cl)} items)\n",
            f"**Summary:** {covered} covered · {partial} partial · {missing} missing\n",
            "| ID | Sheet | Topic | Mandatory | Status | Agent |",
            "|----|-------|-------|:---------:|--------|-------|",
        ]
        for item in public_items:
            topic = (item.get("topic") or "").replace("|", "\\|")
            mandatory = "✓" if item.get("mandatory") else ""
            lines.append(
                f"| {item.get('id','—')} | {item.get('sheet','—')} | {topic} "
                f"| {mandatory} | {_status_icon(item.get('status'))} | {item.get('primary_agent','—')} |"
            )
        if len(cl) > len(public_items):
            lines.append("\n_Internal items omitted from client-facing grid._")

    # Rewrite suggestions
    rewrites = output.get("rewrite_suggestions", [])
    if rewrites:
        lines.append("\n\n## Rewrite Suggestions\n")
        for i, r in enumerate(rewrites, 1):
            lines.append(f"### {i}. {r.get('section','Rewrite')}")
            original = (r.get("original") or "").replace("\n", "\n> ")
            improved = (r.get("improved") or "").replace("\n", "\n> ")
            lines += [
                "**Original:**",
                f"> {original}\n",
                "**Improved:**",
                f"> {improved}\n",
            ]
            if r.get("what_changed"):
                lines.append(f"_{r['what_changed']}_")
            lines.append("")

    return "\n".join(lines)
