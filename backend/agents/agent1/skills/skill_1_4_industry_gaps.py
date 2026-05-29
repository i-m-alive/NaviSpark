"""
Skill 1.4 — Client-Specific Completeness
Checks for industry-specific sections a client in that vertical would expect
but are not on the generic GSK checklist.
Only activates if the client's industry is in the known industry list.
"""

from agents.agent1.resources.industry_factors import (
    INDUSTRY_FACTORS,
    build_industry_prompt_block,
)

RESULT_KEYS = ["client_specific_gaps"]

OUTPUT_SCHEMA = {
    "client_specific_gaps": [
        {
            "industry_lens": "string — the industry this gap applies to",
            "gap": "string — specific element that is missing or insufficient",
            "why_it_matters": "string — why a client in this industry would expect this",
            "severity": "MAJOR | MINOR",
        }
    ]
}

def is_active(client_industries: list[str]) -> bool:
    """Returns True if at least one selected industry has known factors."""
    return any(ind in INDUSTRY_FACTORS for ind in client_industries)

def get_prompt_section(client_industries: list[str]) -> str:
    """
    Returns the industry-specific completeness prompt section,
    filtered to only the relevant industries.
    Returns empty string if no matching industries (caller should skip this skill).
    """
    industry_block = build_industry_prompt_block(client_industries)
    if not industry_block:
        return ""

    return f"""
═══════════════════════════════════════════════════
SKILL 1.4 — CLIENT-SPECIFIC COMPLETENESS
═══════════════════════════════════════════════════

A client in a specific industry will expect certain sections that are NOT on the generic checklist.
Their absence signals the vendor does not understand the industry.

Check the following industry-specific factors for the CLIENT_INDUSTRY indicated in the user message.
A missing factor = MAJOR severity. A superficial mention without substance = MINOR severity.

REQUIRED FACTORS FOR THE SELECTED INDUSTRIES:
{industry_block}

RULES:
- Check ALL factors listed above for the selected industries.
- A missing factor = MAJOR severity.
- A superficial mention without substance (e.g., "we comply with all regulations" without naming them) = MINOR.
- Your note must reference what IS or IS NOT present in the document.
- If ALL factors are addressed, return an empty array.
"""
