"""
Skill 3.5 — Proposal Narrative
Evaluates whether the proposal tells a coherent, compelling story.
A winning proposal flows logically from problem to solution to 'why us' to outcomes
to cost to a confident close. No specific GSK items — this is a structural check.
"""

RESULT_KEYS = ["narrative_assessment"]

OUTPUT_SCHEMA = {
    "narrative_assessment": {
        "flows_as_story": "boolean — true if the proposal follows a logical, compelling arc",
        "exec_summary_compelling": "boolean — true if the executive summary gives a reason to keep reading",
        "clear_why_us": "boolean — true if there is a clear, specific reason to choose this vendor",
        "clear_next_step": "boolean — true if the proposal closes with a confident, specific next step",
        "narrative_gaps": ["list of specific missing or underdeveloped elements in the narrative arc"],
    }
}

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL 3.5 — PROPOSAL NARRATIVE
═══════════════════════════════════════════════════

A winning proposal tells a coherent story. It takes the reader on a journey from "here is your
problem and why it matters" through "here is our solution and why it works for you" to "here is
why we are the right partner" to "here is what you get and when" to a confident close.

A proposal that is technically complete but narratively incoherent — jumping between sections,
repeating points, missing the 'so what', or trailing off without a clear close — will lose to
a less complete proposal that tells a better story.

THE SEVEN-ELEMENT NARRATIVE ARC:
Evaluate whether each element is present and well-developed:

  1. PROBLEM — "Here is what you are facing and why it matters"
     Does the proposal demonstrate it understands the client's actual problem — not just the features
     requested? Does it make the problem feel real and important?

  2. WHY IT MATTERS — "Here is the business impact of not solving this"
     What happens if the client does nothing or chooses the wrong vendor? Stakes must be stated.

  3. OUR SOLUTION — "Here is specifically how we solve it"
     The solution description must be specific to this client. Not a generic capabilities overview.

  4. WHY US — "Here is why we are uniquely qualified to deliver this"
     The "why us" element is the most commonly missing or weak element in proposals.
     It should answer: what do we have that our competitors don't? It must be specific.
     "We have extensive experience" is not a "why us" — it is a "why anyone".

  5. OUTCOMES — "Here is what you get, when you get it, and how you will measure success"
     Specific, measurable outcomes tied to a timeline. Not features — business results.

  6. COST — "Here is what it costs and why it is fair"
     The commercial section should not feel like a separate document. It should flow naturally
     from the value proposition: "for this outcome, here is what you invest."

  7. NEXT STEP — "Here is what happens next"
     A strong close names a specific next action: "We propose a 60-minute technical walkthrough
     on [date range] to answer any questions. Please confirm a convenient slot."
     A weak close: "We look forward to your response." Full stop.

EVALUATION CRITERIA:

flows_as_story:
  Set to true if the proposal follows a logical progression and reads as a coherent argument.
  Set to false if: sections are out of order, the same points are repeated confusingly, the
  reader cannot understand the vendor's core argument by the end of page 2, or the structure
  feels like a document assembled from templates rather than written for this client.

exec_summary_compelling:
  Set to true if the executive summary (or first 1-2 pages if there is no labelled exec summary):
  - Names the client's problem in their language
  - States the vendor's solution in concrete terms
  - Gives the reader a reason to keep reading
  Set to false if the executive summary is generic, could apply to any proposal, or reads as a
  capabilities overview rather than a client-specific response.

clear_why_us:
  Set to true only if there is a specific, named reason why this vendor is better suited than
  a competitor. The reason must be verifiable (named IP, specific relevant experience, unique
  capability). "We are passionate about your success" is NOT a clear why-us.
  Set to false if the why-us is absent, implied but not stated, or entirely generic.

clear_next_step:
  Set to true if the proposal closes with a specific proposed next action — a meeting, a demo,
  a technical workshop, a deadline. The client must know exactly what to do after reading.
  Set to false if the proposal ends with a generic "we look forward to hearing from you" or
  just stops after the pricing section.

narrative_gaps:
  List specific elements that are missing or underdeveloped. Be precise:
  "Why-us section is absent — the proposal describes what they will do but never explains
  why this vendor specifically is qualified to do it." is more useful than "unclear why us".

IMPORTANT:
- This check is about STRUCTURE and STORY — not about the quality of individual sections.
  (Other skills cover those.)
- A proposal can have all 22 checklist items COVERED and still fail this check by being
  incoherent, generic, or closing weakly.
- If all four narrative elements are strong, set all booleans to true and return an empty
  narrative_gaps array.
"""
