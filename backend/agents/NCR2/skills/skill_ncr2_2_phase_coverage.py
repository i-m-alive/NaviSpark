"""
NCR2 Skill 2 — Phase Coverage Checker

Checks whether all standard delivery phases are represented and costed.
"""

STANDARD_PHASES = [
    ("Discovery / Requirements",    True,  "Requirements gathering, stakeholder interviews, AS-IS analysis, scope finalisation."),
    ("Solution Design",             True,  "Architecture design, technical design, solution blueprint, design sign-off."),
    ("Build / Development",         True,  "Core build, coding, configuration, unit testing."),
    ("Testing / QA",                True,  "Integration testing, UAT, performance testing, defect management."),
    ("Deployment / Go-Live",        True,  "Production deployment, data migration, cutover, go-live activities."),
    ("Hypercare / Support",         False, "Post-go-live support period, defect resolution, hypercare window."),
    ("Change Management / Training",False, "User training, adoption support, documentation, knowledge transfer."),
]

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL NCR2.2 — PHASE COVERAGE CHECKER
═══════════════════════════════════════════════════

Evaluate whether all standard delivery phases are represented in the proposal's
project plan and costing. A missing phase means the client is unaware of work
that will either be performed (at hidden cost) or skipped (creating delivery risk).

PHASES TO CHECK:

[CRITICAL] Discovery / Requirements
  Requirements gathering, stakeholder interviews, AS-IS process analysis,
  scope finalisation. If absent, the proposal assumes requirements are known —
  a dangerous assumption on most engagements.

[CRITICAL] Solution Design
  Architecture design, technical design document, solution blueprint.
  Jumping from requirements to build without a design phase = high rework risk.

[CRITICAL] Build / Development
  Core implementation — coding, configuration, unit testing.
  This is the largest phase; must have effort and cost breakdown.

[CRITICAL] Testing / QA
  Integration testing, UAT, performance testing, defect management cycle.
  "Testing is included in development" without separate effort = PARTIAL.

[CRITICAL] Deployment / Go-Live
  Production deployment, data migration (if applicable), cutover plan,
  go-live day activities. Absent on a production system delivery = CRITICAL.

[EXPECTED] Hypercare / Support
  Post-go-live support window, hypercare team, defect resolution SLA.
  Expected for any production deployment. Absence = client has no coverage after go-live.

[EXPECTED] Change Management / Training
  User training, adoption support, documentation, knowledge transfer.
  Expected where the solution changes how people work.

STATUS RULES:
- PRESENT  — The phase is explicitly named, described, and costed.
- PARTIAL  — The phase exists but lacks effort/cost detail, or is bundled with another phase
             without its own line item ("Testing included in Development").
- ABSENT   — The phase is not mentioned OR is stated as out-of-scope without justification.

SEVERITY:
- ABSENT on a CRITICAL phase     = CRITICAL issue
- PARTIAL on a CRITICAL phase    = MAJOR issue
- ABSENT on an EXPECTED phase    = MAJOR issue (unless explicitly justified)
- PARTIAL on an EXPECTED phase   = MINOR issue

OUTPUT: phase_coverage array with exactly 7 entries — one per phase above, in order.
Every entry must have: phase, status, note (specific to this proposal, never generic).
"""
