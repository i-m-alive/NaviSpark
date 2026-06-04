"""
NCR2 Skill 1 — Estimation Rigour Evaluator

Checks whether effort estimates are backed by methodology and evidence.
"""

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL NCR2.1 — ESTIMATION RIGOUR EVALUATOR
═══════════════════════════════════════════════════

Evaluate whether the effort and cost estimates are backed by a credible methodology.
A number in a proposal without explanation is not an estimate — it is a guess.

FIVE DIMENSIONS TO ASSESS:

1. ESTIMATION METHODOLOGY
   Is the estimation approach named and explained?
   Acceptable methods: story points, function points, T-shirt sizing, FTE-months,
   work breakdown structure (WBS), analogous estimation, parametric model.
   Severity if absent: MAJOR.
   Severity if vague ("we estimate based on experience"): MINOR.

2. WORK BREAKDOWN STRUCTURE
   Is effort broken down at the task, feature, or module level?
   A total project cost without any breakdown = CRITICAL.
   Phase-level totals only (e.g., "Design: 20 days, Build: 60 days") = PARTIAL.
   Task or module-level breakdown with effort per item = COVERED.

3. COMPLEXITY ASSESSMENT
   Does the estimate acknowledge complexity factors?
   E.g., integration count, data migration volume, legacy system constraints,
   number of user roles, regulatory requirements.
   Estimates that ignore complexity are unreliable.
   Severity if absent on a complex engagement: MAJOR.

4. CONTINGENCY LINKAGE
   Is contingency (buffer) included? Is it linked to specific risks or uncertainties?
   BAD: "We include 10% contingency."
   GOOD: "We include 15% contingency specifically for legacy API undocumentation risk
         identified in Section 4."
   Flat % contingency with no link to specific risks = PARTIAL.
   No contingency on a complex engagement = MAJOR.

5. ESTIMATE CLARITY — WHO DOES WHAT
   Is it clear which work is done by the vendor vs. the client?
   Ambiguous estimates where client effort is hidden = MAJOR.
   "Integration testing will be done collaboratively" without split = PARTIAL.

SEVERITY RULES:
- CRITICAL: No work breakdown at all (single lump-sum cost only).
- MAJOR:    Methodology absent; contingency absent; client/vendor split unclear.
- MINOR:    Minor methodology gap; contingency stated but not linked.

RULES:
- Every estimation_issue MUST reference specific text from the proposal or
  identify what is specifically absent (not generic "estimates are unclear").
- Flag the exact location (section name, slide, or table) where the gap exists.
- If estimates are genuinely rigorous, return an empty array.
"""
