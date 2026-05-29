"""
Skill 2.1 — Estimation Rigour
Checks whether the proposal's effort estimate is built on a defensible methodology.
Covers GSK Estimation items E1, E2, E3, E4, E11, E12.
"""

from agents.agent2.resources.estimation_checklist import build_estimation_prompt_block

RESULT_KEYS = ["estimation_issues"]

OUTPUT_SCHEMA = {
    "estimation_issues": [
        {
            "skill": "2.1",
            "gsk_item": "E1 | E2 | E3 | E4 | E11 | E12",
            "issue": "string — specific description of the estimation rigour problem",
            "severity": "CRITICAL | MAJOR | MINOR",
            "recommendation": "string — specific, actionable fix",
        }
    ]
}


def get_prompt_section() -> str:
    checklist_block = build_estimation_prompt_block()
    return f"""
═══════════════════════════════════════════════════
SKILL 2.1 — ESTIMATION RIGOUR
═══════════════════════════════════════════════════

Evaluate whether the proposal's effort estimate has a defensible methodology.
A well-rigoured estimate can be explained, challenged, and defended in a client meeting.
A lump sum cannot. Flag every gap between what the estimate contains and what it should contain.

{checklist_block}

SEVERITY RULES:
- E1 absent (lump sum only): CRITICAL — no basis for client to evaluate value for money
- E2 or E3 absent: MAJOR — estimate cannot be justified under scrutiny
- E4 absent or flat contingency without rationale: MAJOR on fixed price, MINOR on T&M
- E11 absent: MINOR — note it, but not a blocker
- E12 mismatch (estimation assumptions ≠ proposal body assumptions): CRITICAL — this is the single
  most dangerous inconsistency. Check explicitly for scope boundary, integration scope, data
  migration assumptions, client-resource assumptions, and timeline assumptions.
  If you find ANY mismatch, flag it as CRITICAL with a specific quote from each conflicting section.

IMPORTANT RULES:
- Only flag items that are genuinely absent or inconsistent — do not flag items that are present.
- Every issue must quote or reference specific text from the proposal (or note its absence precisely).
- If the estimate is thorough and rigorous, return an empty array for these items.
- E12 check: read both the estimation section and the proposal assumptions section carefully.
  If they contain different scope boundaries or different assumptions, flag them both with quotes.
"""
