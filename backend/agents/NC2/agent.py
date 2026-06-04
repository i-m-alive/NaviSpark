"""
NC2 Agent — Checklist Intelligence
Custom Checklist Review Pipeline

Runs in parallel with NC1 (Stage 1).
Converts any uploaded checklist file into structured evaluation criteria
and dynamically written evaluation prompts for NC3.

Inputs:
    file_path   : str  — absolute path to the uploaded checklist file
    nc1_context : dict — optional NC1 auto_detected output for prompt enrichment

Output schema:
{
    "checklist_id":  str,
    "format":        str,
    "total_items":   int,
    "scoring_type":  str,
    "weights_source": str,
    "categories": [
        {
            "id":                str,
            "name":              str,
            "item_count":        int,
            "weight":            float,
            "source":            str,
            "items": [
                {
                    "id":                str,
                    "text":              str,
                    "description":       str | None,
                    "required_evidence": str | None,
                    "pass_condition":    str | None,
                    "weight":            float,
                    "scoring":           str,
                    "raw_source":        str
                }
            ],
            "evaluation_prompt": str
        }
    ],
    "parse_warnings": list[str]
}
"""

from __future__ import annotations

import logging
import os
from typing import Any

from .skills import (
    CriteriaExtractor,
    CategoryGrouper,
    EvaluationFrameworkBuilder,
    FormatDetectorParser,
    WeightScoringSchemaExtractor,
)

logger = logging.getLogger(__name__)


class NC2Agent:
    """Checklist Intelligence Agent.

    Accepts a path to an uploaded checklist file and optional NC1 context.
    Runs all five NC2 skills in sequence and assembles the full NC2 output schema.

    Usage:
        agent = NC2Agent()
        result = agent.run(file_path="/uploads/checklist.xlsx")

        # With NC1 context enrichment:
        result = agent.run(
            file_path="/uploads/checklist.xlsx",
            nc1_context=nc1_output["auto_detected"],
        )
    """

    def __init__(self) -> None:
        self.format_parser = FormatDetectorParser()
        self.criteria_extractor = CriteriaExtractor()
        self.category_grouper = CategoryGrouper()
        self.weight_extractor = WeightScoringSchemaExtractor()
        self.framework_builder = EvaluationFrameworkBuilder()

    def run(
        self,
        file_path: str,
        nc1_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute the full NC2 Checklist Intelligence pipeline.

        Args:
            file_path: Absolute path to the uploaded checklist file.
                Supported formats: .xlsx, .xlsm, .csv, .docx, .pdf
            nc1_context: Optional. The "auto_detected" dict from NC1 output.
                If provided, NC2.5 enriches evaluation prompts with proposal
                context (industry, type, client priorities).

        Returns:
            NC2 output dict matching the documented output schema.

        Raises:
            FileNotFoundError: If file_path does not exist.
            ValueError: If the file format is not supported.
            RuntimeError: If any skill raises an unhandled exception.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Checklist file not found: {file_path}")

        logger.info("NC2Agent.run() started. file=%s", os.path.basename(file_path))

        # --- Skill NC2.1: Format Detection & Parsing ---
        try:
            parsed = self.format_parser.parse(file_path)
            detected_format = parsed["format"]
            raw_rows = parsed["raw_rows"]
            parse_warnings: list[str] = parsed.get("parse_warnings", [])
            headers: list[str] = parsed.get("headers", [])
            logger.info(
                "NC2.1 complete. format=%s, raw_rows=%d, warnings=%d",
                detected_format, len(raw_rows), len(parse_warnings),
            )
        except (ValueError, FileNotFoundError):
            raise
        except Exception as exc:
            logger.error("NC2.1 FormatDetectorParser failed: %s", exc)
            raise RuntimeError(f"NC2.1 failed: {exc}") from exc

        if not raw_rows:
            raise RuntimeError(
                "NC2.1 parsed zero rows from the checklist file. "
                "Verify the file is not empty and is in a supported format."
            )

        # --- Skill NC2.2: Criteria Extraction ---
        try:
            items = self.criteria_extractor.run(
                raw_rows, headers=headers if headers else None
            )
            logger.info("NC2.2 complete. items_extracted=%d", len(items))
        except Exception as exc:
            logger.error("NC2.2 CriteriaExtractor failed: %s", exc)
            raise RuntimeError(f"NC2.2 failed: {exc}") from exc

        if not items:
            raise RuntimeError(
                "NC2.2 extracted zero checklist items. "
                "The checklist may be empty, or its format could not be parsed. "
                "Verify the checklist file contains evaluation criteria."
            )

        # --- Skill NC2.3: Category Grouping ---
        try:
            categories = self.category_grouper.run(items, raw_rows)
            logger.info("NC2.3 complete. categories=%d", len(categories))
        except Exception as exc:
            logger.error("NC2.3 CategoryGrouper failed: %s", exc)
            raise RuntimeError(f"NC2.3 failed: {exc}") from exc

        # --- Skill NC2.4: Weight & Scoring Schema Extraction ---
        try:
            weighted = self.weight_extractor.run(
                categories, headers=headers if headers else None
            )
            scoring_type: str = weighted["scoring_type"]
            weights_source: str = weighted["weights_source"]
            categories_weighted: list[dict] = weighted["categories"]
            logger.info(
                "NC2.4 complete. scoring_type=%s, weights_source=%s",
                scoring_type, weights_source,
            )
        except Exception as exc:
            logger.error("NC2.4 WeightScoringSchemaExtractor failed: %s", exc)
            raise RuntimeError(f"NC2.4 failed: {exc}") from exc

        # --- Skill NC2.5: Evaluation Framework Building ---
        try:
            categories_with_prompts = self.framework_builder.run(
                categories_weighted,
                scoring_type,
                nc1_context=nc1_context,
            )
            logger.info(
                "NC2.5 complete. prompts_written=%d", len(categories_with_prompts)
            )
        except Exception as exc:
            logger.error("NC2.5 EvaluationFrameworkBuilder failed: %s", exc)
            raise RuntimeError(f"NC2.5 failed: {exc}") from exc

        # --- Assemble output (strip internal _raw_fields from public output) ---
        for cat in categories_with_prompts:
            for item in cat.get("items", []):
                item.pop("_raw_fields", None)

        total_items = sum(cat["item_count"] for cat in categories_with_prompts)

        output: dict[str, Any] = {
            "checklist_id": f"checklist-{os.path.basename(file_path)}",
            "format": detected_format,
            "total_items": total_items,
            "scoring_type": scoring_type,
            "weights_source": weights_source,
            "categories": categories_with_prompts,
            "parse_warnings": parse_warnings,
        }

        logger.info(
            "NC2Agent.run() complete. total_items=%d, categories=%d, scoring=%s",
            total_items, len(categories_with_prompts), scoring_type,
        )
        return output
