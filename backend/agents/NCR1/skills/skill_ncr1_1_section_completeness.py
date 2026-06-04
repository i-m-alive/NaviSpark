"""
NCR1 Skill 1 — Section Completeness Evaluator

Checks whether all core professional proposal sections are present
and adequately filled. Does NOT reference GSK checklist item IDs —
evaluates against the universal structure any complete proposal must have.
"""

CORE_SECTIONS = [
    ("Executive Summary",               True,  "Concise overview: client problem, proposed solution, key outcomes, and why this vendor."),
    ("Business Context / Problem",      True,  "Demonstrates understanding of the client's actual business challenge — not just the features requested."),
    ("Proposed Solution / Approach",    True,  "Specific description of what will be built/delivered and how. Not a capabilities overview."),
    ("Project Scope",                   True,  "Explicit in-scope AND out-of-scope boundaries. Missing out-of-scope is a PARTIAL at best."),
    ("Delivery Timeline / Plan",        True,  "Phase-level plan with milestones, durations, and dependencies."),
    ("Team Structure & Credentials",    True,  "Named team or clearly defined roles with relevant skills/experience. Anonymous 'our team' = PARTIAL."),
    ("Commercial / Pricing",            True,  "Cost breakdown — not just a total figure. Itemised by phase, component, or role."),
    ("Risks & Assumptions",             True,  "Named risks with mitigations AND assumptions with consequence-if-wrong statements."),
    ("Deliverables",                    False, "Specific output artifacts (documents, software, reports) — not a list of activities or phases."),
    ("Dependencies / Pre-requisites",   False, "What the vendor needs from the client before or during the engagement."),
]


def get_prompt_section() -> str:
    section_block = "\n".join(
        f"  {'[MANDATORY]' if mandatory else '[EXPECTED] '} {name}\n"
        f"    What to look for: {description}"
        for name, mandatory, description in CORE_SECTIONS
    )

    mandatory_names = [name for name, mandatory, _ in CORE_SECTIONS if mandatory]
    mandatory_str   = ", ".join(f'"{n}"' for n in mandatory_names)

    return f"""
═══════════════════════════════════════════════════
SKILL NCR1.1 — SECTION COMPLETENESS EVALUATOR
═══════════════════════════════════════════════════

Perform a systematic audit of every core section that a complete professional proposal must contain.
Rate each section: COVERED, PARTIAL, or MISSING.

STATUS DEFINITIONS:
- COVERED  — Section is present AND substantively filled with specific, client-relevant content.
             Vague filler does NOT qualify. "We will ensure quality" is NOT COVERED for risks.
- PARTIAL  — Section exists but is incomplete, generic, or lacks the key content described below.
- MISSING  — Absent entirely, or mentioned so briefly it provides no practical value.

MANDATORY SECTIONS (MISSING = CRITICAL issue, PARTIAL = MAJOR issue):
{section_block}

STRICT RULES:
- Your section_audit array MUST contain exactly {len(CORE_SECTIONS)} entries — one per section above, in order.
- Never skip a section. If absent, status = MISSING.
- The note field must reference actual content from the proposal (quote or paraphrase WHAT was found
  or WHAT is specifically absent). Never write a generic note like "this section is missing."
- Never assign COVERED without evidence from the document.

SPECIFIC RULES:

SCOPE SECTION:
  COVERED requires BOTH in-scope AND out-of-scope to be stated explicitly.
  A proposal that defines in-scope but omits out-of-scope = PARTIAL.
  No scope section at all = MISSING.

TEAM SECTION:
  Named individuals with relevant credentials = COVERED.
  Role descriptions only ("1 BA, 2 developers") without names or credentials = PARTIAL.
  No team information = MISSING.

RISKS & ASSUMPTIONS:
  COVERED requires specific named risks with mitigations AND assumptions with stated consequences.
  "We will manage risks appropriately" = MISSING.
  A list of risks without mitigations = PARTIAL.
  Assumptions without "if wrong, then..." consequences = PARTIAL.

DELIVERABLES:
  COVERED requires named output artifacts (e.g., "Deployed REST API", "UAT report", "Runbook").
  A list of phases or activities ("Phase 1 completion", "Development sprint") = PARTIAL.
  No deliverables list = MISSING.
"""
