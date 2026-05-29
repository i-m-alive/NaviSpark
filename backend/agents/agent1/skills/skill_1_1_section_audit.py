"""
Skill 1.1 — Section Completeness Audit
Audits all 22 GSK Proposal Checklist items: COVERED / PARTIAL / MISSING.
"""

from agents.agent1.resources.gsk_checklist import build_checklist_prompt_block

RESULT_KEYS = ["section_audit"]

OUTPUT_SCHEMA = {
    "section_audit": [
        {
            "id": "P-01",
            "section": "string — section name from the checklist",
            "mandatory": "boolean",
            "status": "COVERED | PARTIAL | MISSING",
            "note": "string — specific note quoting or referencing actual content from the proposal. Never generic.",
        }
    ]
}

def get_prompt_section() -> str:
    checklist_block = build_checklist_prompt_block()
    return f"""
═══════════════════════════════════════════════════
SKILL 1.1 — SECTION COMPLETENESS AUDIT
═══════════════════════════════════════════════════

Perform a systematic audit of every section that a complete proposal must contain.
Each item is rated COVERED, PARTIAL, or MISSING.

STATUS DEFINITIONS:
- COVERED: The proposal explicitly addresses this item with specific, substantive content.
  Vague mentions do NOT qualify. "We will ensure quality" is NOT COVERED for non-functional requirements.
- PARTIAL: The item is touched on but lacks adequate development, specifics, or completeness.
- MISSING: The item is absent entirely or mentioned so briefly it provides no value.

SEVERITY RULES:
- MISSING on a mandatory item → include as Critical severity in your evaluation
- PARTIAL on a mandatory item → Major severity
- MISSING on an optional item → Minor severity

{checklist_block}

IMPORTANT RULES:
- Your section_audit array MUST contain exactly 22 entries — one per checklist item.
- Never skip an item. If you cannot find it, status = MISSING.
- The note field must reference specific content from the proposal (quote or paraphrase).
  Never write generic notes like "this section is missing" — say WHAT is missing and WHERE.
- Never assign COVERED without evidence from the document.
"""
