"""
Skill 1.2 — Writing Quality Analysis
Detects five categories of language that reduce proposal credibility.
"""

from agents.agent1.resources.filler_phrases import build_filler_prompt_block

RESULT_KEYS = ["writing_issues"]

OUTPUT_SCHEMA = {
    "writing_issues": [
        {
            "type": "filler_phrase | hidden_accountability | template_smell | inconsistent_terminology | unsubstantiated_claim",
            "quote": "string — exact text from the proposal, max 30 words",
            "location": "string — section name where this appears",
            "why": "string — explanation of why this reduces credibility",
            "severity": "CRITICAL | MAJOR | MINOR",
        }
    ]
}

def get_prompt_section() -> str:
    filler_block = build_filler_prompt_block()
    return f"""
═══════════════════════════════════════════════════
SKILL 1.2 — WRITING QUALITY ANALYSIS
═══════════════════════════════════════════════════

Scan the entire proposal for language patterns that reduce credibility.
Flag each issue with the exact text, location, reason, and severity.

FIVE ISSUE TYPES TO DETECT:

1. FILLER_PHRASE — words that sound impressive but contain no information.
   Severity: MAJOR unless combined with specific evidence (then acceptable).
{filler_block}

2. HIDDEN_ACCOUNTABILITY — passive voice that hides who owns a commitment.
   Severity: MAJOR — creates contractual ambiguity.
   These phrases remove accountability from the vendor:
   "it will be ensured", "steps will be taken", "quality will be maintained",
   "issues will be resolved", "the team will be responsible", and all similar constructions.

3. TEMPLATE_SMELL — paragraphs that could be copy-pasted into any proposal for any client.
   Severity: MAJOR — signals lack of effort.
   Indicators: no client-specific information, no industry reference,
   no named requirement, no reference to this specific RFP or project.

4. INCONSISTENT_TERMINOLOGY — the same concept referred to by different names.
   Severity: MINOR — but confuses the client and signals careless drafting.
   Examples: "requirements" vs "specifications" vs "scope items" used interchangeably;
   product named differently across sections.

5. UNSUBSTANTIATED_CLAIM — assertions of capability without supporting evidence.
   Severity: MAJOR when in credibility-critical sections (case studies, team bios).
   Examples: "deep expertise in healthcare" — in what specifically? proved how?

SEVERITY MAPPING:
- CRITICAL: Would cause a sophisticated client to reject the proposal outright (e.g., entire executive summary is template smell)
- MAJOR: Weakens confidence significantly — most filler, hidden accountability, unsubstantiated claims
- MINOR: Polish issue — inconsistent terminology, isolated minor phrase

ADDITIONAL CHECKS (scan these areas explicitly):

6. CLOSING / FINAL SLIDE FILLER — Check the last 1–2 slides or pages, which often contain a
   "Why Us" or "Our Difference" section. These slides frequently consist entirely of generic
   phrases that any competitor could claim verbatim. Flag each bullet or claim that has no
   supporting evidence in the same proposal.
   Type: template_smell or unsubstantiated_claim. Severity: MAJOR.
   Example of what to flag: "Experienced team that fights for engagement success",
   "Solution building focus with the right partner eco-system" — if no evidence supports
   these claims elsewhere in the document.

7. EXECUTIVE SUMMARY vs BODY MISMATCH — Check whether the Executive Summary's benefits
   paragraph contains the same quantified metrics that appear later in the document.
   If the body has specific numbers (e.g., "60–70% time reduction") but the Executive Summary
   only says "will significantly reduce the time" without numbers, flag it.
   Type: template_smell. Severity: MAJOR.
   The executive summary is what a decision-maker reads first — vague benefits there undermine
   the strong quantified content that follows.

8. UNNAMED DELIVERY TEAM — If the proposal shows senior leadership profiles (named individuals
   with impressive bios) but the ACTUAL delivery team (the people who will execute the project)
   is unnamed or described only by role title, flag this gap.
   Type: unsubstantiated_claim. Severity: MAJOR.
   The client is paying for execution, not for named leaders who will not be day-to-day.

RULES:
- Produce at least 3 writing_issues if any exist. Most real proposals have 5–10.
- If the proposal is genuinely well-written with no issues, return an empty array.
- Every issue MUST quote the exact text from the proposal (max 30 words).
- Do not flag the same phrase twice.
"""
