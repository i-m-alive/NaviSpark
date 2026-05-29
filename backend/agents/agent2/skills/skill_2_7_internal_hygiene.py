"""
Skill 2.7 — Internal Hygiene Flags
Checks internal commercial governance items that must NEVER appear in client-facing output.
Covers GSK Pricing items P3d (margin targets) and P4b (S&M margin targets).
Output goes to internal_flags ONLY — never to estimation_issues or pricing_issues.
"""

from agents.agent2.resources.pricing_checklist import get_internal_items

RESULT_KEYS = ["internal_flags"]

OUTPUT_SCHEMA = {
    "internal_flags": [
        {
            "check": "P3d | P4b",
            "finding": "string — description of whether the internal requirement is met or missing",
            "severity": "MAJOR | MINOR",
        }
    ]
}


def get_prompt_section() -> str:
    internal_items = get_internal_items()
    items_block = "\n".join(
        f"  {item['id']} | {item['description']}" for item in internal_items
    )
    return f"""
═══════════════════════════════════════════════════
SKILL 2.7 — INTERNAL HYGIENE FLAGS
═══════════════════════════════════════════════════

⚠️  CRITICAL SEPARATION RULE:
These checks are INTERNAL ONLY. Their findings must go EXCLUSIVELY into the internal_flags
array in your output. They must NEVER appear in estimation_issues or pricing_issues.
The system will strip internal_flags from the client-facing PDF report. If you accidentally
include these items in client-facing arrays, the vendor's commercial position is exposed
to the client. This is a critical compliance requirement.

INTERNAL ITEMS TO CHECK:

{items_block}

HOW TO CHECK THESE:
- P3d (Margin targets): Look for evidence that the deal team has calculated margin — this
  may appear as an internal pricing breakdown, a cost-to-deliver line, or a margin % annotation.
  In a client-facing proposal, this will typically NOT be present (it should be in an internal
  pricing model). Flag as MAJOR if there is no evidence it has been calculated at all, based on
  what you can infer from the pricing structure.
  IMPORTANT: Do not look for this in the client-facing sections. If the proposal is purely
  client-facing, note "Cannot confirm from client-facing document — check internal pricing model."

- P4b (S&M margin targets): Same approach as P3d but for the support & maintenance component.
  If S&M pricing is included in the proposal, check whether there is any indication that
  S&M margins have been set separately from delivery margins.

SEVERITY:
- P3d missing evidence: MAJOR
- P4b missing evidence (when S&M is in scope): MAJOR
- P4b missing (when S&M is out of scope): omit from internal_flags entirely

OUTPUT REMINDER:
Your internal_flags array may have 0, 1, or 2 entries — one for each internal item.
Never add non-internal issues to this array.
"""
