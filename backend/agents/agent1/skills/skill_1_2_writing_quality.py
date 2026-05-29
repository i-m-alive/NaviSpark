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

RULES:
- Produce at least 3 writing_issues if any exist. Most real proposals have 5–10.
- If the proposal is genuinely well-written with no issues, return an empty array.
- Every issue MUST quote the exact text from the proposal (max 30 words).
- Do not flag the same phrase twice.
"""
