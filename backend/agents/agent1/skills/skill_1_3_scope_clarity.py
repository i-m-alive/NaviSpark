"""
Skill 1.3 — Scope Clarity Check
Scope disputes are the leading cause of client relationship breakdowns.
This skill verifies the in/out-of-scope boundary, ownership, and high-risk assumptions.
"""

RESULT_KEYS = ["scope_clarity_issues", "high_risk_assumptions"]

OUTPUT_SCHEMA = {
    "scope_clarity_issues": [
        {
            "issue": "string — specific description of the scope clarity problem",
            "location": "string — section name",
            "quote": "string — the ambiguous text from the proposal, max 40 words",
            "severity": "CRITICAL | MAJOR | MINOR",
            "recommendation": "string — specific, actionable fix",
        }
    ],
    "high_risk_assumptions": [
        {
            "assumption": "string — the exact assumption being made (explicit or implicit)",
            "location": "string — where this assumption appears or is implied",
            "risk_if_wrong": "string — what would happen to scope/cost/timeline if this assumption is incorrect",
        }
    ],
}

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL 1.3 — SCOPE CLARITY CHECK
═══════════════════════════════════════════════════

Scope disputes are the leading cause of client relationship breakdowns after contract signing.
Check the following five dimensions:

1. IN-SCOPE / OUT-OF-SCOPE BOUNDARY
   Is there a clear section that states what IS in scope?
   Is there a clear section that states what is NOT in scope?
   Vague scopes like "we will deliver the project per the RFP" = MISSING. Flag as CRITICAL.
   Missing out-of-scope section entirely = CRITICAL.

2. SCOPE CREEP RISK — requirements that vanish
   Are there requirements mentioned in the executive summary or problem statement
   that do NOT appear in the formal scope section?
   These are scope gaps the client will expect but the vendor hasn't committed to.
   Flag each as CRITICAL with the specific requirement that disappeared.

3. HIGH RISK ASSUMPTIONS
   Are there assumptions that, if wrong, would materially change the scope, cost, or timeline?
   Examples:
   - "We assume the client's existing database schema is compatible with our system"
     — if it isn't, re-engineering could add weeks and significant cost.
   - "We assume the client will provide test data within 2 weeks of project start"
     — if delayed, the entire testing phase shifts.
   Flag these in high_risk_assumptions with the specific consequence.

4. WORK OWNERSHIP CLARITY
   For each major deliverable or work stream: is it clear who owns it — vendor, client, or third party?
   Unclear ownership = MAJOR flag. Quote the specific deliverable where ownership is ambiguous.

5. REQUIREMENTS MATRIX
   Is a requirements matrix (P-07) referenced or included?
   If absent: flag as MAJOR and recommend creating one.

SEVERITY GUIDE FOR SCOPE ISSUES:
- CRITICAL: Creates immediate risk of post-contract dispute or significant rework
- MAJOR: Creates ambiguity that will surface during delivery
- MINOR: Could be clearer but unlikely to cause disputes

RULES:
- Every scope_clarity_issue must quote the specific ambiguous text from the proposal.
- Every high_risk_assumption must name the specific consequence if the assumption is wrong.
- If scope is genuinely well-defined with no issues, return empty arrays.
"""
