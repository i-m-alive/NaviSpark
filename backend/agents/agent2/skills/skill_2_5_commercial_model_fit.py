"""
Skill 2.5 — Commercial Model Fit
Evaluates whether the chosen commercial model is appropriate for the scope as described.
Dynamically calibrated by PROPOSAL_TYPE (mirrors how Skill 1.4 is calibrated by CLIENT_INDUSTRY).
Covers GSK Pricing items P1 (model appropriateness), P2 (payment schedule), P11 (rate card).
"""

from agents.agent2.resources.commercial_model_rules import build_commercial_model_prompt_block
from agents.agent2.resources.pricing_checklist import build_commercial_model_prompt_block as build_p_items_block

RESULT_KEYS = ["pricing_issues", "commercial_model_assessment"]

OUTPUT_SCHEMA = {
    "commercial_model_assessment": {
        "model_stated": "Fixed Price | T&M | Retainer | Milestone-based | Government RFP | Hybrid | Not stated",
        "appropriate_for_scope": "boolean — true if the model fits the scope definition level",
        "concerns": ["list of specific concerns about model fit, or empty list if none"],
    }
}


def is_active(proposal_type: str) -> bool:
    """Always active — commercial model fit is checked for every proposal."""
    return True


def get_prompt_section(proposal_type: str) -> str:
    model_risk_block = build_commercial_model_prompt_block(proposal_type)
    p_items_block = build_p_items_block()
    return f"""
═══════════════════════════════════════════════════
SKILL 2.5 — COMMERCIAL MODEL FIT
═══════════════════════════════════════════════════

The commercial model chosen must be appropriate for the level of scope definition in the proposal.
The wrong model creates client risk (too much exposure on T&M) or vendor risk (Fixed Price
on ambiguous scope). Evaluate the stated model against the actual scope clarity.

PROPOSAL TYPE FROM CLIENT CONTEXT: {proposal_type or "Not specified"}

{model_risk_block}

{p_items_block}

WHAT TO EVALUATE:

1. Is the commercial model explicitly stated? (P1)
   - If unstated: model_stated = "Not stated", appropriate_for_scope = false, flag as CRITICAL.

2. Is the model appropriate for the scope?
   - Apply the red flags above for the selected proposal type.
   - Check the scope section and assumptions for signs of ambiguity.
   - If Fixed Price with ambiguous scope: appropriate_for_scope = false, add to concerns.
   - If T&M with fully-defined, frozen scope: add concern that client bears unnecessary risk.

3. Is the payment schedule linked to deliverables? (P2)
   - Check whether milestone payments are tied to named deliverables with acceptance criteria.
   - Calendar-date payments without named deliverables: add to pricing_issues as MAJOR.

4. Is a rate card provided for all named roles? (P11)
   - If T&M: rate card is MANDATORY. Absent = CRITICAL.
   - If Fixed Price: rate card is strongly recommended for change orders. Absent = MAJOR.
   - If Retainer: rate card is recommended for out-of-scope work. Absent = MINOR.

COMMERCIAL MODEL ASSESSMENT OUTPUT RULES:
- model_stated: exact model name as it appears in the proposal, or "Not stated"
- appropriate_for_scope: true only if the model genuinely fits the scope definition quality
- concerns: specific, evidence-based concerns (not generic warnings)
  Example concern: "Scope section contains 4 unresolved assumptions — Fixed Price on
  open assumptions creates vendor absorption risk for re-work when assumptions prove wrong."

If the commercial model is appropriate and payment schedule is sound, return an empty
pricing_issues array for Skill 2.5 and set appropriate_for_scope = true with concerns = [].
"""
