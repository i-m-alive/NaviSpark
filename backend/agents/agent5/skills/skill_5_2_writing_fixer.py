"""
Skill 5.2 — Writing Quality & Language Fixer

Generates replace_text modifications for all credibility-damaging language:
filler phrases, passive voice, template smell, overclaims, and unexplained jargon.
"""


def get_skill_prompt() -> str:
    return """
═══════════════════════════════════════════════════
SKILL 5.2 — WRITING QUALITY & LANGUAGE FIXER
═══════════════════════════════════════════════════

SOURCE FINDINGS YOU MUST ADDRESS:
  - agent1_output.writing_issues[]         (filler_phrase, hidden_accountability,
                                            template_smell, unsubstantiated_claim,
                                            inconsistent_terminology)
  - agent1_output.jargon_flags[]           (unexplained technical terms)
  - agent1_output.rewrite                  (already-written improved paragraph)
  - agent3_output.overclaiming_flags[]     (claims without evidence)

MODIFICATION RULES:

A) AGENT 1 REWRITE (Highest Priority in this skill):
   - If agent1_output.rewrite is present, generate a replace_text modification:
       original_text = rewrite.original (exact paragraph)
       new_text      = rewrite.improved (Agent 1 already wrote this)
       priority      = "must_fix"
       source_skill  = "5.2"
   - Agent 1 already did the rewrite — apply it verbatim.

B) FILLER PHRASES (writing_issues type = filler_phrase):
   - Replace with specific, verifiable language.
   - Rule: Do NOT just delete the phrase. Replace the WHOLE SENTENCE containing
     it with a stronger version that says the same thing concretely.
   - Example:
       Before: "We leverage best-in-class technology to deliver world-class solutions."
       After:  "We use React 18 and Node.js — the same stack powering [industry-specific
                platform] — to deliver [specific outcome] within [stated timeline]."
   - Priority: MAJOR → "should_fix"; CRITICAL → "must_fix"

C) HIDDEN ACCOUNTABILITY / PASSIVE VOICE (writing_issues type = hidden_accountability):
   - Replace passive constructions with active, owner-named sentences.
   - Example:
       Before: "Quality checks will be performed at each stage."
       After:  "The QA lead performs automated regression + manual UAT sign-off at each
                sprint gate before any code merges to main."
   - Priority: CRITICAL → "must_fix"; MAJOR → "should_fix"

D) TEMPLATE SMELL (writing_issues type = template_smell):
   - Replace generic, name-swappable language with proposal-specific content.
   - The replacement MUST reference something specific from THIS proposal:
     the client's industry, a stated technology, a named phase, a specific requirement.
   - If you cannot determine what specific detail to substitute, generate the best
     possible client-specific version using context from the slide map and agent outputs.
   - Priority: CRITICAL → "must_fix"; MAJOR → "should_fix"

E) UNSUBSTANTIATED CLAIMS (writing_issues type = unsubstantiated_claim):
   - Add a specific evidence clause to the claim OR soften the claim to match evidence.
   - Example:
       Before: "Our team has deep expertise in healthcare technology."
       After:  "Our team has delivered 6 healthcare platform integrations over 5 years,
                including [most relevant case study named by Agent 3]."
   - Priority: MAJOR → "should_fix"

F) JARGON (agent1_output.jargon_flags[]):
   - Each jargon_flag already contains plain_language_suggestion.
   - Replace the jargon term inline using the pattern:
     "[technical term] ([plain-English explanation])"
   - Example: "MIRO (material invoice receipt transaction in SAP)"
   - Only flag if the jargon appears in an executive/narrative section,
     NOT in a technical appendix or architecture slide.
   - Priority: MAJOR → "should_fix"; MINOR → "nice_to_have"

G) OVERCLAIMING (agent3_output.overclaiming_flags[]):
   - If claim is followed immediately by evidence in same sentence → skip (already OK).
   - Otherwise: either add a specific evidence clause OR qualify the claim.
   - Example:
       Before: "We have a proven track record in financial services."
       After:  "We have completed [N] financial services engagements — [name most
                relevant one from case studies if available]."
   - Priority: MAJOR → "should_fix"

WHAT TO SKIP (add to skipped[]):
- Do NOT attempt to rewrite entire sections in bulk — only the specific located paragraph.
- If a writing_issue quote cannot be found in any shape → skip with reason "Quote not found".
- Inconsistent terminology (writing_issues type = inconsistent_terminology) → skip;
  global find-and-replace is not safe across shapes and would require human review.
  Add to skipped[] with reason "Global terminology replacement requires human review".
"""
