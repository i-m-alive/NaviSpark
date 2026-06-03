"""
Skill NC3.1 — Item Evaluator

The core evaluation skill. Assembles the full prompt using prompt_builder,
calls AWS Bedrock (via bedrock_client) with the assembled prompt, and returns
the raw parsed findings list.

Uses the same Bedrock infrastructure as the rest of the pipeline — no anthropic
SDK dependency required.

Assistant prefill technique:
  The user prompt ends with instructions to begin with '['.
  We also supply {"role": "assistant", "content": "["} as the last message to
  force Bedrock to continue from that character.  This virtually eliminates
  preamble / non-JSON responses.  We prepend '[' to raw_text before parsing.
"""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

_MAX_TOKENS = 8192  # increased from 4096 to handle large checklists


class ItemEvaluator:
    """Calls AWS Bedrock to evaluate proposal items against a checklist category.

    Uses invoke_agent_text_only (bedrock_client) for the LLM call so this
    skill is consistent with Agents 1–4 in the existing pipeline and requires
    no additional credentials or packages.

    Assistant prefill forces the response to start with '[' ensuring the
    model returns a JSON array rather than prose or a JSON object.
    """

    def __init__(self) -> None:
        self.max_tokens = _MAX_TOKENS

    def run(
        self,
        proposal_text: str,
        category: dict[str, Any],
        nc1_context: dict[str, Any],
        scoring_type: str,
    ) -> list[dict[str, Any]]:
        """Call Bedrock to evaluate the proposal against this category's items.

        Args:
            proposal_text: Full extracted text of the proposal document.
            category: One NC2 category dict with name, items, evaluation_prompt.
            nc1_context: NC1 auto_detected dict (already embedded in evaluation_prompt
                by NC2.5 — passed here for logging only).
            scoring_type: Global scoring type from NC2 (binary, scored_1_to_5, etc.).

        Returns:
            List of raw finding dicts from parse_llm_response.

        Raises:
            RuntimeError: If the Bedrock call fails.
        """
        from .. import prompt_builder
        from bedrock_client import get_bedrock_client, _invoke_bedrock_with_retry

        category_name: str = category.get("name", "Unknown")
        expected_ids: list[str] = [
            item["id"] for item in category.get("items", [])
        ]

        proposal_chunk = prompt_builder.chunk_proposal(proposal_text, category)
        system_prompt  = prompt_builder.build_system_prompt(category_name, scoring_type)
        user_prompt    = prompt_builder.build_user_prompt(
            category.get("evaluation_prompt", ""),
            proposal_chunk,
        )

        logger.info(
            "NC3.1 calling Bedrock for category='%s', items=%d, prompt_chars=%d",
            category_name,
            len(expected_ids),
            len(user_prompt),
        )

        # ── Bedrock call with assistant prefill ───────────────────────────────
        # Prefilling with "[" forces the model to start its response with that
        # character, virtually guaranteeing a JSON array response.
        try:
            client = get_bedrock_client()
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": self.max_tokens,
                "temperature": 0,
                "system": system_prompt,
                "messages": [
                    {"role": "user",      "content": user_prompt},
                    {"role": "assistant", "content": "["},   # prefill → forces JSON array
                ],
            }
            response      = _invoke_bedrock_with_retry(client, request_body)
            response_body = json.loads(response["body"].read())
            continuation: str = response_body["content"][0]["text"]

            # The prefill '[' is NOT included in the response body — prepend it.
            raw_text = "[" + continuation

        except Exception as exc:
            logger.error(
                "NC3.1 ItemEvaluator Bedrock call failed for category '%s': %s",
                category_name, exc,
            )
            raise RuntimeError(
                f"ItemEvaluator failed for '{category_name}': {exc}"
            ) from exc

        findings = prompt_builder.parse_llm_response(raw_text, expected_ids)

        logger.info(
            "NC3.1 Bedrock response received. category='%s', findings=%d",
            category_name,
            len(findings),
        )

        return findings
