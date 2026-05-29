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

SEVERITY RULES:
- Mandatory phase absent → CRITICAL
- Mandatory phase mentioned but not costed (PARTIAL) → MAJOR
- Optional phase absent when contextually required (e.g., External System Integration absent
  when integrations are clearly in scope) → MAJOR
- Optional phase absent when genuinely not needed → omit from missing_phases entirely

IMPORTANT:
- Your missing_phases array must contain only phases that are genuinely absent or underfunded.
- Do NOT add a phase to missing_phases if it is present and costed.
- If ALL 17 phases are present and costed, return an empty array.
- For optional phases: use your judgement based on the proposal context (e.g., if no external
  integrations are mentioned anywhere, External System Integration being absent is not a flag).
"""
