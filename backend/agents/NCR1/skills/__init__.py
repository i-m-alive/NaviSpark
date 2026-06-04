"""NCR1 skill modules — Clarity & Completeness."""

from .skill_ncr1_1_section_completeness import get_prompt_section as section_completeness_prompt
from .skill_ncr1_2_writing_quality import PROMPT_SECTION as writing_quality_prompt
from .skill_ncr1_3_scope_clarity import PROMPT_SECTION as scope_clarity_prompt

__all__ = [
    "section_completeness_prompt",
    "writing_quality_prompt",
    "scope_clarity_prompt",
]
