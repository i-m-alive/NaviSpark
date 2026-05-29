# Agent 1 — Completeness & Clarity Reviewer

## Identity
Senior proposal consultant, 20+ years experience. Reads as a demanding client evaluation committee.
Does not give the benefit of the doubt. Flags what is missing, vague, or weak with evidence.

## Input
- `pdf_bytes`: Raw PDF bytes (sent to Bedrock as a native document block)
- `client_industry`: list[str] — selected industries from the upload context
- `proposal_type`: str — e.g. "Fixed Price", "T&M"
- `client_priorities`: list[str] — e.g. ["Cost Certainty", "Regulatory Compliance"]

## One Bedrock Call
All 6 skills are composed into ONE system prompt. The model returns ONE JSON object.
No skill triggers an independent Bedrock call.

## Skills

| # | Skill | File | Activation | Output Key(s) |
|---|---|---|---|---|
| 1.1 | Section Completeness Audit | skill_1_1_section_audit.py | Always | section_audit |
| 1.2 | Writing Quality Analysis | skill_1_2_writing_quality.py | Always | writing_issues |
| 1.3 | Scope Clarity Check | skill_1_3_scope_clarity.py | Always | scope_clarity_issues, high_risk_assumptions |
| 1.4 | Client-Specific Completeness | skill_1_4_industry_gaps.py | If industry in known list | client_specific_gaps |
| 1.5 | Jargon Density Check | skill_1_5_jargon_check.py | Non-technical industries only | jargon_flags |
| 1.6 | Rewrite Generator | skill_1_6_rewrite.py | Always | rewrite |

## Scoring

| Dimension | Weight | Score Key |
|---|---|---|
| Section Completeness | 40% | scores.section_completeness |
| Writing Quality | 20% | scores.writing_quality |
| Scope Clarity | 25% | scores.scope_clarity |
| Client Coverage | 15% | scores.client_coverage |
| **Overall** | — | scores.overall |

### Formula
```
overall = (section_completeness × 0.40) + (writing_quality × 0.20) + (scope_clarity × 0.25) + (client_coverage × 0.15)
```

### Hard Rules
- 3+ CRITICAL issues anywhere → overall score cannot exceed 5.5
- No CRITICAL issues, only MINOR → can score 8.0+

## GSK Proposal Checklist Items Covered (22 items)
P-01, P-02, P-03, P-04, P-05, P-06, P-07, P-08, P-09, P-10,
P-11, P-12, P-13, P-14, P-15, P-16, P-17, P-18, P-19, P-19a-d, P-20, P-21, P-22

## Resource Files

| File | Purpose |
|---|---|
| resources/gsk_checklist.py | 22 P-items as structured Python constants + prompt builder |
| resources/industry_factors.py | Per-industry required sections (8 industries) + prompt builder |
| resources/filler_phrases.py | Exhaustive filler / hidden-accountability / unsubstantiated-claim lists |
| resources/jargon_industries.py | Technical vs non-technical industry routing + activation function |

## Technical / Non-Technical Industry Routing (Skill 1.5)

| Activate Jargon Check | Suppress Jargon Check |
|---|---|
| Healthcare / Pharma | Fintech / Banking |
| Government / Public Sector | Deep Tech / AI |
| Retail / E-commerce | Manufacturing |
| Education | |
| Real Estate | |
| Logistics / Supply Chain | |

## Entry Point
```python
from agents.agent1 import run

result = run(
    pdf_bytes=pdf_bytes,
    client_industry=["Healthcare / Pharma"],
    proposal_type="Fixed Price",
    client_priorities=["Regulatory Compliance", "Cost Certainty"],
)
```
