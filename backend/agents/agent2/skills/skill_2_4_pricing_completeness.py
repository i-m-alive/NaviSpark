"""
Skill 2.4 — Pricing Completeness
Checks whether all required pricing line items are present and correctly separated.
Covers GSK Pricing items P3a–P10 (non-internal items only).
Internal items P3d and P4b are handled exclusively by Skill 2.7.
"""

from agents.agent2.resources.pricing_checklist import build_pricing_prompt_block

RESULT_KEYS = ["pricing_issues"]

OUTPUT_SCHEMA = {
    "pricing_issues": [
        {
            "skill": "2.4",
            "gsk_item": "string — e.g. P3a, P6, P10",
            "issue": "string — specific description of the pricing completeness problem",
            "severity": "CRITICAL | MAJOR | MINOR",
            "recommendation": "string — specific, actionable fix",
        }
    ]
}


def get_prompt_section() -> str:
    pricing_block = build_pricing_prompt_block()
    return f"""
═══════════════════════════════════════════════════
SKILL 2.4 — PRICING COMPLETENESS
═══════════════════════════════════════════════════

A complete proposal pricing section shows every cost line the client will ever pay.
Missing cost lines create disputes after contract signing when the vendor raises a
change request for something the client assumed was included.

{pricing_block}

CRITICAL RULE — INFRASTRUCTURE ENVIRONMENTS:
The proposal must cost infrastructure for ALL FOUR environments separately:
  1. Development environment (P7)
  2. Test environment (P8)
  3. QA / pre-production environment (P9)
  4. Production environment (P10)
"Infrastructure costs included" in a single line without naming all four = PARTIAL.
Missing any individual environment = MAJOR.
Missing all four = CRITICAL.

CRITICAL RULE — WARRANTY vs S&M:
Warranty (P3b) must be separately itemised from ongoing Support & Maintenance.
Bundling them together hides when the warranty ends and S&M billing begins.
A client who thinks S&M starts from day one may dispute the warranty period.

SEVERITY RULES:
- Mandatory item completely absent: CRITICAL if it is a cost the client will definitely incur
  (production infrastructure, contingency); MAJOR for other mandatory items
- Mandatory item present but bundled/unclear: MAJOR
- Optional item absent when contextually expected: MINOR

IMPORTANT:
- Do NOT check P3d or P4b in this skill — those are internal items covered by Skill 2.7.
- Every issue must reference the specific missing or unclear pricing line.
- If all pricing items are present and correctly separated, return an empty array.
"""
