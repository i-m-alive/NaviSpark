"""
GSK Estimation Checklist — Rigour items (E1–E4, E11, E12).
Source of truth for Estimation Rigour check (Skill 2.1).
E5 (reuse/IP) is in its own resource file and used by Skill 2.3.
E6–E24 (phase coverage) are in phase_list.py and used by Skill 2.2.
"""

ESTIMATION_RIGOUR_ITEMS = [
    {
        "id": "E1",
        "description": (
            "Work breakdown structure — is the estimate a detailed work breakdown "
            "(by phase, module, or work package) rather than a single lump-sum figure? "
            "A lump sum with no breakdown is MISSING. A vague breakdown with no effort "
            "per item is PARTIAL."
        ),
        "mandatory": True,
    },
    {
        "id": "E2",
        "description": (
            "Clarity level per requirement — is each requirement, user story, or feature "
            "assigned a clarity level (Low / Medium / High)? This documents how well-understood "
            "each item is at estimation time. Absence means the team cannot justify contingency "
            "or communicate risk to the client."
        ),
        "mandatory": True,
    },
    {
        "id": "E3",
        "description": (
            "Complexity level per requirement — is each requirement assigned a complexity rating "
            "(e.g., Low / Medium / High or story points)? Required alongside clarity level to "
            "justify effort estimates. Absence = estimates have no auditable basis."
        ),
        "mandatory": True,
    },
    {
        "id": "E4",
        "description": (
            "Contingency linked to clarity and complexity — is the contingency percentage derived "
            "from, and explicitly linked to, the clarity and complexity assessments? "
            "A flat percentage (e.g., '10% contingency') with no derivation = PARTIAL. "
            "No contingency at all on a fixed-price engagement = CRITICAL."
        ),
        "mandatory": True,
    },
    {
        "id": "E11",
        "description": (
            "Historical reference baselines — are past similar projects cited to validate the "
            "estimate? Named examples (even anonymised as 'a similar fintech project') provide "
            "credibility. Absence weakens the estimate's defensibility, especially under client "
            "scrutiny or negotiation."
        ),
        "mandatory": False,
    },
    {
        "id": "E12",
        "description": (
            "Estimation assumptions match proposal body — do the assumptions listed in the "
            "estimation section exactly match the assumptions stated in the proposal narrative? "
            "ANY mismatch is CRITICAL: it reveals internal inconsistency and exposes the vendor "
            "to 'which version governs?' disputes after contract signing. "
            "Check explicitly: scope boundary, integration scope, data migration scope, "
            "client-provided resources, and timeline assumptions."
        ),
        "mandatory": True,
    },
]

MANDATORY_RIGOUR_ITEMS = [item for item in ESTIMATION_RIGOUR_ITEMS if item["mandatory"]]
OPTIONAL_RIGOUR_ITEMS = [item for item in ESTIMATION_RIGOUR_ITEMS if not item["mandatory"]]


def build_estimation_prompt_block() -> str:
    """Returns the estimation rigour checklist as a prompt-ready string."""
    lines = ["THE GSK ESTIMATION RIGOUR ITEMS:\n"]
    lines.append("MANDATORY items (MISSING = Critical flag; PARTIAL = Major flag):")
    for item in MANDATORY_RIGOUR_ITEMS:
        lines.append(f"\n  {item['id']} | {item['description']}")
    lines.append("\nOPTIONAL items (MISSING = Minor flag, worth noting):")
    for item in OPTIONAL_RIGOUR_ITEMS:
        lines.append(f"\n  {item['id']} | {item['description']}")
    return "\n".join(lines)
