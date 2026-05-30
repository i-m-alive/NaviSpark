"""
Skill 5.4 — Commercial & Estimation Patcher

Generates modifications to fix payment milestone language, add missing phases,
improve pricing descriptions, and patch estimation language.
"""


def get_skill_prompt() -> str:
    return """
═══════════════════════════════════════════════════
SKILL 5.4 — COMMERCIAL & ESTIMATION PATCHER
═══════════════════════════════════════════════════

SOURCE FINDINGS YOU MUST ADDRESS:
  - agent2_output.missing_phases[]           (absent/partial delivery phases)
  - agent2_output.estimation_issues[]        (WBS, contingency, IP reuse gaps)
  - agent2_output.pricing_issues[]           (missing cost lines, infra, payment)
  - agent2_output.commercial_model_assessment (payment milestone violations)
  - agent2_output.arithmetic_flags[]         (number discrepancies)
  - agent4_output.priority_actions.must_fix[] — actions targeting commercial/estimation

MODIFICATION RULES:

A) PAYMENT MILESTONE VIOLATIONS (pricing_issues gsk_item=P2 or commercial_model_assessment):
   UNACCEPTABLE PATTERNS (always fix if found):
     - Percentage-based:  "30% at project kickoff", "35% at Week 4"
     - Calendar-date:     "Payment due 30 June", "Invoice at end of sprint"
     - Phase-name only:   "35% upon completion of development phase"

   FIX: Replace with deliverable-linked milestone language:
     Pattern: "[Currency+Amount] upon client sign-off of [specific named deliverable]
               with acceptance criteria: [what client reviews before signing]"
   Example:
     Before: "40% upon completion of development"
     After:  "40% upon client sign-off of the tested API integration module,
              evidenced by UAT sign-off document and zero P1 defects in staging."

   - Find the payment/milestone section slide and apply replace_text.
   - Priority: must_fix

B) MISSING OR PARTIAL DELIVERY PHASES (missing_phases[]):
   CRITICAL phases (add as append_bullets on the estimation/phase slide):
     - For each phase with severity=CRITICAL: add a new bullet to the estimation slide
       in the form: "[Phase Name]: [brief description of what this phase includes,
       inferred from standard delivery methodology]"
   MAJOR phases (append_bullets too, but priority=should_fix):
     - Same pattern but lower priority.

   Finding the right slide: look for a slide whose title or content mentions
   "Estimation", "Effort", "Timeline", "Project Plan", "Phases", or "Delivery Approach".
   If none found, use the slide with the most numbered/bulleted content.

   Do NOT invent effort figures — only describe the phase. Effort is for the
   proposal team to fill. Add a placeholder: "[X days — to be confirmed by delivery team]"

C) WBS MISSING (estimation_issues gsk_item=E1, severity=CRITICAL):
   - Find the estimation slide.
   - append_text: "Note: A detailed Work Breakdown Structure (WBS) with effort per
     deliverable, complexity level (High/Medium/Low), and clarity level is required
     to support this estimate. [To be provided as Attachment A before contract signature.]"
   - Priority: must_fix

D) CONTINGENCY NOT DERIVED (estimation_issues gsk_item=E4):
   - Find the contingency / risk line in pricing slide.
   - If a contingency line exists but has no rationale: append_text alongside it:
     "Contingency basis: [X]% applied to [phase or item]; risk drivers are [list
     top 2 from agent2/agent3 risk findings]."
   - Priority: should_fix

E) IP/ACCELERATOR EFFORT REDUCTION NOT SHOWN (estimation_issues gsk_item=E5):
   - If proposal claims accelerators but no before/after effort comparison:
   - Find the accelerator/reuse section slide.
   - append_text: "Accelerator impact: Without [accelerator name], estimated effort:
     [X] days. With [accelerator name], estimated effort: [Y] days ([Z]% reduction).
     [Figures to be confirmed against final WBS.]"
   - Priority: should_fix

F) MISSING PRICING COST LINES (pricing_issues gsk_item=P3a, P3b, P7-P10):
   - P3a (delivery cost not separate): find pricing slide, append_text:
     "Delivery cost (design + development, excluding testing): [Amount TBC]"
   - P3b (warranty not separated from S&M): append_text to pricing slide:
     "60-day warranty period (post go-live): included at no charge.
      Support & Maintenance (Month 3 onwards): [Amount] per month."
   - P7-P10 (missing infra environments): append_bullets to pricing slide:
     ["Development environment: [Amount or 'Shared — no additional cost']",
      "Test environment: [Amount or 'Shared — no additional cost']",
      "QA/Pre-Production environment: [Amount TBC]",
      "Production environment: [Amount TBC — provisioned by client]"]
   - Priority: CRITICAL items → must_fix; MAJOR → should_fix

G) ARITHMETIC DISCREPANCIES (arithmetic_flags[]):
   - Only attempt if the exact discrepant number can be located in a slide.
   - If a line item sum vs total discrepancy is found AND both numbers appear in the slide:
     - Add an append_text note: "Note: Pricing figures above are indicative. Final
       validated total will be confirmed in the commercial appendix."
   - Do NOT attempt to change numeric values directly — this risks introducing errors.
   - Priority: should_fix (note only, not numeric change)

WHAT TO SKIP (add to skipped[]):
- If no estimation or pricing slide found → skip commercial modifications with reason
  "No estimation/pricing slide identified in presentation."
- Arithmetic corrections that require changing specific numbers → skip with reason
  "Arithmetic correction requires human review to avoid introducing errors."
"""
