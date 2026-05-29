"""
GSK Estimation Phase List — 17 delivery phases (E6–E10, E13–E24).
Source of truth for Phase Coverage Check (Skill 2.2).
E11 and E12 are in estimation_checklist.py (used by Skill 2.1).
"""

ESTIMATION_PHASES = [
    {
        "phase_name": "Requirements Detailing",
        "gsk_item": "E6",
        "mandatory": True,
        "description": (
            "Effort for detailed elaboration of requirements — workshops, clarifications, "
            "finalising user stories. Should be its own line item, not absorbed into development."
        ),
    },
    {
        "phase_name": "Technical Design",
        "gsk_item": "E7",
        "mandatory": True,
        "description": (
            "Architecture design, solution design, data model, API design. "
            "Must appear as a separate phase with effort estimate. "
            "Bundling it into 'development' hides a significant risk."
        ),
    },
    {
        "phase_name": "Coding & Unit Testing",
        "gsk_item": "E8",
        "mandatory": True,
        "description": (
            "Core development and unit test effort. Must be broken down by module or workstream, "
            "not a single line. Absence of unit testing in this phase = MAJOR quality risk."
        ),
    },
    {
        "phase_name": "Component Integration & Testing",
        "gsk_item": "E9",
        "mandatory": True,
        "description": (
            "Integration testing between components built by the team. "
            "Often absent from proposals — its absence causes integration failures late in delivery."
        ),
    },
    {
        "phase_name": "Automation of Dev/Test Activities",
        "gsk_item": "E10",
        "mandatory": False,
        "description": (
            "Effort for building automated test suites, CI pipeline setup, and test automation. "
            "Optional but expected in modern delivery — absence should be flagged as a risk."
        ),
    },
    {
        "phase_name": "Documentation",
        "gsk_item": "E13",
        "mandatory": True,
        "description": (
            "Technical documentation, user manuals, runbooks, handover documentation. "
            "Must appear as a costed phase. 'Documentation is included' without effort = PARTIAL."
        ),
    },
    {
        "phase_name": "Module Integration",
        "gsk_item": "E14",
        "mandatory": True,
        "description": (
            "Integration between the modules or microservices built by the team. "
            "Separate from external system integration (E15). "
            "Must have its own effort estimate."
        ),
    },
    {
        "phase_name": "External System Integration",
        "gsk_item": "E15",
        "mandatory": False,
        "description": (
            "Integration with third-party or client systems (ERP, payment gateway, legacy systems). "
            "Mandatory if integrations are in scope. Absent when integrations are in scope = CRITICAL. "
            "Optional only if the proposal explicitly states no external integrations are required."
        ),
    },
    {
        "phase_name": "CI/CD & Release Management",
        "gsk_item": "E16",
        "mandatory": True,
        "description": (
            "Pipeline setup, deployment automation, release planning, environment management. "
            "Must be a costed line item. Absence is a common oversight that emerges as unplanned "
            "effort during delivery."
        ),
    },
    {
        "phase_name": "System Testing",
        "gsk_item": "E17",
        "mandatory": True,
        "description": (
            "End-to-end system testing before UAT. Must be a separate costed phase. "
            "Merged with development = PARTIAL. Absent entirely = CRITICAL — the client will "
            "assume it was included in the price and dispute any change request for it."
        ),
    },
    {
        "phase_name": "UAT & Go-Live Support",
        "gsk_item": "E18",
        "mandatory": True,
        "description": (
            "User acceptance testing support, defect resolution during UAT, go-live activities, "
            "hypercare period. Must be explicitly costed. One of the most frequently omitted "
            "phases — its absence is CRITICAL."
        ),
    },
    {
        "phase_name": "Project Management",
        "gsk_item": "E19",
        "mandatory": True,
        "description": (
            "PM effort throughout the engagement — planning, reporting, stakeholder management, "
            "risk management. Must be costed separately (not bundled into development). "
            "Typically 10–15% of total effort. Absence = CRITICAL."
        ),
    },
    {
        "phase_name": "Team Roles & Headcount",
        "gsk_item": "E20",
        "mandatory": True,
        "description": (
            "Named roles with headcount and allocation percentages. Must reconcile with the "
            "effort estimate. Headcount described in narrative but not in the estimate = PARTIAL. "
            "No headcount at all = CRITICAL."
        ),
    },
    {
        "phase_name": "External Consultancy",
        "gsk_item": "E21",
        "mandatory": False,
        "description": (
            "Any external specialists, sub-contractors, or third-party consultants required. "
            "If mentioned in the proposal body but not costed = MAJOR. "
            "Optional only if no external consultancy is required."
        ),
    },
    {
        "phase_name": "Duration & Basis",
        "gsk_item": "E22",
        "mandatory": True,
        "description": (
            "Overall project duration with the basis for that estimate (e.g., resource loading, "
            "critical path). Must reconcile with resource loading plan. "
            "'6 months' with no basis = PARTIAL."
        ),
    },
    {
        "phase_name": "Resource Loading (Development)",
        "gsk_item": "E23",
        "mandatory": True,
        "description": (
            "A resource loading plan for the development team showing who works when across "
            "the timeline. Required to validate the duration and headcount claims. "
            "Absence = MAJOR — the timeline cannot be verified."
        ),
    },
    {
        "phase_name": "Resource Loading (Support & Maintenance)",
        "gsk_item": "E24",
        "mandatory": False,
        "description": (
            "Resource loading for the post-delivery support & maintenance team. "
            "Required if S&M is in scope. Absent when S&M is in scope = MAJOR. "
            "Optional only if S&M is explicitly out of scope."
        ),
    },
]

MANDATORY_PHASES = [p for p in ESTIMATION_PHASES if p["mandatory"]]
OPTIONAL_PHASES = [p for p in ESTIMATION_PHASES if not p["mandatory"]]


def build_phase_prompt_block() -> str:
    """Returns the 17 estimation phases as a prompt-ready reference string."""
    lines = ["THE 17 GSK ESTIMATION PHASES (E6–E24):\n"]
    lines.append("MANDATORY phases (absent = Critical flag):")
    for phase in MANDATORY_PHASES:
        lines.append(f"\n  {phase['gsk_item']} | {phase['phase_name']}")
        lines.append(f"        {phase['description']}")
    lines.append("\nOPTIONAL phases (absent = Minor/Major depending on scope context):")
    for phase in OPTIONAL_PHASES:
        lines.append(f"\n  {phase['gsk_item']} | {phase['phase_name']}")
        lines.append(f"        {phase['description']}")
    return "\n".join(lines)
