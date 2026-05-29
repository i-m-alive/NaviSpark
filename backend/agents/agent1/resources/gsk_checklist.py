"""
GSK Proposal Checklist — 22 items.
Source of truth for Section Completeness Audit (Skill 1.1).
"""

GSK_CHECKLIST = [
    {
        "id": "P-01",
        "section": "Functional Requirements Understanding",
        "mandatory": True,
        "description": (
            "Does the proposal show it has understood what the system must DO? "
            "Functional requirements, use cases, user stories, or feature breakdown must be present. "
            "Vague statements like 'we understand your requirements' do NOT qualify as COVERED."
        ),
    },
    {
        "id": "P-02",
        "section": "Non-Functional Requirements",
        "mandatory": True,
        "description": (
            "Performance, scalability, security, availability, reliability, and compliance constraints. "
            "Must name at least some specifics — 'we will ensure scalability' alone = PARTIAL."
        ),
    },
    {
        "id": "P-03",
        "section": "Clarification Areas & Assumptions Noted",
        "mandatory": False,
        "description": (
            "Questions the vendor still has, open items awaiting client response. "
            "Absence is not fatal but reduces trust in the vendor's diligence."
        ),
    },
    {
        "id": "P-04",
        "section": "Requirements Prioritisation Criteria",
        "mandatory": False,
        "description": (
            "MoSCoW or equivalent framework applied to requirements. "
            "Helps the client understand what gets built in which phase."
        ),
    },
    {
        "id": "P-05",
        "section": "Proposed Scope of Work",
        "mandatory": True,
        "description": (
            "What exactly is the vendor committing to deliver? Specific deliverables listed. "
            "'We will deliver the project per the RFP' = MISSING. A named deliverable list = COVERED."
        ),
    },
    {
        "id": "P-06",
        "section": "Areas Outside Proposed Scope (Out of Scope)",
        "mandatory": True,
        "description": (
            "What is explicitly excluded? Must be stated clearly, not implied. "
            "Missing this section is a Critical flag — it is the leading cause of scope disputes."
        ),
    },
    {
        "id": "P-07",
        "section": "Requirements Matrix (colour-coded coverage)",
        "mandatory": False,
        "description": (
            "A matrix mapping each RFP requirement to a status in the proposal. "
            "If absent, flag as Major and note it should be created."
        ),
    },
    {
        "id": "P-08",
        "section": "Work Responsibility Distribution",
        "mandatory": True,
        "description": (
            "Who does what — vendor vs client vs third party for each deliverable or work stream. "
            "Unclear ownership means disputes after contract signing."
        ),
    },
    {
        "id": "P-09",
        "section": "Logical / Functional Solution Architecture",
        "mandatory": True,
        "description": (
            "How the solution works at a business/logical level. "
            "Diagrams or clear prose description — not just tech stack names."
        ),
    },
    {
        "id": "P-10",
        "section": "Technical Solution Architecture",
        "mandatory": True,
        "description": (
            "The actual technology architecture: components, layers, integrations, infrastructure. "
            "Must be specific — 'cloud-based microservices' alone = PARTIAL."
        ),
    },
    {
        "id": "P-11",
        "section": "Sample Solution Screens or Mockups",
        "mandatory": False,
        "description": (
            "Visual mockups or wireframes of the proposed solution UI. "
            "Absence is noted but not critical."
        ),
    },
    {
        "id": "P-12",
        "section": "Technology Stack with Role Justification",
        "mandatory": True,
        "description": (
            "What tech is being used AND WHY each choice was made for this client. "
            "'We will use React' alone = PARTIAL. "
            "'We chose React because your team is already familiar with it' = COVERED."
        ),
    },
    {
        "id": "P-13",
        "section": "Benefits Framed as Client Outcomes",
        "mandatory": True,
        "description": (
            "Benefits must be stated from the CLIENT's perspective, not vendor capabilities. "
            "BAD: 'We will build a reporting module.' "
            "GOOD: 'Your finance team will have real-time P&L visibility, reducing close time by 3 days.' "
            "Quantified outcomes are better than qualitative statements."
        ),
    },
    {
        "id": "P-14",
        "section": "Dependencies on Customer or Third Parties",
        "mandatory": True,
        "description": (
            "What does the vendor need from the client or third parties to deliver? "
            "Must specify: what is needed, by when, and the consequence of delay. "
            "Vague 'client cooperation required' = PARTIAL."
        ),
    },
    {
        "id": "P-15",
        "section": "Schedule and Delivery Milestones",
        "mandatory": True,
        "description": (
            "A timeline with named milestones and delivery dates or phases. "
            "'6 months' alone = PARTIAL. Named milestone list with phases = COVERED."
        ),
    },
    {
        "id": "P-16",
        "section": "Assumptions and Impact if Wrong",
        "mandatory": True,
        "description": (
            "Explicit assumptions listed. For EACH assumption: what happens if it is incorrect. "
            "Listing assumptions without consequence = PARTIAL."
        ),
    },
    {
        "id": "P-17",
        "section": "Deliverables List with Description",
        "mandatory": True,
        "description": (
            "Each deliverable named and described. "
            "'Phase 1 completion' alone = PARTIAL. "
            "'Deployed API with authentication, tested to 99.9% uptime SLA' = COVERED."
        ),
    },
    {
        "id": "P-18",
        "section": "Case Studies of Similar Work",
        "mandatory": True,
        "description": (
            "Evidence of past similar work. Must be specific: "
            "named client (or anonymised sector), outcome, and relevance to this engagement. "
            "'We have worked with large enterprises' = MISSING."
        ),
    },
    {
        "id": "P-19",
        "section": "Commercial Plan (Cost Overview)",
        "mandatory": True,
        "description": (
            "High-level cost summary visible to the client. "
            "Must show total engagement cost."
        ),
    },
    {
        "id": "P-19a-d",
        "section": "Cost Breakdown: Delivery / S&M / Dev Infra / Prod Infra",
        "mandatory": True,
        "description": (
            "Four separate cost lines must be present: "
            "(a) solution development & delivery, "
            "(b) support & maintenance, "
            "(c) development infrastructure, "
            "(d) production infrastructure. "
            "A single lump sum without these four lines = PARTIAL."
        ),
    },
    {
        "id": "P-20",
        "section": "Risk Register with Mitigation",
        "mandatory": True,
        "description": (
            "Risks identified. Each risk must have a named mitigation, not just acknowledgement. "
            "BAD: 'Resource availability risk — we will manage this.' "
            "GOOD: 'If key architect is unavailable, backup resource X is pre-identified and briefed.'"
        ),
    },
    {
        "id": "P-21",
        "section": "What Vendor Needs from Client Before Start",
        "mandatory": True,
        "description": (
            "Pre-project readiness list: what the client must provide, decide, or make available before work begins. "
            "This is separate from ongoing dependencies (P-14). "
            "Must be specific: access to systems, named decision-makers, reference documents, approvals."
        ),
    },
    {
        "id": "P-22",
        "section": "Reference Documents Cited",
        "mandatory": True,
        "description": (
            "Any RFP, SOW, or reference documents explicitly cited and acknowledged. "
            "Shows the vendor read and engaged with the brief, not just submitted a templated response."
        ),
    },
]

MANDATORY_ITEMS = [item for item in GSK_CHECKLIST if item["mandatory"]]
OPTIONAL_ITEMS = [item for item in GSK_CHECKLIST if not item["mandatory"]]

def build_checklist_prompt_block() -> str:
    """Returns the formatted checklist as a prompt-ready string."""
    lines = []
    lines.append("THE 22 GSK PROPOSAL CHECKLIST ITEMS:\n")
    lines.append("MANDATORY items (MISSING = Critical flag; PARTIAL = Major flag):")
    for item in MANDATORY_ITEMS:
        lines.append(f"\n  {item['id']} | {item['section']}")
        lines.append(f"        {item['description']}")
    lines.append("\nOPTIONAL items (MISSING = Minor flag, worth noting):")
    for item in OPTIONAL_ITEMS:
        lines.append(f"\n  {item['id']} | {item['section']}")
        lines.append(f"        {item['description']}")
    return "\n".join(lines)
