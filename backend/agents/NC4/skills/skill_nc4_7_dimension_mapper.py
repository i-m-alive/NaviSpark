"""
Skill NC4.7 — Dimension Mapper

Maps the custom checklist evaluation results to the 15 standard proposal review
dimensions using a single Bedrock LLM call.

The 15 standard dimensions match those used by Agents 1–4 in the standard pipeline,
so CustomResultsPage can reuse ScoreRadar and other dimension-aware components.

Standard dimensions returned:
  section_completeness   writing_quality      scope_clarity       client_coverage
  estimation_rigour      phase_coverage       pricing_completeness commercial_model_fit
  arithmetic_accuracy    client_fit           differentiation      risk_transparency
  credibility            narrative            industry_factors
"""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

# The 15 standard dimensions with descriptions to guide the LLM
_DIMENSION_DESCRIPTIONS = {
    "section_completeness":   "Does the proposal contain all required sections (exec summary, scope, timeline, team, pricing, risk, etc.)?",
    "writing_quality":        "Is the writing clear, professional, and free of jargon/filler?",
    "scope_clarity":          "Is the project scope, deliverables, and exclusions clearly defined?",
    "client_coverage":        "Does the proposal address the client's specific priorities, industry, and pain points?",
    "estimation_rigour":      "Are effort estimates backed by methodology, assumptions, and breakdown?",
    "phase_coverage":         "Are all required project phases (discovery, development, testing, go-live, support) covered?",
    "pricing_completeness":   "Is the pricing complete, transparent, and with clear cost breakdown?",
    "commercial_model_fit":   "Is the commercial model (fixed price, T&M, etc.) appropriate and clearly justified?",
    "arithmetic_accuracy":    "Are the numbers internally consistent and mathematically correct?",
    "client_fit":             "How well tailored is this proposal to the specific client vs. generic template?",
    "differentiation":        "Does the proposal clearly articulate what sets the vendor apart from competitors?",
    "risk_transparency":      "Are risks, dependencies, and mitigation strategies openly addressed?",
    "credibility":            "Does the proposal present strong evidence of capability (case studies, team bios, certifications)?",
    "narrative":              "Does the proposal flow as a compelling story with a clear 'why us' thread?",
    "industry_factors":       "Does it address industry-specific compliance, regulations, or best practices?",
}

_DIMENSION_KEYS = list(_DIMENSION_DESCRIPTIONS.keys())

_SYSTEM_PROMPT = """You are a senior proposal evaluation expert specialising in mapping evaluation results
to standardised scoring dimensions. You receive the results of a custom checklist evaluation of a business
proposal and must infer scores (0.0 to 10.0) for 15 standard proposal quality dimensions.

Guidelines:
- Base scores ONLY on the evidence in the provided evaluation results — do not make assumptions.
- If a dimension is not covered by any checklist item, score it 5.0 (neutral — insufficient data).
- Use the pass/fail/partial results and gap descriptions as your evidence.
- Be consistent: a dimension with 80%+ items passed should score 7-9; below 50% should score 2-5.
- Return ONLY valid JSON. No preamble. No markdown. Start with { end with }."""


def _build_summary(nc3_results: list[dict], nc4_overall: float) -> str:
    """Build a compact summary of NC3 results for the LLM prompt."""
    lines = [f"Overall proposal score: {nc4_overall:.1f}/10\n"]
    lines.append("Per-category evaluation results:\n")

    for cat in nc3_results:
        name  = cat.get("category_name", "Unknown")
        score = cat.get("score", 0)
        mxs   = cat.get("max_score", 0)
        pct   = round((score / mxs) * 100) if mxs > 0 else 0
        passed  = cat.get("items_passed", 0)
        partial = cat.get("items_partial", 0)
        failed  = cat.get("items_failed", 0)
        total   = passed + partial + failed

        lines.append(f"  Category: {name}")
        lines.append(f"    Score: {score:.1f}/{mxs:.1f} ({pct}%)  |  Passed: {passed}  Partial: {partial}  Failed: {failed} of {total}")

        # Include up to 3 key gaps for context
        gaps = [
            f.get("gap") for f in cat.get("findings", [])
            if f.get("status") == "FAIL" and f.get("gap")
        ][:3]
        if gaps:
            lines.append("    Key gaps:")
            for g in gaps:
                lines.append(f"      - {g}")

        # Include up to 2 evidence snippets for passed items
        evidence = [
            f.get("evidence") for f in cat.get("findings", [])
            if f.get("status") == "PASS" and f.get("evidence")
        ][:2]
        if evidence:
            lines.append("    Evidence found:")
            for e in evidence:
                lines.append(f"      + {e[:120]}")
        lines.append("")

    return "\n".join(lines)


def _build_user_prompt(nc3_results: list[dict], nc4_overall: float) -> str:
    summary = _build_summary(nc3_results, nc4_overall)

    dim_descriptions = "\n".join(
        f'  "{k}": {v}' for k, v in _DIMENSION_DESCRIPTIONS.items()
    )

    return (
        f"EVALUATION RESULTS:\n{summary}\n\n"
        f"MAP TO THESE 15 DIMENSIONS (score 0.0–10.0 each):\n{dim_descriptions}\n\n"
        "Return ONLY this JSON object with all 15 keys:\n"
        "{\n"
        + ",\n".join(f'  "{k}": <float 0-10>' for k in _DIMENSION_KEYS)
        + "\n}"
    )


class DimensionMapper:
    """Maps NC3 custom checklist results to the 15 standard proposal quality dimensions."""

    def run(
        self,
        nc3_results: list[dict[str, Any]],
        nc4_overall_score: float,
    ) -> dict[str, float]:
        """
        Call Bedrock to infer dimension scores from NC3 findings.

        Args:
            nc3_results: Full NC3 fan-out results list.
            nc4_overall_score: The overall score computed by NC4.1.

        Returns:
            Dict of {dimension_key: score_0_to_10} for all 15 standard dimensions.
            Falls back to the overall_score for all dimensions if Bedrock call fails.
        """
        from bedrock_client import get_bedrock_client, _invoke_bedrock_with_retry

        # Handle empty results gracefully
        if not nc3_results:
            logger.warning("NC4.7 DimensionMapper: nc3_results is empty — using neutral scores")
            return {k: 5.0 for k in _DIMENSION_KEYS}

        user_prompt = _build_user_prompt(nc3_results, nc4_overall_score)

        logger.info(
            "NC4.7 DimensionMapper: calling Bedrock with %d categories, overall=%.2f",
            len(nc3_results), nc4_overall_score,
        )

        try:
            client = get_bedrock_client()
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1024,
                "temperature": 0,
                "system": _SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": user_prompt}],
            }
            response      = _invoke_bedrock_with_retry(client, request_body)
            response_body = json.loads(response["body"].read())
            raw_text: str = response_body["content"][0]["text"]
        except Exception as exc:
            logger.error("NC4.7 DimensionMapper Bedrock call failed: %s", exc)
            return _fallback_scores(nc3_results, nc4_overall_score)

        try:
            # Find JSON object boundaries
            import re
            text = raw_text.strip()
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```\s*$", "", text)
            start = text.find("{")
            end   = text.rfind("}")
            if start == -1 or end == -1:
                raise ValueError("No JSON object found in response")
            parsed = json.loads(text[start : end + 1])
        except Exception as exc:
            logger.error("NC4.7 DimensionMapper failed to parse response: %s | raw: %s", exc, raw_text[:200])
            return _fallback_scores(nc3_results, nc4_overall_score)

        # Validate and clamp all scores
        result: dict[str, float] = {}
        for key in _DIMENSION_KEYS:
            raw = parsed.get(key, nc4_overall_score)
            try:
                score = float(raw)
                result[key] = round(max(0.0, min(10.0, score)), 2)
            except (TypeError, ValueError):
                result[key] = round(max(0.0, min(10.0, nc4_overall_score)), 2)

        logger.info("NC4.7 DimensionMapper complete. scores: %s", result)
        return result


def _fallback_scores(nc3_results: list[dict], overall_score: float) -> dict[str, float]:
    """Fallback: distribute overall_score with minor variance per category hit."""
    base = round(max(0.0, min(10.0, overall_score)), 2)
    return {k: base for k in _DIMENSION_KEYS}
