"""
Skill NC1.5 — Confidence Scorer

Computes an overall confidence score (0.0–1.0) for NC1's auto-detected values,
based on the quality and quantity of evidence signals gathered by all previous
NC1 skills. The score is a weighted sum of five components.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_METADATA_FIELDS = (
    "client_name",
    "vendor_name",
    "project_name",
    "proposed_timeline",
    "budget_range",
    "team_size",
    "delivery_methodology",
)

_WEIGHTS = {
    "metadata_completeness": 0.30,
    "context_detection_signals": 0.25,
    "industry_confidence": 0.15,
    "structure_richness": 0.15,
    "document_completeness": 0.15,
}


class ConfidenceScorer:
    """Computes a composite confidence score for NC1's auto-detected output.

    Weighted components:
      - Metadata completeness    (0.30): fraction of 7 metadata fields that are non-None.
      - Context detection signals(0.25): number of keyword signals detected (capped at 5).
      - Industry confidence      (0.15): higher when exactly one industry is detected.
      - Structure richness       (0.15): number of sections found (capped at 10).
      - Document completeness    (0.15): completeness_score from NC1.4.

    Post-adjustment: subtract 0.10 if both client_name and vendor_name are None.
    Final value is clamped to [0.0, 1.0].
    """

    def run(
        self,
        metadata: dict[str, Any],
        context: dict[str, Any],
        structure: dict[str, Any],
        quality: dict[str, Any],
    ) -> float:
        """Compute the confidence score from all NC1 skill outputs.

        Args:
            metadata: Output of NC1.3 ProjectMetadataExtractor.
            context: Output of NC1.2 ContextAutoDetector.
            structure: Output of NC1.1 ProposalStructureMapper.
            quality: Output of NC1.4 DocumentQualityPrescanner.

        Returns:
            Confidence float in [0.0, 1.0].
        """
        logger.debug("NC1.5 ConfidenceScorer.run() computing score")

        metadata_completeness = self._score_metadata_completeness(metadata)
        context_signals = self._score_context_signals(context)
        industry_confidence = self._score_industry_confidence(context)
        structure_richness = self._score_structure_richness(structure)
        document_completeness = self._score_document_completeness(quality)

        score = (
            _WEIGHTS["metadata_completeness"] * metadata_completeness
            + _WEIGHTS["context_detection_signals"] * context_signals
            + _WEIGHTS["industry_confidence"] * industry_confidence
            + _WEIGHTS["structure_richness"] * structure_richness
            + _WEIGHTS["document_completeness"] * document_completeness
        )

        if metadata.get("client_name") is None and metadata.get("vendor_name") is None:
            score -= 0.10
            logger.debug("NC1.5 both parties unknown — applying -0.10 penalty")

        final = max(0.0, min(1.0, round(score, 4)))
        logger.debug(
            "NC1.5 components: meta=%.2f signals=%.2f industry=%.2f struct=%.2f doc=%.2f "
            "→ final=%.4f",
            metadata_completeness, context_signals, industry_confidence,
            structure_richness, document_completeness, final,
        )
        return final

    def _score_metadata_completeness(self, metadata: dict[str, Any]) -> float:
        """Fraction of the 7 metadata fields that are non-None.

        Args:
            metadata: NC1.3 output dict.

        Returns:
            Float in [0.0, 1.0].
        """
        total = len(_METADATA_FIELDS)
        if total == 0:
            return 0.0
        filled = sum(1 for f in _METADATA_FIELDS if metadata.get(f) is not None)
        return filled / total

    def _score_context_signals(self, context: dict[str, Any]) -> float:
        """Score based on number of detection signals, capped at 5.

        Args:
            context: NC1.2 output dict.

        Returns:
            Float in [0.0, 1.0].
        """
        signals = context.get("detection_signals", [])
        return min(len(signals) / 5.0, 1.0)

    def _score_industry_confidence(self, context: dict[str, Any]) -> float:
        """Score based on industry detection specificity.

        One match → 1.0 (high confidence, unambiguous).
        Two or more matches → 0.7 (detected but ambiguous).
        Zero matches → 0.3 (nothing detected).

        Args:
            context: NC1.2 output dict.

        Returns:
            Float in [0.0, 1.0].
        """
        industries = context.get("client_industry", [])
        n = len(industries)
        if n == 1:
            return 1.0
        if n >= 2:
            return 0.7
        return 0.3

    def _score_structure_richness(self, structure: dict[str, Any]) -> float:
        """Score based on number of detected sections, capped at 10.

        Args:
            structure: NC1.1 output dict.

        Returns:
            Float in [0.0, 1.0].
        """
        sections = structure.get("sections", [])
        return min(len(sections) / 10.0, 1.0)

    def _score_document_completeness(self, quality: dict[str, Any]) -> float:
        """Pass through the completeness_score from NC1.4 directly.

        Args:
            quality: NC1.4 output dict.

        Returns:
            Float in [0.0, 1.0].
        """
        score = quality.get("completeness_score", 0.0)
        try:
            return float(score)
        except (TypeError, ValueError):
            return 0.0
