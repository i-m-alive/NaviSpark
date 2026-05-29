"""
Skill 3.6 — Industry Win Factors
Evaluates whether the proposal addresses the specific factors that drive purchasing
decisions in the client's industry — a higher bar than mere presence (Agent 1 Skill 1.4).
Dynamically calibrated by CLIENT_INDUSTRY — mirrors how Agent 1's Skill 1.4 is calibrated.
"""

from agents.agent3.resources.industry_win_factors import (
    INDUSTRY_WIN_FACTORS,
    build_win_factor_prompt_block,
    is_active,
)

RESULT_KEYS = ["industry_findings"]

OUTPUT_SCHEMA = {
    "industry_findings": [
        {
            "factor": "string — the specific industry win factor being assessed",
            "finding": "present | absent | weak",
            "severity": "CRITICAL | MAJOR | MINOR",
        }
    ]
}


def get_prompt_section(client_industries: list[str]) -> str:
    """
    Returns the industry win factors prompt section,
    filtered to only the relevant industries.
    Returns a generic section if no matching industries.
    """
    win_factor_block = build_win_factor_prompt_block(client_industries)
    industries_str = ", ".join(client_industries) if client_industries else "Not specified"

    if not win_factor_block:
        return f"""
═══════════════════════════════════════════════════
SKILL 3.6 — INDUSTRY WIN FACTORS
═══════════════════════════════════════════════════

CLIENT INDUSTRY: {industries_str}

No specific win factors defined for the stated industry.
Evaluate whether the proposal demonstrates genuine industry awareness:
  - Does it use the industry's language and frame problems in industry terms?
  - Does it address sector-specific risks or compliance requirements?
  - Are case studies from the same or similar industry?

If the industry is mentioned in the proposal but without meaningful industry-specific content,
add a MINOR industry_finding.
"""

    return f"""
═══════════════════════════════════════════════════
SKILL 3.6 — INDUSTRY WIN FACTORS
═══════════════════════════════════════════════════

CLIENT INDUSTRY: {industries_str}

IMPORTANT DISTINCTION FROM AGENT 1:
Agent 1 checks whether industry-specific SECTIONS ARE PRESENT.
This skill (Agent 3) checks whether those sections are addressed with enough conviction and
specificity to WIN THE DEAL. A section that is present but generic still fails this check.

For each win factor below: rate the proposal as:
  - present: the factor is addressed with specific, credible content
  - weak: the factor is addressed but too vaguely to impress an industry-experienced evaluator
  - absent: the factor is not addressed at all

WIN FACTORS FOR THE SELECTED INDUSTRIES:
{win_factor_block}

SEVERITY RULES:
- A win factor that is completely absent when it is central to the industry = CRITICAL
  (e.g., no compliance framework mentioned for a fintech proposal, no patient safety for healthcare)
- A win factor that is addressed vaguely or generically = MAJOR
- A minor gap in how a win factor is addressed = MINOR

Every industry_finding must state the specific factor and reference what is present (or absent).
If all win factors are well-addressed, return an empty array.
"""
