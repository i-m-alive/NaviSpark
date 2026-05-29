"""
Skill 3.1 — Client Understanding & Fit
Evaluates whether the proposal demonstrates genuine understanding of the client's
business context and directly addresses each stated client priority.
Dynamically calibrated by CLIENT_PRIORITIES — mirrors how Agent 1's Skill 1.4
is calibrated by CLIENT_INDUSTRY.
Covers GSK Proposal items P-01, P-02, P-13.
"""

from agents.agent3.resources.client_priority_checks import (
    CLIENT_PRIORITY_CHECKS,
    build_priority_prompt_block,
    is_active,
)

RESULT_KEYS = ["client_fit_issues"]

OUTPUT_SCHEMA = {
    "client_fit_issues": [
        {
            "priority": "Cost Certainty | Speed to Market | Regulatory Compliance | Risk Minimisation | Innovation | Proven Track Record",
            "issue": "string — specific description of how this priority is unaddressed or weakly addressed",
            "severity": "CRITICAL | MAJOR | MINOR",
            "recommendation": "string — specific, actionable fix starting with a verb",
        }
    ]
}


def get_prompt_section(client_priorities: list[str]) -> str:
    """
    Returns the client fit prompt section, filtered to the selected priorities.
    Returns a generic section if no priorities match the known list.
    """
    priority_block = build_priority_prompt_block(client_priorities)
    priorities_str = ", ".join(client_priorities) if client_priorities else "Not specified"

    if not priority_block:
        return f"""
═══════════════════════════════════════════════════
SKILL 3.1 — CLIENT UNDERSTANDING & FIT
═══════════════════════════════════════════════════

CLIENT PRIORITIES: {priorities_str}

No specific priority checks available for the stated priorities.
Evaluate whether the proposal:
  1. Demonstrates genuine understanding of the client's business context — not just their feature list
  2. Articulates benefits as client outcomes (GSK P-13), not vendor capabilities
  3. Could pass the "name swap test": could this proposal be sent to any other client with just the name changed?
     If yes, flag as CRITICAL with sounds_generic implication.
  4. Addresses the client's likely unstated concerns based on their industry context.

If the proposal fails the name-swap test, add a CRITICAL client_fit_issue.
If all priorities appear addressed, return an empty array.
"""

    return f"""
═══════════════════════════════════════════════════
SKILL 3.1 — CLIENT UNDERSTANDING & FIT
═══════════════════════════════════════════════════

CLIENT PRIORITIES SELECTED: {priorities_str}

A proposal wins when it speaks the client's language and directly addresses what they care about most.
Evaluate the proposal against each priority the client has stated as important.

UNIVERSAL CHECKS (apply regardless of priorities):
  ▸ P-01: Does the proposal show genuine understanding of what the system must DO for this client
    — not just a restatement of the RFP?
  ▸ P-02: Does the proposal understand the client's constraints (regulatory, performance, availability)
    — not just the functional requirements?
  ▸ P-13: Are benefits framed as client outcomes? BAD: "We will build a reporting module."
    GOOD: "Your finance team will have real-time P&L visibility, reducing monthly close time by 3 days."
  ▸ Name-swap test: Could this exact proposal be submitted to any other client in any other industry
    with just the company name changed? If yes, flag as CRITICAL.

PRIORITY-SPECIFIC CHECKS:
{priority_block}

SEVERITY RULES:
- A top-stated priority that is completely absent from the proposal = CRITICAL
- A top-stated priority that is addressed generically without specifics = MAJOR
- A minor gap in how a priority is addressed = MINOR
- If all priorities are well-addressed, return an empty array.

Every issue must reference specific content (or its absence) from the proposal.
"""
