"""
NCR3 Skill 3 — Risk Transparency Checker

Checks whether risks, assumptions, dependencies, and mitigations are
clearly and honestly surfaced.
"""

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL NCR3.3 — RISK TRANSPARENCY CHECKER
═══════════════════════════════════════════════════

Evaluate whether the proposal is honest about risks, dependencies, and
what could go wrong — and whether it provides credible plans for each.
Proposals that hide risk to look more attractive lose client trust when
reality diverges from promises.

FOUR AREAS TO CHECK:

1. RISK REGISTER
   Is there a formal risk register or risk section?
   Does every risk have a named, specific mitigation — not just an acknowledgement?
   BAD: "Data migration carries risk."
   GOOD: "Data migration risk — Mitigation: pre-migration data profiling in Week 2,
         dedicated DBA resource, dry-run migration in staging environment before cutover."
   Generic risk list without named mitigations = PARTIAL.
   No risk register at all on a complex engagement = CRITICAL.
   Type: "risk_register"

2. DEPENDENCIES ON CLIENT OR THIRD PARTIES
   Are all dependencies listed with THREE components each:
     (a) WHAT is needed
     (b) BY WHEN (date, milestone, or phase reference)
     (c) CONSEQUENCE if not met (scope impact, timeline slip, cost implication)
   BAD: "We require access to the legacy system."
   GOOD: "Legacy system API access required by Week 2. If delayed, UAT phase shifts proportionally."
   Dependencies without timelines or consequences = PARTIAL.
   No dependency section on an integration-heavy engagement = MAJOR.
   Type: "dependency"

3. ASSUMPTIONS WITH CONSEQUENCES
   Does every assumption state what happens if it proves incorrect?
   BAD: "We assume the client will provide requirements promptly."
   GOOD: "We assume requirements sign-off by Week 3. If delayed beyond Week 4, project timeline
         extends by equivalent duration at no additional cost."
   Assumptions without consequence statements = PARTIAL.
   Type: "assumption"

4. PRE-PROJECT REQUIREMENTS
   Is there a specific, actionable list of what the vendor needs from the client
   BEFORE work begins?
   "Client cooperation will be needed" = MISSING — too vague to act on.
   A specific list: "Access credentials for legacy system, BA availability 3 days/week
   in Discovery phase, sign-off on requirements by [milestone]" = COVERED.
   Type: "pre_project"

SEVERITY RULES:
- CRITICAL: No risk register on a complex multi-dependency engagement.
            No dependency section on an integration-heavy engagement.
- MAJOR:    Risk register without named mitigations; dependencies without timelines/consequences;
            assumptions without consequence statements.
- MINOR:    Minor gaps in an otherwise complete risk section.

RULES:
- Every risk_transparency_issue MUST reference specific text or its specific absence.
- type field must be one of: "risk_register", "dependency", "assumption", "pre_project"
- If the proposal is genuinely transparent about risks, return an empty array.
"""
