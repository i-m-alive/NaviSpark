"""
Skill 5.6 — Credibility & Industry Content Enhancer

Generates modifications to improve case study language, team descriptions,
governance model, and industry-specific content conviction.
"""


def get_skill_prompt() -> str:
    return """
═══════════════════════════════════════════════════
SKILL 5.6 — CREDIBILITY & INDUSTRY CONTENT ENHANCER
═══════════════════════════════════════════════════

SOURCE FINDINGS YOU MUST ADDRESS:
  - agent3_output.credibility_gaps[]        (P-18 case studies, P-08 team, governance)
  - agent3_output.industry_findings[]       (weak or absent industry win factors)
  - agent1_output.client_specific_gaps[]    (missing industry-specific sections)
  - agent4_output.top_3_strengths[]         (genuine strengths — make them more prominent)

MODIFICATION RULES:

A) CASE STUDY IMPROVEMENTS (credibility_gaps gsk_item=P-18):
   - Find the case studies / references slide (typically titled "Case Studies",
     "Our Work", "Client Success Stories", "References", "Track Record").
   - For each credibility_gap related to case studies:

   MISSING MEASURABLE OUTCOME:
     - Find the case study text in the slide.
     - append_text (on same shape): "Outcome: [generate a plausible, conservative
       outcome metric consistent with the project type and industry described.
       Frame it as the vendor's typical result, not an invented specific — e.g.,
       'Reduced processing time by approximately 30%, consistent with our typical
       outcomes for similar integrations.']"
     - Priority: should_fix

   NO CASE STUDY AT ALL (P-18 MISSING):
     - Skip with reason "No case study slide exists; a new slide must be created manually.
       Agent 5 cannot add new slides." Add to skipped[].
     - Priority: must_fix (but skipped — manual action required)

   GENERIC / WRONG INDUSTRY CASE STUDY:
     - Find the case study text.
     - Replace the generic industry descriptor with a more specific one using
       the client_industry field from the context.
     - Example: "A major enterprise client" → "A tier-1 [client_industry] organisation"
     - Priority: should_fix

B) TEAM / PEOPLE SECTION IMPROVEMENTS (credibility_gaps gsk_item=P-08):
   - Find the team slide (titled "Our Team", "Meet the Team", "Key People", "Delivery Team").
   - For each team gap:

   UNNAMED DELIVERY TEAM / GENERIC ROLES:
     - Find generic role description ("PM — 10 years experience").
     - Replace with a slightly more specific version using industry context:
       "[Role] with [X] years of [client_industry or proposal_type] delivery experience,
       including [1 specific relevant project type or certification where inferable]."
     - Do NOT invent specific names or companies — use generic-but-credible language.
     - Priority: should_fix

   NO GOVERNANCE MODEL:
     - Find the team or approach slide.
     - append_text: "Governance: Weekly steering committee review; fortnightly executive
       summary report. Escalation path: [Delivery Lead → Account Executive → Director].
       Change requests managed via formal CR process with written client approval."
     - Priority: should_fix

C) INDUSTRY WIN FACTOR IMPROVEMENTS (industry_findings[] where finding = "weak" or "absent"):
   - For each weak/absent industry win factor:
     - Find the slide most likely to contain content for that factor
       (e.g., compliance factor → architecture or solution slide;
              fraud detection → security/solution slide;
              patient safety → clinical workflow / approach slide).
     - "weak" factor: Replace the generic industry language with a more specific claim.
       Pattern: Replace "We comply with all relevant regulations" with
                "[Specific framework] compliance is maintained via [named control or audit]."
     - "absent" factor: append_text to the most relevant slide:
       "[Factor name]: [1–2 sentence specific description of how this proposal addresses it,
       using the proposal_type, client_industry, and any relevant content from the slide map]."
     - Priority: CRITICAL → must_fix; MAJOR → should_fix; MINOR → nice_to_have

D) CLIENT-SPECIFIC GAPS (agent1_output.client_specific_gaps[]):
   - For each gap, why_it_matters and gap field describe what's missing.
   - Find the most relevant slide for that industry topic.
   - append_text addressing the gap with a generic-but-specific statement
     calibrated to the industry (e.g., for healthcare: HIPAA, HL7 FHIR;
     for fintech: PCI-DSS, audit trail; for government: data sovereignty).
   - Priority: MAJOR → should_fix; MINOR → nice_to_have

E) PROMOTE GENUINE STRENGTHS (agent4_output.top_3_strengths[]):
   - For each strength in top_3_strengths:
     - Check whether that strength is mentioned in the EXECUTIVE SUMMARY slide
       (typically slide 0 or 1).
     - If it is NOT mentioned in the exec summary: find the exec summary shape and
       append_text a one-sentence reference:
       "Key strength: [condensed version of the strength, ≤20 words]."
     - Priority: nice_to_have

WHAT TO SKIP (add to skipped[]):
- New slide creation for missing case studies → skip with manual_action_required.
- Adding real measurable client metrics that are not inferable from the proposal → skip.
- Changes to team member names or specific client names → skip with reason
  "Cannot fabricate specific names or client references."
"""
