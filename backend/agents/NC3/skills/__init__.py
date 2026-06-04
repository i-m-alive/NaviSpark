"""
NC3 Skills Package

Four skill modules for the NC3 Proposal Evaluator Agent.
Unlike NC1 and NC2, these skills are not named after fixed domain functions —
they are evaluation pipeline stages applied to ANY category at runtime.

  NC3.1 — ItemEvaluator         : calls LLM API; parses JSON response into raw findings
  NC3.2 — EvidenceLinker        : classifies and verifies evidence references
  NC3.3 — PartialCreditScorer   : validates scores; enforces PASS/PARTIAL/FAIL consistency
  NC3.4 — GapNarrativeWriter    : structures gaps with severity, action tier, fix suggestions
"""

from __future__ import annotations

from .skill_nc3_1_item_evaluator import ItemEvaluator
from .skill_nc3_2_evidence_linker import EvidenceLinker
from .skill_nc3_3_partial_credit_scorer import PartialCreditScorer
from .skill_nc3_4_gap_narrative_writer import GapNarrativeWriter

__all__ = [
    "ItemEvaluator",
    "EvidenceLinker",
    "PartialCreditScorer",
    "GapNarrativeWriter",
]
