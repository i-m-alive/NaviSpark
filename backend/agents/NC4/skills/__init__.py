"""
NC4 Skills Package

Seven skill modules for the NC4 Synthesis & Report Agent:

  NC4.1 — WeightedScoreAggregator        : normalises + weights all category scores → overall_score
  NC4.2 — CrossChecklistConsistencyCheck : detects contradictions across category findings
  NC4.3 — PriorityActionGenerator        : builds must_fix / should_fix / next_time action lists
  NC4.4 — StrengthsIdentifier            : identifies top 3 categories above passing threshold
  NC4.5 — ExecutiveSummaryGenerator      : writes 4–5 sentence plain-English briefing
  NC4.6 — VerdictEngine                  : applies verdict rules → READY / NEEDS REVISION / DO NOT SEND
  NC4.7 — DimensionMapper                : maps custom checklist scores → 15 standard dimensions
"""

from __future__ import annotations

from .skill_nc4_1_weighted_score_aggregator import WeightedScoreAggregator
from .skill_nc4_2_cross_checklist_consistency_check import CrossChecklistConsistencyCheck
from .skill_nc4_3_priority_action_generator import PriorityActionGenerator
from .skill_nc4_4_strengths_identifier import StrengthsIdentifier
from .skill_nc4_5_executive_summary_generator import ExecutiveSummaryGenerator
from .skill_nc4_6_verdict_engine import VerdictEngine
from .skill_nc4_7_dimension_mapper import DimensionMapper

__all__ = [
    "WeightedScoreAggregator",
    "CrossChecklistConsistencyCheck",
    "PriorityActionGenerator",
    "StrengthsIdentifier",
    "ExecutiveSummaryGenerator",
    "VerdictEngine",
    "DimensionMapper",
]
