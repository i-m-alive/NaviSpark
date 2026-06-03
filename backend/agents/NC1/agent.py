"""
NC1 Agent — Document Intelligence
Custom Checklist Review Pipeline

Runs in parallel with NC2. Parses the uploaded proposal and auto-detects
all contextual information. Outputs a structured JSON result consumed by:
  - The ContextConfirmPanel (frontend)
  - Every NC3 instance (as contextual input)

Output schema:
{
    "auto_detected": {
        "client_industry":   list[str],
        "proposal_type":     str,
        "client_priorities": list[str],
        "client_name":       str | None,
        "vendor_name":       str | None,
        "project_name":      str | None,
        "proposed_timeline": str | None,
        "budget_range":      str | None,
        "team_size":         int | None,
        "delivery_methodology": str | None
    },
    "structure_map": {
        "sections":    list[str],
        "slide_count": int,
        "has_toc":     bool,
        "structure_type": str
    },
    "quality_scan": {
        "sections_present":   dict[str, bool],
        "completeness_score": float,
        "missing_sections":   list[str],
        "quality_flags":      list[str]
    },
    "confidence": float
}
"""

from __future__ import annotations

import logging
from typing import Any

from .skills import (
    ConfidenceScorer,
    ContextAutoDetector,
    DocumentQualityPrescanner,
    ProjectMetadataExtractor,
    ProposalStructureMapper,
)

logger = logging.getLogger(__name__)


class NC1Agent:
    """Document Intelligence Agent.

    Accepts extracted proposal text and file type. Runs all five NC1 skills
    in sequence and assembles the full NC1 output schema.

    Usage:
        agent = NC1Agent()
        result = agent.run(document_text="...", file_type="pdf")
    """

    def __init__(self) -> None:
        self.structure_mapper = ProposalStructureMapper()
        self.context_detector = ContextAutoDetector()
        self.metadata_extractor = ProjectMetadataExtractor()
        self.quality_prescanner = DocumentQualityPrescanner()
        self.confidence_scorer = ConfidenceScorer()

    def run(self, document_text: str, file_type: str) -> dict[str, Any]:
        """Execute the full NC1 Document Intelligence pipeline.

        Args:
            document_text: Raw extracted text of the proposal document.
            file_type: "pdf" or "pptx".

        Returns:
            NC1 output dict matching the documented output schema.

        Raises:
            ValueError: If file_type is not "pdf" or "pptx", or if document_text is empty.
            RuntimeError: If any skill raises an unhandled exception.
        """
        if file_type not in ("pdf", "pptx"):
            raise ValueError(
                f"Unsupported file_type '{file_type}'. Must be 'pdf' or 'pptx'."
            )
        if not document_text or not document_text.strip():
            raise ValueError(
                "document_text is empty. Cannot run NC1 on an empty document."
            )

        logger.info(
            "NC1Agent.run() started. file_type=%s, text_length=%d",
            file_type,
            len(document_text),
        )

        # --- Skill NC1.1: Structure Mapping ---
        try:
            structure = self.structure_mapper.run(document_text, file_type)
            logger.debug(
                "NC1.1 complete. sections_found=%d", len(structure.get("sections", []))
            )
        except Exception as exc:
            logger.error("NC1.1 ProposalStructureMapper failed: %s", exc)
            raise RuntimeError(f"NC1.1 failed: {exc}") from exc

        # --- Skill NC1.2: Context Auto-Detection ---
        try:
            context = self.context_detector.run(document_text)
            logger.debug(
                "NC1.2 complete. industries=%s, proposal_type=%s",
                context.get("client_industry"),
                context.get("proposal_type"),
            )
        except Exception as exc:
            logger.error("NC1.2 ContextAutoDetector failed: %s", exc)
            raise RuntimeError(f"NC1.2 failed: {exc}") from exc

        # --- Skill NC1.3: Metadata Extraction ---
        try:
            metadata = self.metadata_extractor.run(document_text)
            logger.debug(
                "NC1.3 complete. client=%s, vendor=%s",
                metadata.get("client_name"),
                metadata.get("vendor_name"),
            )
        except Exception as exc:
            logger.error("NC1.3 ProjectMetadataExtractor failed: %s", exc)
            raise RuntimeError(f"NC1.3 failed: {exc}") from exc

        # --- Skill NC1.4: Document Quality Pre-scan ---
        try:
            quality = self.quality_prescanner.run(
                document_text, structure.get("sections", [])
            )
            logger.debug(
                "NC1.4 complete. completeness=%.2f, missing=%s",
                quality.get("completeness_score", 0.0),
                quality.get("missing_sections", []),
            )
        except Exception as exc:
            logger.error("NC1.4 DocumentQualityPrescanner failed: %s", exc)
            raise RuntimeError(f"NC1.4 failed: {exc}") from exc

        # --- Skill NC1.5: Confidence Scoring ---
        try:
            confidence = self.confidence_scorer.run(metadata, context, structure, quality)
            logger.info("NC1.5 complete. confidence=%.4f", confidence)
        except Exception as exc:
            logger.error("NC1.5 ConfidenceScorer failed: %s", exc)
            raise RuntimeError(f"NC1.5 failed: {exc}") from exc

        output: dict[str, Any] = {
            "auto_detected": {
                "client_industry": context.get("client_industry", []),
                "proposal_type": context.get("proposal_type", "Unknown"),
                "client_priorities": context.get("client_priorities", []),
                "client_name": metadata.get("client_name"),
                "vendor_name": metadata.get("vendor_name"),
                "project_name": metadata.get("project_name"),
                "proposed_timeline": metadata.get("proposed_timeline"),
                "budget_range": metadata.get("budget_range"),
                "team_size": metadata.get("team_size"),
                "delivery_methodology": metadata.get("delivery_methodology"),
            },
            "structure_map": structure,
            "quality_scan": quality,
            "confidence": confidence,
        }

        logger.info(
            "NC1Agent.run() complete. confidence=%.4f, quality_flags=%s",
            confidence,
            quality.get("quality_flags", []),
        )
        return output
