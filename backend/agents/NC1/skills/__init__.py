"""
NC1 Skills Package

Contains the five skill modules used by the NC1 Document Intelligence Agent:
  - skill_nc1_1_proposal_structure_mapper  : extracts TOC, headings, slide titles
  - skill_nc1_2_context_auto_detector      : detects industry, proposal type, priorities
  - skill_nc1_3_project_metadata_extractor : extracts client, vendor, timeline, budget, team
  - skill_nc1_4_document_quality_prescanner: completeness check for key sections
  - skill_nc1_5_confidence_scorer          : computes confidence score for auto-detected values
"""

from .skill_nc1_1_proposal_structure_mapper import ProposalStructureMapper
from .skill_nc1_2_context_auto_detector import ContextAutoDetector
from .skill_nc1_3_project_metadata_extractor import ProjectMetadataExtractor
from .skill_nc1_4_document_quality_prescanner import DocumentQualityPrescanner
from .skill_nc1_5_confidence_scorer import ConfidenceScorer

__all__ = [
    "ProposalStructureMapper",
    "ContextAutoDetector",
    "ProjectMetadataExtractor",
    "DocumentQualityPrescanner",
    "ConfidenceScorer",
]
