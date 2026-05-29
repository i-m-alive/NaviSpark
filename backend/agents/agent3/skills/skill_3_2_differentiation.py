"""
Skill 3.2 — Solution Differentiation
Evaluates whether the proposal makes a specific, compelling case for why
this vendor's solution and approach is different from any competitor.
Covers GSK Proposal items P-09 (functional architecture), P-10 (technical architecture),
P-12 (technology stack with justification).
"""

RESULT_KEYS = ["differentiation"]

OUTPUT_SCHEMA = {
    "differentiation": {
        "differentiators_found": ["list of genuine, specific differentiators found in the proposal"],
        "sounds_generic": "boolean — true if the proposal could be submitted by any competitor",
        "generic_elements": ["list of exact phrases or sections that are generic/competitor-reusable"],
    }
}

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL 3.2 — SOLUTION DIFFERENTIATION
═══════════════════════════════════════════════════

Evaluate whether the proposal makes a compelling, specific case for why THIS vendor is different
from any competitor. A generic proposal — one that could have been written by any IT services firm
for any client — scores 0–3 on differentiation regardless of how well-written it is.

THE CRITICAL TEST — "Could Any Competitor Submit This?":
Read the executive summary and solution sections. If you could replace the vendor's name with
any other IT services company's name and the proposal would still make sense, set sounds_generic = true.
A proposal that passes this test scores a maximum of 4.0 on differentiation — not higher.

WHAT COUNTS AS A GENUINE DIFFERENTIATOR:
  ▸ Named proprietary framework, accelerator, or IP asset that is specific and explained
  ▸ Technology choice with explicit justification for THIS client (not just "we chose React because it's popular")
  ▸ Past work that is directly relevant: same industry, same scale, same problem — with outcome metrics
  ▸ Named exclusive partnership, certification, or capability that competitors don't have
  ▸ Specific architectural approach that is unusual and explained (not just "microservices" or "cloud-native")
  ▸ A delivery approach that is genuinely faster, cheaper, or lower-risk than the conventional way — with evidence

WHAT DOES NOT COUNT AS A DIFFERENTIATOR:
  ▸ "We are a trusted partner" — any competitor can say this
  ▸ "Customer-centric approach" — empty phrase
  ▸ "We have deep expertise" — without naming in what and proved how
  ▸ Generic technology stack listed without justification for this client
  ▸ Case studies from a different industry or without measurable outcomes
  ▸ "Our team has X years of combined experience" — all competitors can claim this

CHECKING GSK ITEMS P-09, P-10, P-12:
  ▸ P-09 (Functional architecture): Is the proposed solution approach distinctive, or is it
    a generic pattern any integrator would propose? Does it show deep understanding of this client's
    specific business flow?
  ▸ P-10 (Technical architecture): Are technology choices specific and justified for this engagement?
    "We will use AWS, Kubernetes, and React" without explaining why for THIS client = generic.
    "We chose Aurora PostgreSQL because your current system uses relational data with high read volume
    and your team is already familiar with PostgreSQL" = COVERED.
  ▸ P-12 (Tech stack with role justification): Every technology choice must have a client-specific
    reason. Even a brief one-sentence rationale is better than a bare tech list.

OUTPUT RULES:
- differentiators_found: list only genuine, specific differentiators — not vendor claims without evidence.
  If there are none, return an empty list.
- sounds_generic: set to true if the proposal fails the competitor name-swap test.
- generic_elements: quote the specific phrases or sections that are generic. Be precise.
  "The executive summary (paragraphs 1-3) uses 'trusted partner', 'end-to-end solutions', and
  'customer-centric' without any client-specific content." is better than a vague comment.

SCORING NOTE: sounds_generic = true means differentiation score CANNOT exceed 4.0.
A proposal with 3+ genuine differentiators and sounds_generic = false can score 7.0+.
"""
