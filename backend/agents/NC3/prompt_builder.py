"""
NC3 Prompt Builder

Dedicated utility module (not a skill) that assembles the final system and user
prompts for each NC3 instance from NC2.5's evaluation prompt and NC1 context.

Also contains the context-window chunking utility and the robust LLM response parser.

Functions:
    build_system_prompt  — NC3 role + scoring rules (never overridable by checklist content)
    build_user_prompt    — injects NC2.5 evaluation prompt + proposal text
    chunk_proposal       — selects relevant proposal sections when text > max_chars
    parse_llm_response   — robust JSON parser with markdown-fence stripping and fallback
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_SCORING_TYPE_DESCRIPTIONS: dict[str, str] = {
    "binary": "Binary scoring: PASS (score=1) or FAIL (score=0) only.",
    "scored_1_to_5": (
        "Numeric scoring: 0 to 5. (5=fully meets, 3=partially meets, 0=does not meet)"
    ),
    "weighted_1_to_5": (
        "Numeric scoring: 0 to 5. (5=fully meets, 3=partially meets, 0=does not meet)"
    ),
    "scored_1_to_10": (
        "Numeric scoring: 0 to 10. (10=fully meets, 5=partially meets, 0=does not meet)"
    ),
    "weighted_1_to_10": (
        "Numeric scoring: 0 to 10. (10=fully meets, 5=partially meets, 0=does not meet)"
    ),
}

_CHUNK_SIZE = 3000


def build_system_prompt(category_name: str, scoring_type: str) -> str:
    """Build the system prompt for an NC3 LLM call.

    The system prompt establishes NC3's evaluator role and must never be
    overridable by checklist content (per security design — NC2.5 prompts
    are placed in the user prompt only).

    Args:
        category_name: The name of the checklist category being evaluated.
        scoring_type: Global scoring type from NC2 (binary, scored_1_to_5, etc.).

    Returns:
        System prompt string ready to pass to the Anthropic API.
    """
    scoring_description = _SCORING_TYPE_DESCRIPTIONS.get(
        scoring_type,
        _SCORING_TYPE_DESCRIPTIONS["binary"],
    )

    return (
        "You are a professional proposal evaluation specialist conducting a structured\n"
        "assessment of a business proposal document.\n\n"
        f'Your current task: Evaluate the proposal against the "{category_name}" category\n'
        "of the evaluation checklist.\n\n"
        "Your evaluation must be:\n"
        "- Objective: base all findings strictly on content present in the proposal text provided.\n"
        "- Evidence-based: every PASS finding must cite a specific quote, section, slide, or page.\n"
        "- Precise: do not infer, assume, or give benefit of the doubt for missing content.\n"
        "- Structured: your entire response must be a valid JSON array — nothing else.\n\n"
        f"Scoring system in use: {scoring_description}\n\n"
        "Critical rules:\n"
        "1. Never award PASS based on implied or vague content — evidence must be explicit.\n"
        "2. Never penalise for content that is reasonably outside a proposal's scope.\n"
        "3. If a checklist item is ambiguous, evaluate it against the most reasonable interpretation.\n"
        "4. Your response must be ONLY the JSON array. No preamble, no explanation, no markdown."
    )


def build_user_prompt(evaluation_prompt: str, proposal_chunk: str) -> str:
    """Build the user prompt for an NC3 LLM call.

    NC2.5's dynamically-written evaluation prompt is injected here — sandboxed
    in the user prompt per the pipeline's security design decision.

    Args:
        evaluation_prompt: The full evaluation prompt string from NC2.5
            (category["evaluation_prompt"]).
        proposal_chunk: The proposal text to evaluate (full or chunked subset).

    Returns:
        User prompt string ready to pass to the Anthropic API.
    """
    return (
        f"{evaluation_prompt}\n\n"
        "---\n\n"
        "PROPOSAL DOCUMENT CONTENT:\n"
        f"{proposal_chunk}\n\n"
        "---\n\n"
        "Now evaluate each checklist item listed above against the proposal content provided.\n"
        "Respond with ONLY the JSON array as specified. Begin your response with [ and end with ]"
    )


def chunk_proposal(
    proposal_text: str,
    category: dict[str, Any],
    max_chars: int = 80000,
) -> str:
    """Return a context-window-safe excerpt of the proposal, filtered for relevance.

    If the proposal text fits within max_chars, it is returned unchanged.
    Otherwise the text is split into ~3000-char chunks (at newline boundaries),
    each chunk is scored for relevance to the category, and the highest-scoring
    chunks are assembled up to max_chars (preserving original reading order).

    Args:
        proposal_text: Full extracted text of the proposal document.
        category: NC2 category dict (used to derive signal words for scoring).
        max_chars: Character budget. Chunks exceeding this are omitted.

    Returns:
        Proposal text (possibly condensed) ready to embed in the user prompt.
    """
    if len(proposal_text) <= max_chars:
        return proposal_text

    # --- Split into ~3000-char chunks at newline boundaries ---
    chunks: list[str] = []
    current_lines: list[str] = []
    current_len = 0

    for line in proposal_text.splitlines(keepends=True):
        if current_len + len(line) > _CHUNK_SIZE and current_lines:
            chunks.append("".join(current_lines))
            current_lines = [line]
            current_len = len(line)
        else:
            current_lines.append(line)
            current_len += len(line)

    if current_lines:
        chunks.append("".join(current_lines))

    # --- Collect signal words from category name + all item texts ---
    signal_words: set[str] = set()
    for word in category.get("name", "").lower().split():
        clean = re.sub(r"\W", "", word)
        if clean:
            signal_words.add(clean)

    for item in category.get("items", []):
        for word in item.get("text", "").lower().split():
            clean = re.sub(r"\W", "", word)
            if clean and len(clean) > 3:
                signal_words.add(clean)

    # --- Score each chunk ---
    scored: list[tuple[float, int, str]] = []
    for idx, chunk in enumerate(chunks):
        chunk_lower = chunk.lower()
        hits = sum(1 for w in signal_words if w and w in chunk_lower)
        relevance = hits / max(len(signal_words), 1)
        scored.append((relevance, idx, chunk))

    # --- Greedy selection (highest relevance first) up to max_chars ---
    scored.sort(key=lambda x: (-x[0], x[1]))

    selected_indices: set[int] = set()
    total_chars = 0
    for relevance, idx, chunk in scored:
        if total_chars + len(chunk) <= max_chars:
            selected_indices.add(idx)
            total_chars += len(chunk)
        if total_chars >= max_chars:
            break

    if not selected_indices:
        selected_indices.add(scored[0][1])

    # --- Re-sort by original document order ---
    ordered = sorted(selected_indices)

    # --- Join with omission markers between non-contiguous chunks ---
    parts: list[str] = []
    prev_idx: int | None = None
    for idx in ordered:
        if prev_idx is not None and idx != prev_idx + 1:
            parts.append("\n\n[...section omitted...]\n\n")
        parts.append(chunks[idx])
        prev_idx = idx

    category_name = category.get("name", "this category")
    note = (
        f"[NOTE: This is a condensed excerpt of the full proposal, filtered for relevance "
        f"to the '{category_name}' evaluation category.]\n\n"
    )

    return note + "".join(parts)


def parse_llm_response(
    raw_response: str,
    expected_item_ids: list[str],
) -> list[dict[str, Any]]:
    """Robustly parse the LLM's raw text response into a list of finding dicts.

    Handles markdown code fences, preamble text, and malformed JSON gracefully.
    Never raises — always returns a valid list.

    Args:
        raw_response: The raw text content from the LLM response.
        expected_item_ids: Item IDs expected in the response (used for position
            assignment and for building fallback results if parsing fails).

    Returns:
        List of finding dicts with keys: item_id, status, score, evidence, gap.
    """
    text = raw_response.strip()

    # Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```\s*$", "", text)
    text = text.strip()

    # Find the JSON array boundaries
    start = text.find("[")
    end = text.rfind("]")

    if start == -1 or end == -1 or end <= start:
        logger.warning(
            "NC3 parse_llm_response: no JSON array found. First 200 chars: %r",
            raw_response[:200],
        )
        return _fallback_findings(expected_item_ids)

    json_str = text[start : end + 1]

    try:
        data = json.loads(json_str)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning(
            "NC3 parse_llm_response: JSON parsing failed: %s. First 200 chars: %r",
            exc,
            raw_response[:200],
        )
        return _fallback_findings(expected_item_ids)

    if not isinstance(data, list):
        logger.warning("NC3 parse_llm_response: parsed JSON is not a list")
        return _fallback_findings(expected_item_ids)

    result: list[dict[str, Any]] = []
    for i, elem in enumerate(data):
        if not isinstance(elem, dict):
            logger.debug("NC3 parse_llm_response: element %d is not a dict, skipping", i)
            continue

        item_id = elem.get("item_id")
        if not item_id and i < len(expected_item_ids):
            item_id = expected_item_ids[i]

        raw_status = str(elem.get("status", "FAIL")).strip().upper()
        status = raw_status if raw_status in ("PASS", "PARTIAL", "FAIL") else "FAIL"

        try:
            score = float(elem.get("score", 0.0))
            score = max(0.0, score)
        except (ValueError, TypeError):
            score = 0.0

        evidence = elem.get("evidence")
        gap = elem.get("gap")

        result.append({
            "item_id": item_id,
            "status": status,
            "score": score,
            "evidence": evidence if evidence else None,
            "gap": gap if gap else None,
        })

    if not result:
        logger.warning("NC3 parse_llm_response: parsed list was empty, using fallback")
        return _fallback_findings(expected_item_ids)

    return result


def _fallback_findings(expected_item_ids: list[str]) -> list[dict[str, Any]]:
    """Build a fallback FAIL finding for every expected item.

    Args:
        expected_item_ids: The item IDs that should have been in the LLM response.

    Returns:
        List of FAIL findings with parse-error gap messages.
    """
    return [
        {
            "item_id": item_id,
            "status": "FAIL",
            "score": 0.0,
            "evidence": None,
            "gap": (
                "LLM response could not be parsed. "
                "Manual review required for this item."
            ),
        }
        for item_id in expected_item_ids
    ]
