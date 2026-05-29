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
- Your section_audit array MUST contain exactly 23 entries — one per checklist item.
- Never skip an item. If you cannot find it, status = MISSING.
- The note field must reference specific content from the proposal (quote or paraphrase).
  Never write generic notes like "this section is missing" — say WHAT is missing and WHERE.
- Never assign COVERED without evidence from the document.

STRICT ITEM-SPECIFIC RULES (override general status rules):

P-02 (Non-Functional Requirements):
  A statement such as "NFRs will be collected" or "we will define non-functional requirements
  during the project" means NFRs are NOT in the proposal. This is MISSING, not PARTIAL.
  PARTIAL requires that some NFRs are actually present (even if incomplete).
  A future promise to collect NFRs = MISSING.

P-14 (Dependencies on Customer or Third Parties):
  COVERED requires ALL THREE of the following to be present for each dependency:
    (a) WHAT is needed from the client or third party
    (b) BY WHEN it is needed (date, milestone, or phase reference)
    (c) CONSEQUENCE if delayed (scope impact, timeline slip, or cost implication)
  If (b) or (c) is absent for any dependency, status = PARTIAL, not COVERED.
  A list of dependencies without timelines or consequences = PARTIAL.

P-17 (Deliverables List with Description):
  COVERED requires each deliverable to be named as a SPECIFIC OUTPUT ARTIFACT with its own description.
  A list of phases, work packages, or activities is NOT a deliverables list — it is a project plan.
  Apply these rules strictly:
    PARTIAL — any of these patterns appear without artifact-level descriptions:
      • Phase or sprint names ("Phase 1 completion", "Week 10 milestone")
      • Work-package clusters ("solution development, testing and deployment")
      • Activity bundles ("technical design, solution development, testing")
    COVERED — only if EACH deliverable is a named artifact, e.g.:
      • "Deployed REST API authenticated via Azure AD, tested to 99.9% uptime SLA"
      • "User acceptance testing report covering all agreed test cases"
      • "Runbook with step-by-step production deployment and rollback procedure"
  A sentence such as "Solution requirement detailing, technical design, solution development,
  testing and deployment across 10 weeks" describes PHASES, not deliverables. This = PARTIAL.

P-19a-d (Cost Breakdown):
  This is ONE checklist item covering four cost lines: delivery, S&M, dev infrastructure,
  prod infrastructure. Return it as a SINGLE entry with id "P-19a-d".
  Do NOT split it into P-19a, P-19b, P-19c, P-19d as separate entries.
  Status is COVERED only if all four lines are present with explicit figures.
  PARTIAL if some lines exist but others are absent or stated as "billed directly" without estimate.
"""
