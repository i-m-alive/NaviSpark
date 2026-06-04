"""
NCR1 Skill 2 — Writing Quality Analyzer

Detects five categories of language that reduce proposal credibility:
filler phrases, hidden accountability, template smell, inconsistent
terminology, and unsubstantiated claims.
"""

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL NCR1.2 — WRITING QUALITY ANALYZER
═══════════════════════════════════════════════════

Scan the entire proposal for language patterns that reduce credibility.
Flag each issue with the exact text, location, reason, and severity.

FIVE ISSUE TYPES TO DETECT:

1. FILLER_PHRASE — words that sound impressive but carry no information.
   Severity: MAJOR unless combined with specific evidence (then acceptable).
   Common filler phrases to flag (not exhaustive):
     "leverage", "synergies", "holistic approach", "best-in-class", "world-class",
     "cutting-edge", "state-of-the-art", "robust solution", "seamless integration",
     "proven methodology", "end-to-end", "value-added", "thought leadership",
     "innovative solution", "agile and flexible", "trusted partner", "customer-centric",
     "deep expertise" (without specifying in what), "extensive experience" (without evidence).
   A phrase is FILLER if it: (a) could apply to any vendor, (b) cannot be verified, and
   (c) is not followed by specific evidence in the same paragraph.

2. HIDDEN_ACCOUNTABILITY — passive voice that obscures who owns a commitment.
   Severity: MAJOR — creates contractual ambiguity, which is a risk for the client.
   Patterns that remove accountability:
     "it will be ensured", "steps will be taken", "quality will be maintained",
     "issues will be resolved", "requirements will be gathered", "risks will be mitigated",
     "the team will be responsible", "this will be handled" — and all similar constructions.
   Contrast: "The vendor will resolve defects within 48 hours" = accountable. Flag the vague form.

3. TEMPLATE_SMELL — paragraphs that could be copy-pasted into any proposal for any client.
   Severity: MAJOR — signals a lack of effort and attention to this specific client.
   Indicators: no client-specific information, no reference to this client's industry,
   no named requirement from the RFP, no reference to this specific project or problem.
   The test: could this exact paragraph appear in a proposal to a different client in a
   different industry? If yes, it is template smell.

4. INCONSISTENT_TERMINOLOGY — the same concept referred to by different names across sections.
   Severity: MINOR — confuses the client and signals careless drafting.
   Examples: "requirements" vs "specifications" vs "scope items" used interchangeably;
   the product/system named differently in different sections; "sprint" vs "iteration" vs "phase"
   used inconsistently when they mean the same thing.

5. UNSUBSTANTIATED_CLAIM — assertions of capability or outcome without supporting evidence.
   Severity: MAJOR in credibility-critical sections (credentials, case studies, outcomes).
   Examples:
     "deep expertise in healthcare" — in what specifically? proved how?
     "our methodology reduces delivery time by 40%" — based on what? which project?
     "we have delivered over 200 projects" — relevant projects? same domain?
   A claim is UNSUBSTANTIATED if it cannot be verified from content within the same proposal.

SEVERITY MAPPING:
- CRITICAL: Would cause a sophisticated evaluator to reject the proposal outright.
            E.g., entire executive summary is template smell with no client-specific content.
- MAJOR:    Weakens confidence significantly. Most filler, hidden accountability,
            unsubstantiated claims in important sections.
- MINOR:    Polish issue. Inconsistent terminology, isolated minor filler in low-stakes section.

ADDITIONAL CHECKS (scan these areas explicitly):

CLOSING / FINAL SECTION:
  The last 1-2 pages often contain a "Why Us" or "Our Difference" section.
  These frequently consist entirely of generic phrases any competitor could claim.
  Flag each bullet or claim with no supporting evidence elsewhere in the document.
  Type: template_smell or unsubstantiated_claim. Severity: MAJOR.

EXECUTIVE SUMMARY vs BODY MISMATCH:
  If the body contains specific quantified metrics (e.g., "60% time reduction") but the
  Executive Summary only says "will significantly improve" — flag the mismatch.
  Type: template_smell. Severity: MAJOR.
  The executive summary is what decision-makers read first.

UNNAMED DELIVERY TEAM:
  If senior leadership is named (with impressive bios) but the actual delivery team is
  anonymous or described only by role titles — flag this gap.
  Type: unsubstantiated_claim. Severity: MAJOR.

RULES:
- Produce at least 3 writing_issues if any exist. Most real proposals have 5-10.
- If the proposal is genuinely well-written with no issues, return an empty array.
- Every issue MUST quote the exact text from the proposal (max 30 words).
- Do not flag the same phrase twice.
- Focus on issues that matter to a client evaluator — not stylistic preferences.
"""
