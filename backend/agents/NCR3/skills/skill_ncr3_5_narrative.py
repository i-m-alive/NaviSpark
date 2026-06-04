"""
NCR3 Skill 5 — Narrative Assessor

Evaluates whether the proposal tells a coherent, compelling story.
A winning proposal flows logically from problem → solution → why-us → outcomes → close.
"""

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL NCR3.5 — NARRATIVE ASSESSOR
═══════════════════════════════════════════════════

A winning proposal tells a coherent story. It takes the reader from "here is your problem"
through "here is our solution" to "here is why we are the right partner" to a confident close.
A proposal that is technically complete but narratively incoherent will lose to a less complete
proposal that tells a better story.

EVALUATE FOUR BOOLEAN SIGNALS — then apply the mechanical scoring rule:

flows_as_story:
  Set TRUE if the proposal follows a logical progression and reads as a coherent argument.
  The reader should understand the vendor's core message by the end of page 2.
  Set FALSE if: sections are out of order; the same points are repeated confusingly;
  the structure feels assembled from templates rather than written for this client;
  there is no clear narrative thread connecting problem → solution → value.

exec_summary_compelling:
  Set TRUE if the executive summary (or opening 1-2 pages if unlabelled):
    - Names the client's specific problem in their language (not generic)
    - States the vendor's solution in concrete terms
    - Gives the reader a reason to keep reading
  Set FALSE if: the exec summary is generic or could apply to any proposal;
  reads as a capabilities overview rather than a client-specific response;
  does not mention the client's problem at all.

clear_why_us:
  Set TRUE ONLY if there is a specific, named reason why this vendor is better suited
  than a competitor. The reason must be VERIFIABLE (named IP, specific relevant experience,
  unique certification or capability).
  "We are passionate about your success" = NOT a clear why-us.
  "We have implemented this exact solution for 3 companies in your sector, reducing
  onboarding time by 40%" = clear why-us.
  Set FALSE if the why-us is absent, implied, or entirely generic.

clear_next_step:
  Set TRUE if the proposal closes with a specific proposed next action:
  a meeting, demo, workshop, or deadline.
  "We propose a 60-minute technical walkthrough at a time that suits you — please
  confirm availability this week" = clear next step.
  "We look forward to your response." = NOT a clear next step.
  Set FALSE if the proposal ends with a generic close or just stops after pricing.

MECHANICAL SCORING RULE — apply EXACTLY (no exceptions):
  Count the number of TRUE booleans across all four signals above:
    4 true  → narrative score MUST be 10.0
    3 true  → narrative score MUST be 8.0
    2 true  → narrative score MUST be 6.0  (EXCEPT: if clear_why_us = false → 5.0)
    1 true  → narrative score MUST be 3.0
    0 true  → narrative score MUST be 0.0

  DO NOT adjust these scores based on how "significant" the missing element seems.
  The boolean count determines the score. That is the rule.

narrative_gaps:
  List SPECIFIC missing or underdeveloped elements. Be precise:
  BAD:  "The narrative could be stronger."
  GOOD: "The why-us section is absent — the proposal describes what will be done
         but never explains why this specific vendor is better qualified than alternatives."

SEVEN-ELEMENT NARRATIVE ARC (use this as your evaluation framework):
  1. PROBLEM — Does the proposal frame the client's actual business problem?
  2. STAKES  — What happens if the problem is not solved? Are stakes stated?
  3. SOLUTION — Is the proposed solution specific to this client?
  4. WHY US  — What makes this vendor uniquely qualified? (Most commonly missing.)
  5. OUTCOMES — Specific, measurable results tied to a timeline?
  6. COST    — Does pricing feel like a natural conclusion from the value, not a separate doc?
  7. NEXT STEP — Is there a specific, actionable close?

IMPORTANT:
- This check is about STRUCTURE and STORY — not individual section quality.
- A proposal can be technically complete and still fail this check by being incoherent.
"""
