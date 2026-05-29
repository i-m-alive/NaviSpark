"""
Skill 2.6 — Arithmetic Validation
Verifies that the numbers in the proposal actually add up.
Cross-cutting integrity check — no specific GSK item number.
Produces arithmetic_flags (not estimation_issues or pricing_issues).
"""

RESULT_KEYS = ["arithmetic_flags"]

OUTPUT_SCHEMA = {
    "arithmetic_flags": [
        {
            "check": "string — description of what was checked (e.g. 'Line items sum vs stated total')",
            "finding": "string — what was found (e.g. 'Line items sum to £182,000 but stated total is £195,000')",
            "severity": "CRITICAL | MAJOR | MINOR",
        }
    ]
}

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL 2.6 — ARITHMETIC VALIDATION
═══════════════════════════════════════════════════

Numbers that don't add up signal a proposal that was assembled from templates without review.
Run FIVE explicit arithmetic checks against the numbers in the proposal. Report the result of
each check you can perform — including checks you CANNOT verify (do not skip them silently).

THE FIVE CHECKS:

CHECK 1 — Line item sum vs stated total
  Do the individual pricing line items sum to the stated total engagement price?
  Method: add up all named line items. Compare to the stated total.
  Flag if the difference is greater than 1% of the total (rounding is acceptable).
  Severity: CRITICAL if gap >5%, MAJOR if gap 1–5%.

CHECK 2 — Effort × rate reconciliation
  Does: [total person-days or hours] × [blended day/hour rate] ≈ [total delivery price]?
  Method: multiply total stated effort by the stated blended rate (or average of role rates).
  Flag if the gap is greater than 15% — this suggests hidden margin, undisclosed costs,
  or arithmetic errors.
  Severity: MAJOR if gap >15%.

CHECK 3 — Headcount vs costed roles
  Do the number of people described in the team section match the number of roles costed
  in the estimate?
  Method: count named/described team members in the proposal body. Count roles in the estimate.
  Flag if there is a mismatch of 2+ people.
  Severity: MAJOR.

CHECK 4 — Currency and unit consistency
  Are currency symbols and effort units (days vs hours vs weeks vs story points) consistent
  throughout the document?
  Method: scan the estimate and pricing for mixed units or currency symbols.
  Examples: mixing "£" and "$" without explanation; stating effort in days in one section
  and hours in another without a conversion factor.
  Severity: MAJOR for currency mix; MINOR for unit mix if context is clear.

CHECK 5 — Timeline vs resource loading reconciliation
  Does the stated project duration match what the resource loading plan implies?
  Method: if a resource loading plan is present, calculate implied duration from
  total effort ÷ total concurrent resource capacity. Compare to stated duration.
  Flag if implied duration differs from stated duration by more than 20%.
  Severity: MAJOR.

CRITICAL INSTRUCTION ON CANNOT-VERIFY:
If you cannot verify a check because the numbers are not presented in a way that allows
calculation (e.g., effort is in narrative form without figures, or pricing is a single
lump sum), you MUST still include the check in arithmetic_flags with:
  - finding: "Cannot verify — [specific reason, e.g., 'no individual line items provided']"
  - severity: MINOR (the inability to verify is itself a signal of low rigour)

DO NOT skip a check silently. A finding of "cannot verify" is still a finding.
If all five checks pass and the numbers reconcile correctly, return an empty array.
"""
