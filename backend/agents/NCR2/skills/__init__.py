"""NCR2 skill modules — Commercial Strength."""

from .skill_ncr2_1_estimation_rigour import PROMPT_SECTION as estimation_rigour_prompt
from .skill_ncr2_2_phase_coverage import PROMPT_SECTION as phase_coverage_prompt
from .skill_ncr2_3_pricing_completeness import PROMPT_SECTION as pricing_completeness_prompt

__all__ = [
    "estimation_rigour_prompt",
    "phase_coverage_prompt",
    "pricing_completeness_prompt",
]
