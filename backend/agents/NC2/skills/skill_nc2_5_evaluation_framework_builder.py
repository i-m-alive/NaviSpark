"""
Skill NC2.5 — Evaluation Framework Builder

For each category, writes the complete evaluation prompt that the corresponding
NC3 instance will receive as its task definition. This is the most critical NC2
skill — it makes the pipeline adapt to any checklist at runtime.

SECURITY NOTE: Per architecture Decision 4, evaluation prompts written here are
injected into the user prompt of NC3, NOT the system prompt. This sandboxes
prompt injection risk from malicious or malformed checklists.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_SCORING_TYPE_DESCRIPTIONS: dict[str, str] = {
    "binary": "Binary (PASS / FAIL only). Score is 1 for PASS, 0 for FAIL.",
    "scored_1_to_5": (
        "Scored 1–5 scale. 5 = fully meets requirement, 1 = barely meets, 0 = does not meet."
    ),
    "weighted_1_to_5": (
        "Scored 1–5 scale. 5 = fully meets requirement, 1 = barely meets, 0 = does not meet."
    ),
    "scored_1_to_10": (
        "Scored 1–10 scale. 10 = fully meets requirement, 5 = partially meets, "
        "0 = does not meet."
    ),
    "weighted_1_to_10": (
        "Scored 1–10 scale. 10 = fully meets requirement, 5 = partially meets, "
        "0 = does not meet."
    ),
}

_SCORE_INSTRUCTIONS: dict[str, str] = {
    "binary": "1 for PASS, 0 for FAIL",
    "scored_1_to_5": "0–5 (5 = fully meets, 0 = does not meet)",
    "weighted_1_to_5": "0–5 (5 = fully meets, 0 = does not meet)",
    "scored_1_to_10": "0–10 (10 = fully meets, 0 = does not meet)",
    "weighted_1_to_10": "0–10 (10 = fully meets, 0 = does not meet)",
}

_MAX_SCORES: dict[str, int | float] = {
    "binary": 1,
    "scored_1_to_5": 5,
    "weighted_1_to_5": 5,
    "scored_1_to_10": 10,
    "weighted_1_to_10": 10,
}

_HALF_SCORES: dict[str, int | float] = {
    "binary": 0.5,
    "scored_1_to_5": 2.5,
    "weighted_1_to_5": 2.5,
    "scored_1_to_10": 5,
    "weighted_1_to_10": 5,
}


class EvaluationFrameworkBuilder:
    """Writes a complete NC3 evaluation prompt for each checklist category.

    The prompt is a self-contained instruction set: it tells NC3 exactly what
    to evaluate, how to score it, what output format to return, and provides
    full NC1 context for calibration where available.
    """

    def run(
        self,
        categories: list[dict[str, Any]],
        scoring_type: str,
        nc1_context: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Write evaluation prompts for every category.

        Args:
            categories: Category dicts (with items and weights) from NC2.4.
            scoring_type: Global scoring type string from NC2.4.
            nc1_context: Optional NC1 auto_detected dict for prompt enrichment.

        Returns:
            The same categories list, each dict now containing an
            ``evaluation_prompt`` key.
        """
        logger.info(
            "NC2.5 EvaluationFrameworkBuilder.run() categories=%d scoring_type=%s nc1=%s",
            len(categories), scoring_type, bool(nc1_context),
        )

        context_block = self._build_context_block(nc1_context)

        for cat in categories:
            try:
                prompt = self._build_prompt(cat, scoring_type, context_block)
                cat["evaluation_prompt"] = prompt
                logger.debug(
                    "NC2.5 prompt written for '%s': %d chars",
                    cat.get("name", "?"), len(prompt),
                )
            except Exception as exc:
                logger.error(
                    "NC2.5 failed to build prompt for category '%s': %s",
                    cat.get("name", "?"), exc,
                )
                cat["evaluation_prompt"] = (
                    f"[NC2.5 ERROR: prompt generation failed for category "
                    f"'{cat.get('name', 'unknown')}': {exc}]"
                )

        logger.info("NC2.5 complete. prompts_written=%d", len(categories))
        return categories

    def _build_context_block(self, nc1_context: dict[str, Any] | None) -> str:
        """Build the PROPOSAL CONTEXT section for the evaluation prompt.

        Args:
            nc1_context: NC1 auto_detected output or None.

        Returns:
            Formatted context block string, or empty string if no context.
        """
        if not nc1_context:
            return ""

        industry_list = nc1_context.get("client_industry", [])
        industry = ", ".join(industry_list) if industry_list else "Unknown"
        proposal_type = nc1_context.get("proposal_type") or "Unknown"
        priorities_list = nc1_context.get("client_priorities", [])
        priorities = ", ".join(priorities_list) if priorities_list else "Unknown"
        client_name = nc1_context.get("client_name") or "Unknown"

        return (
            "PROPOSAL CONTEXT (auto-detected by NC1):\n"
            f"- Industry: {industry}\n"
            f"- Proposal Type: {proposal_type}\n"
            f"- Client Priorities: {priorities}\n"
            f"- Client: {client_name}\n"
            "Use this context to calibrate your evaluation — e.g. for a Healthcare "
            "proposal, regulatory compliance evidence is weighted more heavily.\n"
        )

    def _build_prompt(
        self,
        category: dict[str, Any],
        scoring_type: str,
        context_block: str,
    ) -> str:
        """Construct the full evaluation prompt for one category.

        Args:
            category: Category dict with name, weight, items.
            scoring_type: Global scoring type string.
            context_block: Pre-built context block (may be empty string).

        Returns:
            Complete evaluation prompt string.
        """
        cat_name = category.get("name", "Unknown Category")
        cat_weight = category.get("weight", 1.0)
        items: list[dict[str, Any]] = category.get("items", [])
        item_count = len(items)

        scoring_description = _SCORING_TYPE_DESCRIPTIONS.get(
            scoring_type,
            _SCORING_TYPE_DESCRIPTIONS["binary"],
        )
        score_instruction = _SCORE_INSTRUCTIONS.get(
            scoring_type,
            _SCORE_INSTRUCTIONS["binary"],
        )
        max_score = _MAX_SCORES.get(scoring_type, 1)
        half_score = _HALF_SCORES.get(scoring_type, 0.5)

        weight_pct = round(cat_weight * 100, 1)

        context_section = (
            f"{context_block}\n" if context_block else ""
        )

        items_block = self._build_items_block(items)

        prompt = (
            "You are evaluating a proposal document against a specific set of checklist criteria.\n\n"
            f"CATEGORY: {cat_name}\n"
            f"SCORING TYPE: {scoring_description}\n"
            f"CATEGORY WEIGHT: {weight_pct}% of overall score\n\n"
            f"{context_section}"
            "YOUR TASK:\n"
            f"Evaluate the proposal against each of the following {item_count} checklist items.\n"
            "For each item, you must provide:\n"
            "  1. STATUS: PASS | PARTIAL | FAIL\n"
            f"  2. SCORE: {score_instruction}\n"
            "  3. EVIDENCE: The exact quote, slide title, section name, or page reference from "
            "the proposal that supports your finding. If no evidence is found, write null.\n"
            "  4. GAP: If STATUS is FAIL or PARTIAL, write one sentence explaining what is "
            "missing and one sentence suggesting a concrete fix. If STATUS is PASS, write null.\n\n"
            "CHECKLIST ITEMS FOR THIS CATEGORY:\n"
            f"{items_block}\n\n"
            "SCORING RULES:\n"
            f"- PASS = full evidence found, requirement clearly met. Score = {max_score}.\n"
            f"- PARTIAL = requirement partially addressed. Score = proportional "
            f"(e.g. {half_score} out of {max_score}).\n"
            "- FAIL = no evidence found, requirement not met. Score = 0.\n"
            "- Do not award PASS if evidence is vague or implied — it must be explicit "
            "in the proposal.\n"
            "- Do not penalise for information that is reasonably outside the proposal's scope.\n\n"
            "OUTPUT FORMAT:\n"
            "Respond with a JSON array. Each element corresponds to one checklist item "
            "in the order listed above:\n"
            "[\n"
            "  {{\n"
            '    "item_id":  "<item id>",\n'
            '    "status":   "PASS" | "PARTIAL" | "FAIL",\n'
            '    "score":    <number>,\n'
            '    "evidence": "<quote or location>" | null,\n'
            '    "gap":      "<gap explanation and fix>" | null\n'
            "  }},\n"
            "  ...\n"
            "]\n"
            "Respond with ONLY the JSON array. No preamble. No explanation. No markdown fences."
        )

        return prompt

    def _build_items_block(self, items: list[dict[str, Any]]) -> str:
        """Format the numbered checklist items section of the prompt.

        Args:
            items: Item dicts with id, text, required_evidence, pass_condition, weight.

        Returns:
            Multi-line formatted string listing all items.
        """
        lines: list[str] = []
        for n, item in enumerate(items, start=1):
            item_id = item.get("id", f"ITEM-{n:03d}")
            item_text = item.get("text", "")
            required_evidence = item.get("required_evidence") or "Not specified"
            pass_condition = (
                item.get("pass_condition")
                or "Evidence of this requirement present in the proposal"
            )
            item_weight = item.get("weight", 1.0)

            lines.append(
                f"{n}. [{item_id}] {item_text}\n"
                f"   Required evidence: {required_evidence}\n"
                f"   Pass condition: {pass_condition}\n"
                f"   Weight: {item_weight} (relative weight within this category)"
            )

        return "\n".join(lines)
