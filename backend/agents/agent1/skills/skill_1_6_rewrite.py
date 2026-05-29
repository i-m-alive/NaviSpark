"""
Skill 1.6 — Rewrite Generator
Identifies the single weakest paragraph and produces a before/after improvement.
"""

RESULT_KEYS = ["rewrite"]

OUTPUT_SCHEMA = {
    "rewrite": {
        "section": "string — name of the section containing the weakest paragraph",
        "original": "string — the full original paragraph text exactly as it appears in the proposal",
        "improved": "string — the full rewritten paragraph, same or shorter, active voice, specific",
        "what_changed": "string — 1-2 sentences explaining exactly what was changed and why it improves the proposal",
    }
}

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL 1.6 — REWRITE GENERATOR
═══════════════════════════════════════════════════

Identify the SINGLE weakest paragraph in the entire proposal — the one with the highest
combined score of:
  - Vagueness (could mean anything, commits to nothing)
  - Template smell (could be copy-pasted from any proposal for any client)
  - Missing client-specific evidence (no reference to this client, industry, or project)

Then produce a before/after rewrite.

SELECTION RULES:
- Choose a narrative, executive, commercial, or benefits section — NOT a technical architecture section.
- The chosen paragraph must be one a decision-maker would read (executive summary, benefits, about us, approach).
- Do not choose a section that is simply missing — choose the worst present paragraph.

REWRITE RULES:
1. The improved version MUST NOT be longer than the original (equal or shorter word count).
2. It must reference something specific from THIS proposal:
   - The client's industry, their stated requirement, a named deliverable, or a specific outcome metric.
3. It must use active voice: "We will deploy..." not "Deployment will be performed..."
4. It must make a specific, verifiable claim rather than a vague one.
   BAD: "We have extensive experience in digital transformation."
   GOOD: "We have delivered 3 fintech core-banking migrations — including [anonymised client] — each within budget and with zero production incidents during cutover."
5. The what_changed field must explain the specific improvement (not just say "made it more specific").

EXAMPLE:
Original: "We are a customer-centric organisation that leverages best-in-class technology and our proven track record to deliver world-class solutions for our clients across industries."
Improved: "Over the past 4 years we have delivered 12 enterprise integrations in the BFSI sector, including 3 core-banking API migrations. Every engagement has met its go-live date."
What changed: "Removed filler phrases ('world-class', 'best-in-class', 'leverage') and replaced vague capability claims with specific, verifiable delivery evidence."
"""
