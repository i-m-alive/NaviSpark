"""
Skill 2.2 — Phase Coverage Check
Checks whether all 17 standard delivery phases are present and costed in the estimate.
Missing phases = missing cost = post-contract disputes.
Covers GSK Estimation items E6–E10, E13–E24.
"""

from agents.agent2.resources.phase_list import build_phase_prompt_block

RESULT_KEYS = ["missing_phases"]

OUTPUT_SCHEMA = {
    "missing_phases": [
        {
            "phase": "string — the name of the missing or insufficiently costed phase",
            "gsk_item": "string — the GSK item reference (e.g. E17)",
            "severity": "CRITICAL | MAJOR | MINOR",
        }
    ]
}


def get_prompt_section() -> str:
    phase_block = build_phase_prompt_block()
    return f"""
═══════════════════════════════════════════════════
SKILL 2.2 — PHASE COVERAGE CHECK
═══════════════════════════════════════════════════

A complete estimate accounts for EVERY phase of delivery. Missing phases are missing cost.
When a client signs a Fixed Price contract, they expect all phases to be included.
If a phase is absent from the estimate but surfaces during delivery, it becomes a scope dispute.

{phase_block}

WHAT COUNTS AS PRESENT vs ABSENT:
- PRESENT: The phase appears as a named line item in the estimate WITH an associated effort
  figure (person-days, hours, or story points). The effort may be approximate but must be stated.
- PARTIAL: The phase is mentioned in the narrative but not costed, OR it is bundled into another
  phase without a separate effort figure. Add to missing_phases with severity MINOR or MAJOR.
- ABSENT: The phase does not appear anywhere in the estimate or proposal. Add to missing_phases.

BUNDLED PHASES RULE — READ THIS CAREFULLY:
  A single cost line that NAMES multiple phases within its description is PARTIAL, not ABSENT.
  Example: "Solution requirement detailing, technical design, solution development, testing and
  deployment across 10 weeks — USD 144,000"

  This line names: Requirements Detailing, Technical Design, Coding (solution development),
  and some testing. These are PARTIAL (bundled), not ABSENT.
  → Rate them MAJOR (named but not separately costed), NOT CRITICAL.

  Phases that do NOT appear anywhere in the proposal or estimate = ABSENT → CRITICAL.
  Phases that are named in a bundled description but have no separate cost = PARTIAL → MAJOR.

  Common phases that are NAMED in bundled lines and must be rated MAJOR (not CRITICAL):
    E6  Requirements Detailing   — often named as "requirement detailing" in a delivery line
    E7  Technical Design         — often named as "technical design" or "design phase"
    E8  Coding & Unit Testing    — often implied by "solution development" or "development"
    E9  Component Integration    — often implied by "integration and testing"

  Common phases that are NEVER named in bundled lines and should be CRITICAL if absent:
    E13 Documentation            — rarely bundled explicitly
    E16 CI/CD & Release Mgmt    — rarely mentioned unless DevOps-focused
    E19 Project Management       — often absent from fixed-price delivery estimates
    E20 Team Roles & Headcount  — absent unless an org chart or staffing table is provided

SEVERITY RULES:
- Mandatory phase absent (not named anywhere) → CRITICAL
- Mandatory phase named in a bundled line but not separately costed (PARTIAL) → MAJOR
- Optional phase absent when contextually required → MAJOR
- Optional phase absent when genuinely not needed → omit from missing_phases entirely

STRICT RULE — E15 (External System Integration):
  E15 is OPTIONAL in the phase list, but it becomes MANDATORY (CRITICAL if absent) when
  the proposal scope explicitly includes integration with external systems such as:
  SAP, ERP (any vendor), payment gateways, banking platforms (HSBCnet, SWIFT),
  NetWeaver Gateway, OData APIs, third-party SaaS platforms, or any named API integration.
  A proposal that promises SAP OData integration, MIRO posting, FBL1N calls, or similar
  ERP API work but has NO separate effort estimate for the integration phase is missing a
  CRITICAL cost element. Do NOT omit E15 when integrations are in scope.

STRICT RULE — E22 (Duration & Basis):
  E22 requires BOTH the duration AND the basis for that duration (e.g., critical path,
  resource loading plan, comparable project reference).
  - Duration stated but NO basis → MAJOR (not CRITICAL). Use "14 weeks stated but no
    basis or critical path analysis provided to validate this duration."
  - No duration at all → CRITICAL.
  Do NOT rate E22 as CRITICAL if the duration is stated — only the basis is missing.

IMPORTANT:
- Your missing_phases array must contain only phases that are genuinely absent or underfunded.
- Do NOT add a phase to missing_phases if it is present and costed.
- If ALL 17 phases are present and costed, return an empty array.
"""
