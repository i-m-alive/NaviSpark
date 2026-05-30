"""
Skill 5.3 — Scope & Structure Rewriter

Generates modifications to fix vague scope, missing out-of-scope sections,
assumption language without consequences, and dependency language without timelines.
"""


def get_skill_prompt() -> str:
    return """
═══════════════════════════════════════════════════
SKILL 5.3 — SCOPE & STRUCTURE REWRITER
═══════════════════════════════════════════════════

SOURCE FINDINGS YOU MUST ADDRESS:
  - agent1_output.scope_clarity_issues[]  (vague scope, missing out-of-scope,
                                           undefined work ownership, high-risk assumptions)
  - agent1_output.high_risk_assumptions[] (assumptions without consequence clauses)
  - agent1_output.section_audit[]         P-06 (Out of Scope), P-14 (Dependencies),
                                           P-16 (Assumptions + Impact) → MISSING or PARTIAL
  - agent3_output.risk_transparency_issues[] for P-14 and P-16
  - agent4_output.cross_consistency_issues[] (scope boundary contradictions)
  - agent4_output.priority_actions.must_fix[] — any action targeting scope

MODIFICATION RULES:

A) MISSING OUT-OF-SCOPE SECTION (P-06 MISSING or PARTIAL):
   - Find the slide containing the scope or SOW section (typically a slide whose
     title mentions "Scope", "Statement of Work", "Deliverables", or "What We Deliver").
   - Generate an append_bullets modification adding an "Out of Scope" list.
   - The bullets must be specific to THIS proposal — use exclusions implied by the
     scope section, NOT generic placeholder text.
   - Minimum bullets to generate: 3 specific exclusions inferred from the proposal
     (e.g., "Post-go-live training beyond [X]-week hyper-care", "Legacy data cleanup
     beyond [N]-month retention window", "Third-party system tuning or licensing costs").
   - Priority: must_fix (P-06 MISSING is always CRITICAL)

B) VAGUE SCOPE LANGUAGE (scope_clarity_issues):
   - For each issue with a quote + location: find the paragraph and rewrite it.
   - The rewrite must:
     1. Name what IS included (specific deliverables or API modules)
     2. Name what is NOT included in that same paragraph
     3. Be in active voice with a clear owner
   - Example:
       Before: "We will handle all integration requirements as needed."
       After:  "Scope covers integration of [named system A] with [named system B]
                via REST API. Custom connectors for third-party systems beyond this
                pair are out of scope and subject to a separate change request."
   - Priority: CRITICAL scope issues → "must_fix"; MAJOR → "should_fix"

C) ASSUMPTIONS WITHOUT CONSEQUENCES (high_risk_assumptions[]):
   - For each assumption, find its text in the slide map.
   - Rewrite to add the consequence clause using the pattern:
     "We assume [X]. If this assumption proves incorrect, [specific timeline/cost/scope
     consequence]."
   - Use the risk_if_wrong field already provided by Agent 1.
   - Example:
       Before: "We assume client will provide test data."
       After:  "We assume client provides anonymised test data by Week 2, Sprint 1.
                If delayed, the testing phase shifts by an equivalent number of business
                days with no change to delivery cost."
   - Priority: CRITICAL assumptions → "must_fix"; MAJOR → "should_fix"

D) DEPENDENCY LANGUAGE WITHOUT WHAT/WHEN/CONSEQUENCE (P-14 PARTIAL or agent3 issue):
   - Find the dependency / prerequisite section.
   - Rewrite incomplete dependency statements to include all three required elements:
     WHAT the vendor needs, BY WHEN (milestone or date), CONSEQUENCE if not provided.
   - Example:
       Before: "Client must provide system access."
       After:  "Client provides read-write access to [system name] test environment
                by Day 5 of Phase 1. If not provided by this date, Phase 2 kickoff
                shifts by the equivalent delay at no additional cost to client."
   - Priority: MAJOR → "should_fix"

E) CROSS-CONSISTENCY SCOPE CONTRADICTIONS (cross_consistency_issues CR-02):
   - If Agent 4 flagged a contradiction where something appears both in-scope in one
     place and out-of-scope in another:
   - Find BOTH locations and add a clarifying qualifier to the later-occurring mention
     that resolves the contradiction.
   - Example: If Section 3 says "integration includes all third-party connectors" but
     Section 6 says "third-party connectors excluded" → rewrite Section 3 to say
     "integration includes [named connectors listed in Section 6]; additional connectors
     are subject to separate scoping."
   - Priority: "must_fix"

WHAT TO SKIP (add to skipped[]):
- If no scope slide exists at all (no slide with title or body containing "scope",
  "SOW", "deliverables") → skip with reason "No scope slide found in presentation;
  manual addition of scope section required."
- If a scope issue's quote cannot be located → skip with reason "Quote not found in slide map."
"""
