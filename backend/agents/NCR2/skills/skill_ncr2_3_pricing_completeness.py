"""
NCR2 Skill 3 — Pricing Completeness Auditor

Checks whether all cost components are documented and the commercial
model is consistent with the delivery approach.
"""

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL NCR2.3 — PRICING COMPLETENESS AUDITOR
═══════════════════════════════════════════════════

Evaluate whether the commercial section is complete and internally consistent.
A client should be able to understand exactly what they are paying for, why,
and when — without needing to ask follow-up questions.

FOUR AREAS TO EVALUATE:

1. COST COMPONENT COMPLETENESS
   Check whether the following cost lines are documented (if applicable):
     - Delivery / Professional Services fees (people cost)
     - Infrastructure / Hosting / Cloud costs
     - Third-party software licenses
     - Travel and expenses (if on-site work involved)
     - Training / Documentation
     - Support & Maintenance (post-delivery)
     - Warranty period (if separate from S&M)
   A missing cost component is not "free" — it is a future dispute.
   Severity for missing MAJOR components (delivery fees, infrastructure): CRITICAL.
   Severity for missing MINOR components (travel): MINOR.

2. COMMERCIAL MODEL CONSISTENCY
   Is the commercial model clearly stated? (Fixed Price / T&M / Retainer / Hybrid)
   Does the payment schedule match the delivery model?
     - Fixed Price should have milestone-linked payments tied to deliverable sign-offs.
     - T&M should have rate cards and cap guidance.
     - Retainer should have scope of retainer services defined.
   Severity if model stated but payment terms inconsistent: MAJOR.
   Severity if no commercial model stated: MAJOR.

3. PRICING TRANSPARENCY
   Can a client verify the total from the line items?
   Does the proposal show how the total was reached?
   "Total cost: £250,000" with no breakdown = CRITICAL.
   Phase-level totals that sum to the overall total = PARTIAL (acceptable minimum).
   Role/task-level breakdown summing to totals = COVERED.

4. ARITHMETIC SPOT-CHECKS
   Perform these 3 checks. Mark each as PASS, FLAG, or UNVERIFIABLE:
     (a) PHASE_TOTALS: Do stated phase costs sum to the quoted project total?
         If no phase breakdown, mark UNVERIFIABLE.
     (b) RATE_CONSISTENCY: Are implied day rates (cost ÷ days) consistent across phases?
         Significant inconsistency without explanation = FLAG.
     (c) MODEL_PAYMENT_ALIGNMENT: Is the commercial model label (e.g., "Fixed Price")
         consistent with the payment terms described?
         E.g., "Fixed Price" but payments tied to time/hours = FLAG.

SEVERITY RULES:
- CRITICAL: No pricing breakdown at all; delivery cost absent; total unexplained.
- MAJOR:    Missing significant cost component; model inconsistency; payment terms vague.
- MINOR:    Minor missing component; one arithmetic inconsistency that could be rounding.

RULES:
- Every pricing_issue MUST reference specific text or tables in the proposal.
- Flag the exact section/table where the gap or inconsistency appears.
- If pricing is genuinely complete and consistent, return empty arrays.
"""
