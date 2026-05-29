"""
Cross-agent consistency rules for Task 4.2.
These are injected into the Bedrock prompt so Claude knows exactly which
field-pairs to compare. The LLM performs the semantic comparison; the
rules define WHAT to compare and how to classify the finding.
"""

CONSISTENCY_RULES = [
    {
        "id": "CR-01",
        "check": "Assumptions alignment (A1 ↔ A2)",
        "description": (
            "Compare 'high_risk_assumptions' from Agent 1 against 'estimation_issues' "
            "entries with gsk_item 'E-02' from Agent 2. Flag any proposal assumption that "
            "Agent 2's estimation does NOT account for, and any estimation assumption that "
            "contradicts a risk stated in Agent 1. Both directions matter — missing coverage "
            "in either direction is a Critical finding."
        ),
        "severity_if_found": "CRITICAL",
    },
    {
        "id": "CR-02",
        "check": "Deliverables vs costed scope (A1 ↔ A2)",
        "description": (
            "Compare the deliverables listed in Agent 1's 'section_audit' item P-17 against "
            "the phases costed in Agent 2's 'missing_phases' and 'estimation_issues'. "
            "Flag any deliverable that has no corresponding costed phase, and any costed "
            "phase that produces no named deliverable in the proposal. Mismatches mean the "
            "proposal promises something uncosted or costs something undelivered."
        ),
        "severity_if_found": "MAJOR",
    },
    {
        "id": "CR-03",
        "check": "Team descriptions vs roles costed (A1 ↔ A2)",
        "description": (
            "Compare team/ownership descriptions from Agent 1's 'section_audit' item P-08 "
            "against Agent 2's 'commercial_model_assessment' and role-related 'estimation_issues' "
            "(gsk_item E-20). Flag mismatches in headcount, seniority level, or role types "
            "between what the proposal narrative describes and what is formally costed."
        ),
        "severity_if_found": "MAJOR",
    },
    {
        "id": "CR-04",
        "check": "Timeline vs estimated duration (A1 ↔ A2)",
        "description": (
            "Compare the delivery schedule from Agent 1's 'section_audit' item P-15 against "
            "the duration implied by Agent 2's resource loading estimates (gsk_items E-22, "
            "E-23, E-24) and phase estimates. Flag if the gap between the proposed timeline "
            "and the estimated duration exceeds 20%. A timeline shorter than the effort estimate "
            "implies either unrealistic expectations or hidden crunch."
        ),
        "severity_if_found": "CRITICAL",
    },
    {
        "id": "CR-05",
        "check": "Undisclosed risks (A3 → A1 risk register)",
        "description": (
            "Review Agent 3's 'risk_transparency_issues' findings. Identify any risk that "
            "Agent 3 flagged as absent or vague that corresponds to a GSK P-20 gap in Agent 1's "
            "'section_audit'. These are risks a competitive evaluator can see but that the "
            "formal risk register fails to address — a credibility gap that procurement panels notice."
        ),
        "severity_if_found": "MAJOR",
    },
]
