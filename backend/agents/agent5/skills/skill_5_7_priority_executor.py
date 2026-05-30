"""
Skill 5.7 — Priority Actions Executor (Chief Modifier)

Ensures Agent 4's ranked must_fix actions are all covered, handles
double-flagged cross-agent issues, resolves consistency contradictions,
and produces the final modification_summary.
"""


def get_skill_prompt() -> str:
    return """
═══════════════════════════════════════════════════
SKILL 5.7 — PRIORITY ACTIONS EXECUTOR (Run This Last)
═══════════════════════════════════════════════════

SOURCE FINDINGS YOU MUST ADDRESS:
  - agent4_output.priority_actions.must_fix[]      (ranked critical actions — ALL must appear)
  - agent4_output.priority_actions.should_fix[]    (secondary actions)
  - agent4_output.double_flagged_issues[]          (cross-agent critical findings)
  - agent4_output.cross_consistency_issues[]       (contradictions between agents)

EXECUTION RULES:

A) MUST-FIX COVERAGE AUDIT:
   - Go through EVERY entry in agent4_output.priority_actions.must_fix[].
   - For each must_fix action, check whether skills 5.2–5.6 have already generated
     a modification addressing it.
   - If NOT already addressed: generate a new modification for it now.
   - If ALREADY addressed: do not duplicate — but ensure its priority = "must_fix".
   - A must_fix action with no corresponding modification is NOT acceptable.
     If you cannot auto-modify it, add it to skipped[] with:
       manual_action_required = the action field from must_fix verbatim.
   - Priority: all must_fix actions → "must_fix"

B) DOUBLE-FLAGGED ISSUES (cross-agent critical findings):
   - agent4_output.double_flagged_issues[] are issues flagged by 2+ agents.
   - Each is always CRITICAL.
   - For each double-flagged issue:
     1. Review modifications from skills 5.2–5.6 to see if it is already addressed.
     2. If not: find the most relevant slide from agent_quotes in the issue,
        locate it in the slide map, and generate the most impactful single
        replace_text or append_text that directly resolves the root issue.
     3. Mark the resulting modification:
          priority = "must_fix"
          severity = "CRITICAL"
          source_finding = "double_flagged: [issue_summary]"
   - Do NOT generate two separate modifications for the same double-flagged issue —
     one targeted fix per issue is sufficient.

C) CROSS-CONSISTENCY CONTRADICTIONS:
   - agent4_output.cross_consistency_issues[] describe contradictions.
   - For each CR-01 through CR-05 issue:
     - Find the LATER occurrence of the contradictory text in the slide map
       (the one that needs a qualifier added).
     - Generate append_text or replace_text to add a clarifying statement that
       resolves the contradiction by referencing the correct version.
     - Pattern: "Note: [specific clarification resolving the contradiction based
       on the finding description]."
     - Priority: CRITICAL → must_fix; MAJOR → should_fix

D) SHOULD-FIX COVERAGE:
   - Check each agent4_output.priority_actions.should_fix[] entry.
   - For any should_fix action not addressed by skills 5.2–5.6: generate a
     modification now, priority = "should_fix".
   - It is acceptable for some should_fix actions to end up in skipped[] if
     they require new slides, image changes, or data the agent does not have.

E) DEDUPLICATION:
   - Before finalising the modifications list, check for duplicates.
   - If two modifications target the same slide_index + shape_name + action + similar original_text,
     keep only the one with the higher priority (must_fix > should_fix > nice_to_have).
   - Merge semantically identical modifications into one.

F) MODIFICATION SUMMARY (always output this):
   After building the full modifications list, compute and include:
   {
     "total_modifications": <count of modifications[]>,
     "must_fix_count": <count where priority="must_fix">,
     "should_fix_count": <count where priority="should_fix">,
     "nice_to_have_count": <count where priority="nice_to_have">,
     "skipped_count": <count of skipped[]>,
     "slides_modified": [<list of unique slide_index values in modifications[]>],
     "must_fix_coverage": "<X of Y must_fix actions from Agent 4 addressed>"
   }

ORDERING RULE FOR FINAL modifications[] ARRAY:
  Sort all modifications in this order:
  1. priority = "must_fix" first (sorted by severity: CRITICAL → MAJOR)
  2. priority = "should_fix" second
  3. priority = "nice_to_have" last
  Within same priority, sort by slide_index ascending.
"""
