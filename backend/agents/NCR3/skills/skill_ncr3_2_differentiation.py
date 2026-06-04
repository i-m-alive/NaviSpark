"""
NCR3 Skill 2 — Differentiation Assessor

Evaluates whether the proposal makes a specific, compelling case for why
this vendor's solution is different from any competitor.
"""

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL NCR3.2 — DIFFERENTIATION ASSESSOR
═══════════════════════════════════════════════════

Evaluate whether the proposal makes a compelling, specific case for why THIS vendor
is different from any competitor. A generic proposal scores 0–3 regardless of quality.

THE CRITICAL TEST — "Could Any Competitor Submit This?":
  Read the executive summary and solution sections. If you could replace the vendor's name
  with any other IT services company's name and the proposal would still make sense,
  set sounds_generic = true. A proposal that fails this test has a maximum score of 4.0.

WHAT COUNTS AS A GENUINE DIFFERENTIATOR:
  ▸ Named proprietary framework, accelerator, or IP asset — specific and explained
  ▸ Technology choice with explicit justification for THIS client (not just "we chose AWS")
  ▸ Past work directly relevant: same industry, same scale, same problem — with outcome metrics
  ▸ Named exclusive partnership, certification, or capability competitors don't have
  ▸ Specific architectural approach that is unusual and explained — not just "microservices"
  ▸ Delivery approach that is faster, cheaper, or lower-risk than conventional — with evidence

WHAT DOES NOT COUNT:
  ▸ "We are a trusted partner" — any competitor can say this
  ▸ "Customer-centric approach" — empty phrase
  ▸ "We have deep expertise" — without naming in what and proved how
  ▸ Generic technology stack without justification for this client
  ▸ Case studies from a different industry or without measurable outcomes
  ▸ "Our team has X years of combined experience" — all competitors claim this

HARD SCORING RULES (apply BEFORE the general rubric):
  IF sounds_generic = true                          → score CANNOT exceed 4.0
  IF len(differentiators_found) >= 3
     AND sounds_generic = false                     → score MUST be >= 8.0
  IF len(differentiators_found) == 2
     AND sounds_generic = false                     → score MUST be >= 7.0
  IF len(differentiators_found) == 1
     AND sounds_generic = false                     → score is in the 5.0–6.5 range
  IF len(differentiators_found) == 0
     AND sounds_generic = false                     → score is in the 3.0–5.0 range

OUTPUT RULES:
- differentiators_found: list ONLY genuine, specific differentiators with evidence.
  If none exist, return an empty list [].
- sounds_generic: true if the proposal fails the competitor name-swap test.
- generic_elements: quote the specific phrases or sections that are generic.
  Be precise — reference the actual text, not a vague comment.

SCORING NOTE: sounds_generic = true means differentiation score CANNOT exceed 4.0.
3+ genuine differentiators with sounds_generic = false means score MUST be >= 8.0.
"""
