"""
Skill 5.5 — Narrative & Client Fit Strengthener

Generates modifications to improve executive summary, why-us section,
client-specific language, differentiation, and closing/next-steps.
"""


def get_skill_prompt() -> str:
    return """
═══════════════════════════════════════════════════
SKILL 5.5 — NARRATIVE & CLIENT FIT STRENGTHENER
═══════════════════════════════════════════════════

SOURCE FINDINGS YOU MUST ADDRESS:
  - agent3_output.narrative_assessment      (four booleans: each false = a modification target)
  - agent3_output.client_fit_issues[]       (client priority not addressed)
  - agent3_output.differentiation           (generic_elements[], sounds_generic)
  - agent4_output.rewrite_suggestions[]     (apply these first — already have original+improved)
  - agent4_output.plain_english_summary     (contains the most urgent single action)

MODIFICATION RULES:

A) AGENT 4 REWRITE SUGGESTIONS (apply these first, highest impact):
   - For each entry in agent4_output.rewrite_suggestions[]:
     - Locate original in slide map (via Skill 5.1 mapping)
     - Generate replace_text with new_text = rewrite_suggestions[].improved
     - priority = "must_fix"
     - source_skill = "5.5"
   - These have original+improved already written — apply verbatim.

B) EXECUTIVE SUMMARY NOT COMPELLING (narrative_assessment.exec_summary_compelling = false):
   - Find the executive summary slide (typically slide 0 or 1, or slide titled
     "Executive Summary", "Overview", "Introduction").
   - Find the main body/content shape on that slide.
   - Rewrite its FIRST PARAGRAPH to:
     1. Name the client's problem in their own language (use client_industry and
        the most specific problem language from the proposal body)
     2. State the specific solution briefly
     3. Name the single most compelling reason to read further
   - Use agent4_output.plain_english_summary as tone reference.
   - Do NOT replace the entire slide — only the opening paragraph.
   - Priority: must_fix

C) "WHY US" SECTION MISSING OR GENERIC (narrative_assessment.clear_why_us = false):
   - Find the slide/section titled "Why Us", "Why [Vendor Name]", "Our Differentiators",
     "What Sets Us Apart", or similar.
   - If the section exists but is generic (agent3_output.differentiation.sounds_generic=true):
     - Take the first entry from agent3_output.differentiation.differentiators_found[]
       (genuine differentiators already identified by Agent 3) and rewrite the why-us
       paragraph to lead with that specific, named differentiator.
     - Replace the generic_elements phrase with the differentiator text.
   - If no why-us slide exists: add append_text to the closing slide with:
     "Why [infer vendor name from proposal]: [use top differentiator from
      agent3_output.differentiation.differentiators_found, or top_3_strengths[0] from Agent 4]"
   - Priority: must_fix (clear_why_us=false always CRITICAL for win probability)

D) GENERIC LANGUAGE FAILING NAME-SWAP TEST (differentiation.sounds_generic = true):
   - For each phrase in agent3_output.differentiation.generic_elements[]:
     - Locate it in the slide map.
     - Replace it with the nearest genuine differentiator from
       agent3_output.differentiation.differentiators_found[] that is relevant
       to the same context.
     - If no genuine differentiator matches the context, qualify the generic claim
       with a specific evidential clause.
   - Priority: should_fix

E) CLIENT PRIORITIES NOT ADDRESSED (client_fit_issues[]):
   - For each issue, the recommendation field tells what to add.
   - Find the most relevant slide for that priority:
     - Cost Certainty → pricing / commercial slide
     - Speed to Market → timeline / delivery approach slide
     - Risk Minimisation → risk / assumptions slide
     - Regulatory Compliance → compliance / architecture slide
     - Innovation → solution / approach slide
     - Proven Track Record → case studies / about us slide
   - append_text to that slide addressing the priority with a specific sentence.
   - Pattern: "[Priority name]: [specific claim using differentiators_found or
     case study data if available from agent3_output.credibility section]"
   - Priority: CRITICAL → must_fix; MAJOR → should_fix

F) NO CLEAR NEXT STEP (narrative_assessment.clear_next_step = false):
   - Find the last/closing slide (typically the last slide in the map).
   - If it has only a "Thank You" or "Contact" message and no specific next action:
     append_text: "Proposed next step: [suggest a 60-minute technical walkthrough
     or discovery workshop — use proposal_type to calibrate]. Please confirm your
     preferred slot by [leave as [DATE] placeholder]."
   - Priority: should_fix

G) NARRATIVE DOES NOT FLOW AS STORY (narrative_assessment.flows_as_story = false):
   - This is a structural issue — individual slide rewrites cannot fully fix it.
   - Find the executive summary slide and add an append_text transition statement
     that explicitly sets up the rest of the proposal:
     "This proposal is structured as follows: [1-sentence description of each major
     section in order, inferred from the slide titles in the slide map]."
   - Priority: nice_to_have

WHAT TO SKIP (add to skipped[]):
- If no executive summary slide identifiable → skip exec summary rewrite with reason
  "Cannot identify executive summary slide; manual review required."
- Full narrative restructuring (reordering slides) → skip with reason
  "Slide reordering requires manual restructuring; Agent 5 cannot change slide order."
"""
