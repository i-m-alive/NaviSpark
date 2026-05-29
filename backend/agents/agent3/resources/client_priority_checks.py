"""
Client priority checks for Skill 3.1 — Client Understanding & Fit.
Keyed by CLIENT_PRIORITY — mirrors industry_factors.py in Agent 1.
Each priority maps to specific checks the agent must perform against the proposal.
"""

CLIENT_PRIORITY_CHECKS: dict[str, list[dict]] = {
    "Cost Certainty": [
        {
            "check": "Commercial model is low-risk for the client",
            "detail": (
                "Is the commercial model (Fixed Price, Milestone, or equivalent) structured to protect "
                "the client from cost overruns? A T&M model on an ambiguous scope exposes the client to "
                "unlimited cost. Check whether scope is locked tight enough to justify the model chosen. "
                "If not, the proposal fails on this priority."
            ),
        },
        {
            "check": "Scope is locked with no open-ended assumptions",
            "detail": (
                "For a client whose top priority is cost certainty, every open assumption is a future "
                "change request. Check whether the scope section has any wording that leaves the boundary "
                "ambiguous: 'requirements to be finalised', 'TBD', 'subject to discovery'. Flag each as "
                "a direct threat to cost certainty."
            ),
        },
        {
            "check": "Contingency is visible and justified",
            "detail": (
                "A cost-certainty client needs to see the contingency line — hidden contingency erodes "
                "trust when it surfaces later. Is contingency shown as a named line item with a rationale? "
                "A flat percentage without justification does not satisfy a cost-certainty client."
            ),
        },
        {
            "check": "Payment schedule protects client from paying for non-delivery",
            "detail": (
                "Is the payment schedule tied to verifiable deliverables, not calendar dates? "
                "A cost-certainty client should not pay until they have received something tangible."
            ),
        },
    ],
    "Speed to Market": [
        {
            "check": "Timeline is credible given the resource plan",
            "detail": (
                "Does the proposed timeline actually hold up against the resource loading plan? "
                "A promise of '4 months' with a team of 3 people on a complex integration is not credible. "
                "Check whether the stated duration is achievable with the named team and phases proposed."
            ),
        },
        {
            "check": "Accelerators or pre-built components are named",
            "detail": (
                "For a speed-to-market client, the vendor must demonstrate HOW they will be faster than "
                "a ground-up build. Named accelerators, reusable components, pre-built frameworks, or "
                "existing IP must be identified. A vague claim of 'our accelerators reduce time by 30%' "
                "without naming them = MAJOR. No accelerators mentioned = flag as a gap for this priority."
            ),
        },
        {
            "check": "Fast-track or phase-gated delivery approach described",
            "detail": (
                "Is there a phased delivery model that gets the client to market with an MVP quickly, "
                "rather than a single go-live at the end of a long engagement? For speed-to-market clients, "
                "a phased or iterative approach is a strong positive signal."
            ),
        },
        {
            "check": "Dependencies and blockers that could delay timeline are acknowledged",
            "detail": (
                "A speed-to-market client's worst nightmare is an unexpected delay mid-project. "
                "Does the proposal proactively acknowledge what could slow them down (client approvals, "
                "third-party integrations, data migration) and provide mitigation plans?"
            ),
        },
    ],
    "Regulatory Compliance": [
        {
            "check": "Named regulations cited — not 'we comply with all applicable regulations'",
            "detail": (
                "The specific regulatory frameworks governing this engagement must be named: GDPR, HIPAA, "
                "PCI-DSS, ISO 27001, FDA 21 CFR Part 11, RBI guidelines, DPDP Act, SEBI, NIC cloud "
                "compliance, or sector-specific equivalents. 'We comply with all applicable regulations' "
                "is a CRITICAL failure for a regulatory compliance priority — it demonstrates the vendor "
                "either does not know the regulations or is hedging."
            ),
        },
        {
            "check": "Compliance approach specific to the engagement described",
            "detail": (
                "How will compliance be achieved in this specific project? Data residency requirements, "
                "encryption standards, audit trail design, consent management, access control model. "
                "Generic compliance language without project-specific application = MAJOR."
            ),
        },
        {
            "check": "Compliance certifications held by the vendor named",
            "detail": (
                "Are the vendor's own certifications relevant to this engagement named? ISO 27001, "
                "SOC 2 Type II, CMMI, HIPAA Business Associate Agreement capability, or equivalent. "
                "Absent when compliance is a top priority = MAJOR."
            ),
        },
        {
            "check": "Path to compliance handover or audit documentation described",
            "detail": (
                "How will the client demonstrate compliance post-delivery? Audit logs, documentation, "
                "evidence packages. A compliance-focused client needs to pass audits — does the proposal "
                "address how they will be able to do that?"
            ),
        },
    ],
    "Risk Minimisation": [
        {
            "check": "Risk register is thorough and specific",
            "detail": (
                "For a risk-minimisation client, the risk register is a primary evaluation criterion. "
                "It must contain specific, named risks — not generic ones. Each risk must have a named "
                "mitigation, not just acknowledgement. BAD: 'Resource availability risk — we will manage.' "
                "GOOD: 'If key architect is unavailable, pre-identified backup resource X is briefed.' "
                "Count the number of specific risks with named mitigations."
            ),
        },
        {
            "check": "Client dependencies stated with consequences",
            "detail": (
                "A risk-minimisation client wants to know what they need to do and what happens if they "
                "don't. Every client dependency must state: what is needed, by when, and the consequence "
                "if it is delayed. Vague 'client cooperation required' = CRITICAL for this priority."
            ),
        },
        {
            "check": "Escalation and issue resolution process described",
            "detail": (
                "How will issues be escalated? Who can the client call if something goes wrong? "
                "Named escalation path (not just 'the PM will escalate') is a strong positive signal "
                "for risk-minimisation clients."
            ),
        },
        {
            "check": "Rollback or contingency plan for go-live described",
            "detail": (
                "What happens if go-live fails? Is there a rollback plan, a parallel-running period, "
                "or a phased cutover strategy? Absent for a risk-minimisation client = MAJOR."
            ),
        },
    ],
    "Innovation": [
        {
            "check": "Novel approaches highlighted with specific evidence",
            "detail": (
                "For an innovation-focused client, the proposal must demonstrate genuinely novel thinking — "
                "not just technology name-dropping. Is there a specific approach, methodology, or "
                "architectural pattern that is distinctive to this vendor? 'We will use AI' without "
                "specifying how = MAJOR. 'We will use a transformer-based anomaly detection model "
                "trained on your historical transaction data' = COVERED."
            ),
        },
        {
            "check": "Differentiation from standard approaches is explicit",
            "detail": (
                "Does the proposal explain why this approach is better than the conventional way of "
                "solving this problem? The 'so what' of the innovation must be stated: faster, cheaper, "
                "more accurate, more scalable — with evidence or rationale."
            ),
        },
        {
            "check": "Future-state vision or roadmap presented",
            "detail": (
                "Innovation clients are not just buying a solution — they are buying a direction. "
                "Is there a vision for where this engagement leads? A product roadmap, an evolution path, "
                "or a strategic next step beyond the immediate scope?"
            ),
        },
    ],
    "Quality": [
        {
            "check": "Explicit quality assurance plan or testing strategy described",
            "detail": (
                "A quality-focused client expects to see HOW quality will be achieved — not just "
                "that testing will happen. The proposal must describe: what types of testing are "
                "included (unit, integration, UAT, regression, performance), who is responsible, "
                "when each phase occurs, and what the entry/exit criteria are.\n"
                "BAD: 'Unit and End-to-end Testing' as a row in a Gantt chart = PARTIAL.\n"
                "GOOD: Explicit QA strategy with named phases, test coverage targets, and "
                "defect resolution process = COVERED.\n"
                "A timeline that mentions testing without describing the quality approach = MAJOR gap."
            ),
        },
        {
            "check": "Quality metrics and acceptance criteria are defined",
            "detail": (
                "For a quality priority, 'the client defines acceptance criteria' is not sufficient — "
                "the vendor must propose measurable quality targets:\n"
                "  - Accuracy rates for AI/OCR outputs (e.g., invoice extraction accuracy ≥ 95%)\n"
                "  - Defect density targets or defect escape rates\n"
                "  - UAT pass rates before go-live\n"
                "  - SLA for defect resolution during hyper-care\n"
                "If no quality metrics are proposed anywhere in the document, flag as MAJOR."
            ),
        },
        {
            "check": "Post-go-live quality monitoring plan described",
            "detail": (
                "Quality does not end at go-live. A quality-focused client wants to know how "
                "quality will be monitored after deployment:\n"
                "  - How will the AI model's accuracy be monitored in production?\n"
                "  - What is the process if accuracy degrades below an acceptable threshold?\n"
                "  - Is there a structured hyper-care period with named SLAs?\n"
                "The proposal mentions a 4-week hyper-care period — check whether it has a "
                "defined quality monitoring process or is just 'we will monitor the system'."
            ),
        },
        {
            "check": "Team quality credentials or quality process maturity mentioned",
            "detail": (
                "Does the proposal reference any quality process certifications or practices "
                "that give confidence in delivery quality? ISO 9001, CMMI, code review processes, "
                "automated testing practices, or QA team structure with named QC Engineer.\n"
                "Absent entirely for a quality-focused client = MINOR gap."
            ),
        },
    ],
    "Proven Track Record": [
        {
            "check": "Case studies are named, specific, and measurable",
            "detail": (
                "For a track-record client, case studies are the most important section of the proposal. "
                "Each case study must have: a named client (or credibly anonymised), the specific problem "
                "solved, the approach taken, and a measurable outcome ('reduced processing time by 40%', "
                "'went live 2 weeks ahead of schedule', 'zero production incidents in first 6 months'). "
                "'We have worked with large enterprises in financial services' = CRITICAL failure."
            ),
        },
        {
            "check": "Case studies are relevant to this engagement",
            "detail": (
                "Are the case studies from the same or similar industry? Similar scale? Similar "
                "technology? A healthcare case study presented to a retail client scores lower than "
                "a directly relevant retail case study. Check relevance explicitly."
            ),
        },
        {
            "check": "Team credentials are named and relevant",
            "detail": (
                "Are the key team members named with specific credentials relevant to this engagement? "
                "Not just roles and years of experience — specific past engagements, certifications, "
                "or domain expertise that directly applies here."
            ),
        },
        {
            "check": "References or awards mentioned where available",
            "detail": (
                "Client testimonials, industry awards, analyst recognition, or reference availability "
                "are strong signals for a track-record client. Absent entirely = flag as a gap."
            ),
        },
    ],
}


def get_checks_for_priorities(priorities: list[str]) -> dict[str, list[dict]]:
    """Returns only the checks relevant to the selected priorities."""
    return {p: CLIENT_PRIORITY_CHECKS[p] for p in priorities if p in CLIENT_PRIORITY_CHECKS}


def is_active(client_priorities: list[str]) -> bool:
    """Returns True if at least one selected priority has known checks."""
    return any(p in CLIENT_PRIORITY_CHECKS for p in client_priorities)


def build_priority_prompt_block(priorities: list[str]) -> str:
    """
    Returns the client priority checks as a prompt-ready string,
    filtered to only the priorities the user selected.
    Returns empty string if no matching priorities.
    """
    relevant = get_checks_for_priorities(priorities)
    if not relevant:
        return ""

    lines = []
    for priority, checks in relevant.items():
        lines.append(f"\n{priority.upper()} (client selected this as a top priority):")
        for c in checks:
            lines.append(f"  ▸ {c['check']}: {c['detail']}")
    return "\n".join(lines)
