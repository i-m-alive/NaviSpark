# Agent 3 — Competitive Strength Reviewer

## Identity
Senior bid director and competitive intelligence specialist, 20+ years experience.
Evaluates proposals from both sides of the table. Spots generic, template-derived responses.
Reads as a seasoned procurement committee: genuine client understanding, real differentiators,
honest risk disclosure, credible track record, compelling story, industry-specific win signals.

## Input
- `pdf_bytes`: Raw PDF bytes (sent to Bedrock as a native document block)
- `client_industry`: list[str] — selected industries from the upload context
- `proposal_type`: str — e.g. "Fixed Price", "T&M", "Government RFP"
- `client_priorities`: list[str] — e.g. ["Cost Certainty", "Speed to Market"]

## One Bedrock Call
All 6 skills are composed into ONE system prompt. The model returns ONE JSON object.
No skill triggers an independent Bedrock call.

## Dynamic Calibration — Two Skills
| Skill | Calibrated By | Mirrors |
|-------|--------------|---------|
| 3.1 Client Fit | CLIENT_PRIORITIES | Agent 1 Skill 1.4 (calibrated by CLIENT_INDUSTRY) |
| 3.6 Industry Win Factors | CLIENT_INDUSTRY | Agent 2 Skill 2.5 (calibrated by PROPOSAL_TYPE) |

## Skills

| # | Skill | File | Activation | Output Key(s) |
|---|---|---|---|---|
| 3.1 | Client Understanding & Fit | skill_3_1_client_fit.py | Always, calibrated by client_priorities | client_fit_issues |
| 3.2 | Solution Differentiation | skill_3_2_differentiation.py | Always | differentiation (object) |
| 3.3 | Risk & Dependency Transparency | skill_3_3_risk_transparency.py | Always | risk_transparency_issues |
| 3.4 | Credibility & Trust Signals | skill_3_4_credibility.py | Always | credibility_gaps, overclaiming_flags |
| 3.5 | Proposal Narrative | skill_3_5_narrative.py | Always | narrative_assessment (object) |
| 3.6 | Industry Win Factors | skill_3_6_industry_win_factors.py | Always, calibrated by client_industry | industry_findings |

## Unique Output Structures
Two output fields are **objects** (not arrays), unlike all other agents:
- `differentiation`: `{ differentiators_found: [], sounds_generic: bool, generic_elements: [] }`
- `narrative_assessment`: `{ flows_as_story: bool, exec_summary_compelling: bool, clear_why_us: bool, clear_next_step: bool, narrative_gaps: [] }`

## GSK Item References in Issue Arrays
Two issue arrays carry a `gsk_item` field (consistent with Agent 2 convention):
- `risk_transparency_issues[].gsk_item`: `"P-14" | "P-16" | "P-20" | "P-21" | null`
- `credibility_gaps[].gsk_item`: `"P-08" | "P-18" | null` (null = governance model gaps)

This enables Agent 4 to detect double-flagging: when Agent 1 marks P-20 as PARTIAL/MISSING
**and** Agent 3 raises a `risk_transparency_issues` item with `gsk_item: "P-20"`, Agent 4
automatically escalates the issue to MUST FIX rank 1.

## Scoring

| Dimension | Weight | Score Key |
|---|---|---|
| Client Fit | 1/6 | scores.client_fit |
| Differentiation | 1/6 | scores.differentiation |
| Risk Transparency | 1/6 | scores.risk_transparency |
| Credibility | 1/6 | scores.credibility |
| Narrative | 1/6 | scores.narrative |
| Industry Factors | 1/6 | scores.industry_factors |
| **Overall** | — | scores.overall |

### Formula
```
overall = (client_fit + differentiation + risk_transparency + credibility + narrative + industry_factors) / 6
```

### Hard Rules
- 3+ CRITICAL issues anywhere → overall score cannot exceed 5.5
- sounds_generic = true → differentiation score cannot exceed 4.0
- No CRITICAL issues, only MINOR → can score 8.0+

## GSK Proposal Items Covered

| Item | Description | Skill |
|------|-------------|-------|
| P-01 | Functional requirements understanding | 3.1 |
| P-02 | Non-functional requirements | 3.1 |
| P-08 | Work responsibility distribution (team) | 3.4 |
| P-09 | Logical/functional solution architecture | 3.2 |
| P-10 | Technical solution architecture | 3.2 |
| P-12 | Technology stack with role justification | 3.2 |
| P-13 | Benefits framed as client outcomes | 3.1 |
| P-14 | Dependencies on customer/third parties | 3.3 |
| P-16 | Assumptions + impact if wrong | 3.3 |
| P-18 | Case studies of similar work | 3.4 |
| P-20 | Risk register with mitigation | 3.3 |
| P-21 | What vendor needs from client before start | 3.3 |

**No E-series (Estimation) or Pricing items — Agent 3 covers Proposal sheet only.**

Items shared with Agent 1 (P-08, P-09, P-10, P-12, P-13, P-14, P-20, P-21) are intentional:
Agent 1 checks *presence*, Agent 3 checks *quality and competitive strength*.
Double-flagging by both agents → Agent 4 promotes to MUST FIX automatically.

## Resource Files

| File | Purpose |
|---|---|
| resources/client_priority_checks.py | Per-priority checks keyed by CLIENT_PRIORITY + prompt builder |
| resources/industry_win_factors.py | Win factors per industry (competitive bar, not presence bar) + prompt builder |
| resources/overclaiming_patterns.py | Overclaiming and generic differentiator phrase lists + prompt builder |

## Entry Point
```python
from agents.agent3 import run

result = run(
    pdf_bytes=pdf_bytes,
    client_industry=["Fintech / Banking"],
    proposal_type="Fixed Price",
    client_priorities=["Cost Certainty", "Regulatory Compliance"],
)
```
