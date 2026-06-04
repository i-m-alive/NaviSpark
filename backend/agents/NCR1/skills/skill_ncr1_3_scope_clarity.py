"""
NCR1 Skill 3 — Scope Clarity Checker

Evaluates whether the project scope is unambiguous and well-defined:
in-scope/out-of-scope boundaries, assumption quality, and scope creep risk.
"""

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL NCR1.3 — SCOPE CLARITY CHECKER
═══════════════════════════════════════════════════

Evaluate whether the proposal defines the project scope with enough precision
that both client and vendor can agree on what is and is not included — and what
would constitute a change request.

FOUR AREAS TO EVALUATE:

1. IN-SCOPE DEFINITION
   Is the in-scope work clearly described as specific deliverables, features, or capabilities?
   Vague language like "we will build a comprehensive solution" is NOT clear scope.
   Clear scope: "We will develop and deploy modules A, B, and C as defined in Section 3."
   Severity if missing: CRITICAL.

2. OUT-OF-SCOPE STATEMENT
   Does the proposal explicitly state what is NOT included?
   Without an out-of-scope section, clients often assume everything is included.
   This is the single largest source of engagement disputes.
   Severity if missing: CRITICAL.
   Severity if vague (e.g., "anything not mentioned above"): MAJOR.

3. ASSUMPTIONS WITH CONSEQUENCES
   Are assumptions listed? Does each assumption state what happens if it proves incorrect?
   BAD: "We assume the client will provide timely access to the legacy system."
   GOOD: "We assume legacy system access by Week 2. If delayed, timeline extends proportionally."
   An assumption without a consequence statement = PARTIAL.
   Severity if no assumptions section on a complex engagement: MAJOR.

4. SCOPE CREEP RISK INDICATORS
   Look for language patterns that invite scope creep:
     - "and any other related work" — vague catch-all
     - "as required by the client" — unlimited obligation
     - "all necessary" — undefined quantity
     - Phase outcomes defined as activities ("complete the design phase") not artifacts
       ("deliver signed-off technical design document")
   Flag each indicator with its location and the specific risk it creates.

SEVERITY RULES:
- CRITICAL: Missing out-of-scope section, or in-scope so vague it cannot be verified.
- MAJOR:    Out-of-scope present but vague; assumptions without consequences; creep indicators.
- MINOR:    Minor ambiguity in a low-risk area; single unclear phrase.

HIGH-RISK ASSUMPTIONS — flag these separately:
For each assumption in the proposal, assess the risk if it proves wrong.
High-risk assumptions are those where being wrong would significantly change
scope, cost, or timeline. Output as high_risk_assumptions array.

RULES:
- Every scope_clarity_issue MUST reference specific text from the proposal.
- Every high_risk_assumption MUST state what would happen to scope/cost/timeline if wrong.
- If the scope is genuinely clear and complete, return empty arrays for both fields.
"""
