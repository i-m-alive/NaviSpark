"""
NC3 Agent — Proposal Evaluator (Dynamic Fan-Out)
Custom Checklist Review Pipeline

Stage 2: runs after NC1 and NC2 complete.
One NC3Agent instance is spawned per checklist category from NC2.
All instances run in parallel via ThreadPoolExecutor.

NC3 is the only LLM-calling agent in the pipeline.

Single-instance output schema (one per category):
{
    "category_id":     str,
    "category_name":   str,
    "status":          "complete" | "error",
    "score":           float,
    "max_score":       float,
    "items_evaluated": int,
    "items_passed":    int,
    "items_partial":   int,
    "items_failed":    int,
    "findings": [
        {
            "item_id":        str,
            "status":         "PASS" | "PARTIAL" | "FAIL",
            "score":          float,
            "evidence":       str | None,
            "gap":            str | None,
            "evidence_meta":  dict,
            "score_meta":     dict,
            "gap_structured": dict | None
        }
    ],
    "error_message":   str | None   # populated only when status == "error"
}

Fan-out output: list of the above, one per category.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from .skills import (
    EvidenceLinker,
    GapNarrativeWriter,
    ItemEvaluator,
    PartialCreditScorer,
)

logger = logging.getLogger(__name__)


class NC3Agent:
    """Single-category Proposal Evaluator.

    One instance of NC3Agent is created per checklist category. Each instance
    evaluates the proposal against its assigned category's items only.

    Args:
        category: One NC2 category dict (name, items, evaluation_prompt, weight).
        scoring_type: Global scoring type from NC2 (binary / scored_1_to_5 / etc.).

    Usage:
        client = anthropic.Anthropic()
        agent  = NC3Agent(
            category=nc2_output["categories"][0],
            scoring_type=nc2_output["scoring_type"],
        )
        result = agent.run(
            proposal_text="...",
            nc1_context=nc1_output["auto_detected"],
        )
    """

    def __init__(
        self,
        category: dict[str, Any],
        scoring_type: str,
    ) -> None:
        self.category = category
        self.scoring_type = scoring_type

        # Use Bedrock (consistent with the rest of the project) — no anthropic SDK needed
        self.item_evaluator = ItemEvaluator()
        self.evidence_linker = EvidenceLinker()
        self.partial_credit = PartialCreditScorer()
        self.gap_writer = GapNarrativeWriter()

    def run(
        self,
        proposal_text: str,
        nc1_context: dict[str, Any],
    ) -> dict[str, Any]:
        """Execute the full NC3 evaluation pipeline for this agent's assigned category.

        Args:
            proposal_text: Full extracted text of the uploaded proposal document.
            nc1_context: NC1's auto_detected dict (industry, type, priorities, etc.).

        Returns:
            Single-category result dict matching the NC3 output schema.
            On any exception, returns a structured error result — never raises.
        """
        category_id: str = self.category.get("id", "unknown")
        category_name: str = self.category.get("name", "Unknown Category")

        logger.info(
            "NC3Agent.run() started. category='%s', items=%d",
            category_name,
            len(self.category.get("items", [])),
        )

        try:
            # --- Skill NC3.1: Item Evaluator — LLM call ---
            raw_findings = self.item_evaluator.run(
                proposal_text=proposal_text,
                category=self.category,
                nc1_context=nc1_context,
                scoring_type=self.scoring_type,
            )
            logger.info(
                "NC3.1 complete. category='%s', raw_findings=%d",
                category_name, len(raw_findings),
            )

            # --- Skill NC3.2: Evidence Linker ---
            findings = self.evidence_linker.run(
                findings=raw_findings,
                proposal_text=proposal_text,
                category_items=self.category.get("items", []),
            )
            logger.info("NC3.2 complete. category='%s'", category_name)

            # --- Skill NC3.3: Partial Credit Scorer ---
            findings = self.partial_credit.run(
                findings=findings,
                scoring_type=self.scoring_type,
                category_items=self.category.get("items", []),
            )
            logger.info("NC3.3 complete. category='%s'", category_name)

            # --- Skill NC3.4: Gap Narrative Writer ---
            findings = self.gap_writer.run(
                findings=findings,
                category=self.category,
                scoring_type=self.scoring_type,
            )
            logger.info("NC3.4 complete. category='%s'", category_name)

            # --- Compute category-level aggregates ---
            items_passed = sum(1 for f in findings if f["status"] == "PASS")
            items_partial = sum(1 for f in findings if f["status"] == "PARTIAL")
            items_failed = sum(1 for f in findings if f["status"] == "FAIL")
            total_score = sum(f["score"] for f in findings)

            score_meta_sample = findings[0].get("score_meta", {}) if findings else {}
            max_per_item = score_meta_sample.get("max_score", 1.0)
            max_score_total = max_per_item * len(findings)

            result: dict[str, Any] = {
                "category_id": category_id,
                "category_name": category_name,
                "status": "complete",
                "score": round(total_score, 2),
                "max_score": round(max_score_total, 2),
                "items_evaluated": len(findings),
                "items_passed": items_passed,
                "items_partial": items_partial,
                "items_failed": items_failed,
                "findings": findings,
                "error_message": None,
            }

            logger.info(
                "NC3Agent.run() complete. category='%s' score=%.2f/%.2f "
                "passed=%d partial=%d failed=%d",
                category_name, total_score, max_score_total,
                items_passed, items_partial, items_failed,
            )

            return result

        except Exception as exc:
            logger.error(
                "NC3Agent.run() FAILED for category='%s': %s",
                category_name, exc, exc_info=True,
            )
            return {
                "category_id": category_id,
                "category_name": category_name,
                "status": "error",
                "score": 0.0,
                "max_score": 0.0,
                "items_evaluated": 0,
                "items_passed": 0,
                "items_partial": 0,
                "items_failed": 0,
                "findings": [],
                "error_message": str(exc),
            }


def run_nc3_fanout(
    nc2_output: dict[str, Any],
    proposal_text: str,
    nc1_context: dict[str, Any],
    max_workers: int | None = None,
) -> list[dict[str, Any]]:
    """Orchestrate all NC3 instances in parallel using ThreadPoolExecutor.

    One NC3Agent instance is created per category in nc2_output["categories"].
    All instances run concurrently. Results are collected and returned in the
    same order as the input categories (not completion order).

    Args:
        nc2_output: Full NC2 output dict (categories, scoring_type, etc.).
        proposal_text: Full extracted text of the proposal document.
        nc1_context: NC1's auto_detected dict.
        max_workers: ThreadPoolExecutor max_workers. Defaults to len(categories)
            capped at 8 to avoid API rate limits.

    Returns:
        List of NC3 result dicts, one per category, in the same order as
        nc2_output["categories"].

    Example:
        nc3_results = run_nc3_fanout(
            nc2_output, proposal_text, nc1_context["auto_detected"]
        )
    """
    categories: list[dict[str, Any]] = nc2_output.get("categories", [])
    scoring_type: str = nc2_output.get("scoring_type", "binary")

    if not categories:
        logger.warning("run_nc3_fanout called with zero categories — returning empty list")
        return []

    n_workers = min(len(categories), max_workers or 8)
    logger.info(
        "run_nc3_fanout starting. categories=%d, workers=%d, scoring_type=%s",
        len(categories), n_workers, scoring_type,
    )

    agents: list[NC3Agent] = [
        NC3Agent(category=cat, scoring_type=scoring_type)
        for cat in categories
    ]

    results: list[dict[str, Any] | None] = [None] * len(agents)

    with ThreadPoolExecutor(max_workers=n_workers) as executor:
        future_to_index = {
            executor.submit(agent.run, proposal_text, nc1_context): idx
            for idx, agent in enumerate(agents)
        }

        for future in as_completed(future_to_index):
            idx = future_to_index[future]
            category_name = categories[idx].get("name", f"Category {idx}")
            try:
                results[idx] = future.result()
                logger.info(
                    "NC3 fan-out: category '%s' (idx=%d) completed. status=%s",
                    category_name, idx, results[idx]["status"],  # type: ignore[index]
                )
            except Exception as exc:
                logger.error(
                    "NC3 fan-out: category '%s' (idx=%d) raised unexpected exception: %s",
                    category_name, idx, exc, exc_info=True,
                )
                results[idx] = {
                    "category_id": categories[idx].get("id", "unknown"),
                    "category_name": category_name,
                    "status": "error",
                    "score": 0.0,
                    "max_score": 0.0,
                    "items_evaluated": 0,
                    "items_passed": 0,
                    "items_partial": 0,
                    "items_failed": 0,
                    "findings": [],
                    "error_message": f"Unexpected fan-out exception: {exc}",
                }

    # Belt-and-suspenders: fill any un-populated slots
    for idx, r in enumerate(results):
        if r is None:
            results[idx] = {
                "category_id": categories[idx].get("id", "unknown"),
                "category_name": categories[idx].get("name", f"Category {idx}"),
                "status": "error",
                "score": 0.0,
                "max_score": 0.0,
                "items_evaluated": 0,
                "items_passed": 0,
                "items_partial": 0,
                "items_failed": 0,
                "findings": [],
                "error_message": "Result was never populated — unknown error in fan-out",
            }

    completed = sum(1 for r in results if r["status"] == "complete")
    errors = sum(1 for r in results if r["status"] == "error")
    logger.info(
        "run_nc3_fanout finished. total=%d complete=%d errors=%d",
        len(results), completed, errors,
    )

    return results  # type: ignore[return-value]
