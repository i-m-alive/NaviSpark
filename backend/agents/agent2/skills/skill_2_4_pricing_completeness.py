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

MANDATORY RULE — P3a AND P3b MUST ALWAYS BE CHECKED:
These two items are checked in every proposal regardless of other gaps:

P3a (Solution development & delivery cost):
  The delivery cost line must be a standalone named item covering ONLY development
  and delivery — not bundled with testing, deployment, or support.
  A line such as "Solution requirement detailing, technical design, solution development,
  testing and deployment across 10 weeks — USD 144,000" bundles multiple cost types
  into one. This is P3a PARTIAL. Flag it as MAJOR.

P3b (Warranty cost separately itemised):
  After go-live, the vendor typically provides a warranty period before S&M begins.
  This must be costed separately from ongoing support. A "Post go-live hyper-care
  support" line that covers both the warranty period and any subsequent support
  bundled together = P3b MAJOR. The client cannot tell when warranty ends and
  billable S&M begins.

Do NOT skip P3a or P3b — they must appear in every pricing_issues array if not
properly itemised. If both P3a and P3b are correctly separated with individual cost
lines, return them as COVERED (omit from pricing_issues). But if they are bundled,
they MUST be flagged.

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

ADDITIONAL RULE — AI / LLM API USAGE COSTS:
If the proposal uses a cloud-hosted AI/LLM API (Anthropic Claude, OpenAI, Azure OpenAI,
AWS Bedrock, Google Gemini, or equivalent), the ONGOING API usage cost is a recurring
production infrastructure expense that must be estimated and disclosed.
  - For invoice or document processing solutions: estimate the cost per document × expected
    monthly volume (e.g., 2,400 invoices/month × estimated tokens per invoice × API price).
  - This cost falls under P10 (production infrastructure) as a recurring variable cost.
  - A proposal that uses LLM APIs but states only that "cloud services will be billed directly
    to the client" without estimating the LLM API cost = MAJOR gap under P10.
    The client cannot budget without knowing approximate API call volume and cost.
  - If no LLM APIs are used, this check does not apply.

ADDITIONAL RULE — THIRD-PARTY RESELLING / PASS-THROUGH COSTS:
If the proposal includes third-party licensed software, SaaS platforms, or cloud services
that will be resold or passed through to the client, these must be disclosed:
  - AWS/Azure/GCP services billed directly to client: acknowledge and estimate (P10).
  - Any SaaS subscription (Langfuse, monitoring tools, OCR services) used in production:
    must be estimated as part of recurring production cost.

IMPORTANT:
- Do NOT check P3d or P4b in this skill — those are internal items covered by Skill 2.7.
- Every issue must reference the specific missing or unclear pricing line.
- If all pricing items are present and correctly separated, return an empty array.
"""
