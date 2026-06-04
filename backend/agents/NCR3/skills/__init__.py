"""NCR3 skill modules — Competitive Position."""

from .skill_ncr3_1_client_fit import get_prompt_section as client_fit_prompt
from .skill_ncr3_2_differentiation import PROMPT_SECTION as differentiation_prompt
from .skill_ncr3_3_risk_transparency import PROMPT_SECTION as risk_transparency_prompt
from .skill_ncr3_4_credibility import PROMPT_SECTION as credibility_prompt
from .skill_ncr3_5_narrative import PROMPT_SECTION as narrative_prompt
from .skill_ncr3_6_industry_win_factors import get_prompt_section as industry_factors_prompt

__all__ = [
    "client_fit_prompt",
    "differentiation_prompt",
    "risk_transparency_prompt",
    "credibility_prompt",
    "narrative_prompt",
    "industry_factors_prompt",
]
