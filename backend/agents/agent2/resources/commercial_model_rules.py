"""
Commercial model risk rules for Skill 2.5.
Keyed by PROPOSAL_TYPE — mirrors industry_factors.py structure.
Provides risk rules for each commercial model type so the agent can evaluate
whether the chosen model is appropriate for the scope described.
"""

COMMERCIAL_MODEL_RISKS: dict[str, dict] = {
    "Fixed Price": {
        "scope_requirement": "Fully defined, frozen requirements with no significant open items.",
        "risk_profile": "HIGH RISK when scope is ambiguous. Vendor absorbs all unknowns.",
        "red_flags": [
            "Scope section contains open assumptions or items marked TBD",
            "Requirements are described at a high level without detailed user stories or specifications",
            "Integration scope with third-party or client systems is not fully defined",
            "Proposal acknowledges a 'discovery phase' — implying scope is not yet known",
            "Number of screens, APIs, or integrations is not stated (open-ended scope)",
        ],
        "payment_schedule_requirement": (
            "Payment milestones must be tied to named, verifiable deliverables. "
            "Calendar-date payments (e.g., 'Month 2 payment') on a Fixed Price engagement "
            "means the client pays regardless of delivery progress — flag as MAJOR."
        ),
        "rate_card_note": (
            "Rate card is strongly recommended for change order pricing. "
            "Without it, any scope change requires fresh negotiation."
        ),
        "appropriate_when": "Requirements are fully specified, signed off, and unlikely to change.",
        "inappropriate_when": "Requirements are evolving, integrations are partially defined, or a discovery phase is planned.",
    },
    "Time & Materials (T&M)": {
        "scope_requirement": "Well-defined outcome and budget ceiling, but flexible on detailed scope.",
        "risk_profile": "LOW vendor risk but HIGH client risk. Client bears all cost overrun.",
        "red_flags": [
            "Scope is well-defined and frozen — T&M shifts all risk to client unnecessarily",
            "No budget cap or not-to-exceed clause stated — open-ended cost commitment",
            "No rate card provided — client cannot compare or challenge billing",
            "No governance cadence for time-sheet review and approval stated",
        ],
        "payment_schedule_requirement": (
            "Billing should be periodic (weekly/fortnightly) against approved timesheets. "
            "Must state the timesheet approval process."
        ),
        "rate_card_note": (
            "Rate card is MANDATORY for T&M. Without it, the engagement has no cost governance."
        ),
        "appropriate_when": "Scope is exploratory, requirements are emerging, or the client wants flexibility.",
        "inappropriate_when": "Scope is fixed and well-defined — use Fixed Price or Milestone instead.",
    },
    "Retainer": {
        "scope_requirement": "Ongoing services with broadly defined capacity rather than specific deliverables.",
        "risk_profile": "MEDIUM. Risk is in scope creep within the retainer.",
        "red_flags": [
            "No clear definition of what is included and excluded within the retainer",
            "No cap on hours or capacity within the retainer period",
            "No process for managing requests that exceed retainer capacity",
            "No renewal or exit clause stated",
        ],
        "payment_schedule_requirement": (
            "Retainer fees are typically monthly in advance. Must state the billing date and "
            "what happens to unused capacity at month end."
        ),
        "rate_card_note": (
            "Rate card is recommended for work outside the retainer scope."
        ),
        "appropriate_when": "Ongoing advisory, support, or small enhancement work with variable monthly demand.",
        "inappropriate_when": "A defined project with a start and end date — use Fixed Price or Milestone.",
    },
    "Milestone-based": {
        "scope_requirement": "Clear deliverables at each milestone, with acceptance criteria.",
        "risk_profile": "MEDIUM. Risk is in milestone definition and acceptance criteria.",
        "red_flags": [
            "Milestones are defined by date rather than named deliverable",
            "No acceptance criteria stated for each milestone — subjective completion",
            "No process for handling partial acceptance or disputed milestones",
            "Final milestone payment is tied to go-live — creates dependency on client readiness",
        ],
        "payment_schedule_requirement": (
            "Each milestone payment must name the specific deliverable and its acceptance criteria. "
            "'Month 3 — 30% payment' is NOT acceptable."
        ),
        "rate_card_note": (
            "Rate card is recommended for change requests between milestones."
        ),
        "appropriate_when": "Project with clear phase gates and named deliverables at each gate.",
        "inappropriate_when": "Exploratory or R&D work without defined deliverables.",
    },
    "Government RFP": {
        "scope_requirement": "Fully compliant with RFP specification. No deviation without formal approval.",
        "risk_profile": "HIGH compliance risk. Non-compliance with RFP requirements can disqualify the bid.",
        "red_flags": [
            "Proposal does not explicitly map to each RFP requirement (no compliance matrix)",
            "Deviations from RFP specification are not declared and justified",
            "Payment terms differ from those stated in the RFP without explanation",
            "Local content, SME participation, or social value requirements not addressed",
            "Bid bond, performance bond, or insurance requirements not acknowledged",
        ],
        "payment_schedule_requirement": (
            "Government payment terms are typically defined by the RFP (e.g., 30/60/90 days). "
            "Proposal must conform to these terms, not impose vendor-preferred terms."
        ),
        "rate_card_note": (
            "Rate card is often mandatory in government RFPs for change control and extensions."
        ),
        "appropriate_when": "Responding to a formal government or public sector procurement.",
        "inappropriate_when": "This model is not a choice — it is mandated by the RFP.",
    },
    "Other": {
        "scope_requirement": "Must be explicitly defined in the proposal.",
        "risk_profile": "Unknown without definition.",
        "red_flags": [
            "Commercial model labelled as 'Other' or 'Hybrid' without explanation of what it means",
            "No clear statement of which elements are fixed and which are variable",
        ],
        "payment_schedule_requirement": (
            "The custom commercial model must explicitly state how and when payments are triggered."
        ),
        "rate_card_note": (
            "Rate card is recommended whenever a non-standard model is used."
        ),
        "appropriate_when": "A bespoke hybrid model is genuinely the best fit and is fully defined.",
        "inappropriate_when": "Used as a catch-all to avoid committing to a model.",
    },
}


def get_rules_for_model(proposal_type: str) -> dict | None:
    """Returns risk rules for the given proposal type. Returns None if not found."""
    return COMMERCIAL_MODEL_RISKS.get(proposal_type)


def build_commercial_model_prompt_block(proposal_type: str) -> str:
    """
    Returns the risk rules for the selected proposal type as a prompt-ready string.
    If the proposal_type is not in the known list, returns a generic instruction.
    """
    rules = get_rules_for_model(proposal_type)
    if not rules:
        return (
            f"COMMERCIAL MODEL: '{proposal_type}'\n"
            "This model type is not in the standard list. Evaluate whether the commercial model "
            "is clearly defined, appropriate for the scope described, and has a clear payment schedule."
        )

    lines = [
        f"COMMERCIAL MODEL RISK RULES FOR: {proposal_type.upper()}",
        f"\nScope requirement: {rules['scope_requirement']}",
        f"Risk profile: {rules['risk_profile']}",
        f"\nAppropriate when: {rules['appropriate_when']}",
        f"Inappropriate when: {rules['inappropriate_when']}",
        f"\nPayment schedule requirement: {rules['payment_schedule_requirement']}",
        f"\nRate card: {rules['rate_card_note']}",
        "\nRED FLAGS to check for this model type:",
    ]
    for flag in rules["red_flags"]:
        lines.append(f"  - {flag}")

    return "\n".join(lines)
