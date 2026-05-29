# Agent 2 — Estimation & Commercial Integrity Reviewer

## Identity
Senior commercial director and delivery architect, 20+ years experience. Reads pricing sections
and estimation tables sceptically — the way a client's procurement director would.
Flags missing phases, lump-sum estimates, arithmetic gaps, and wrong commercial models.

## Input
- `pdf_bytes`: Raw PDF bytes (sent to Bedrock as a native document block)
- `client_industry`: list[str] — selected industries from the upload context
- `proposal_type`: str — e.g. "Fixed Price", "T&M", "Government RFP"
- `client_priorities`: list[str] — e.g. ["Cost Certainty", "Speed to Market"]

## One Bedrock Call
All 7 skills are composed into ONE system prompt. The model returns ONE JSON object.
No skill triggers an independent Bedrock call.

## Skills

| # | Skill | File | Activation | Output Key(s) |
|---|---|---|---|---|
| 2.1 | Estimation Rigour | skill_2_1_estimation_rigour.py | Always | estimation_issues |
| 2.2 | Phase Coverage Check | skill_2_2_phase_coverage.py | Always | missing_phases |
| 2.3 | Reuse & IP Asset Check | skill_2_3_reuse_ip_check.py | Always (conditional internally) | estimation_issues |
| 2.4 | Pricing Completeness | skill_2_4_pricing_completeness.py | Always | pricing_issues |
| 2.5 | Commercial Model Fit | skill_2_5_commercial_model_fit.py | Always, calibrated by proposal_type | pricing_issues, commercial_model_assessment |
| 2.6 | Arithmetic Validation | skill_2_6_arithmetic_validation.py | Always | arithmetic_flags |
| 2.7 | Internal Hygiene Flags | skill_2_7_internal_hygiene.py | Always | internal_flags (INTERNAL ONLY) |

## Scoring

| Dimension | Weight | Score Key |
|---|---|---|
| Estimation Rigour | 30% | scores.estimation_rigour |
| Phase Coverage | 30% | scores.phase_coverage |
| Pricing Completeness | 20% | scores.pricing_completeness |
| Commercial Model Fit | 10% | scores.commercial_model_fit |
| Arithmetic Accuracy | 10% | scores.arithmetic_accuracy |
| **Overall** | — | scores.overall |

### Formula
```
overall = (estimation_rigour × 0.30) + (phase_coverage × 0.30) +
          (pricing_completeness × 0.20) + (commercial_model_fit × 0.10) +
          (arithmetic_accuracy × 0.10)
```

### Hard Rules
- 3+ CRITICAL issues anywhere → overall score cannot exceed 5.5
- No CRITICAL issues, only MINOR → can score 8.0+

## GSK Checklist Items Covered

### Estimation Items (E-series)
| Item | Description | Skill |
|------|-------------|-------|
| E1 | Work breakdown (not lump sum) | 2.1 |
| E2 | Clarity level per requirement | 2.1 |
| E3 | Complexity level per requirement | 2.1 |
| E4 | Contingency linked to clarity + complexity | 2.1 |
| E5 | Pre-existing frameworks/accelerators listed | 2.3 |
| E6 | Requirements detailing phase | 2.2 |
| E7 | Technical design phase | 2.2 |
| E8 | Coding & unit testing phase | 2.2 |
| E9 | Component integration & testing phase | 2.2 |
| E10 | Automation of dev/test activities phase | 2.2 |
| E11 | Historical reference baselines | 2.1 |
| E12 | Estimation assumptions match proposal body | 2.1 |
| E13 | Documentation phase | 2.2 |
| E14 | Module integration phase | 2.2 |
| E15 | External system integration phase | 2.2 |
| E16 | CI/CD & release management phase | 2.2 |
| E17 | System testing phase | 2.2 |
| E18 | UAT & go-live support phase | 2.2 |
| E19 | Project management phase | 2.2 |
| E20 | Team roles & headcount | 2.2 |
| E21 | External consultancy | 2.2 |
| E22 | Duration & basis | 2.2 |
| E23 | Resource loading (dev) | 2.2 |
| E24 | Resource loading (S&M) | 2.2 |

### Pricing Items (P-series — Agent 2 subset)
| Item | Description | Skill | Internal? |
|------|-------------|-------|-----------|
| P1 | Commercial model stated and appropriate | 2.5 | No |
| P2 | Payment schedule linked to deliverables | 2.5 | No |
| P3a | Solution development & delivery cost | 2.4 | No |
| P3b | Warranty separately itemised | 2.4 | No |
| P3c | IP/licensed component cost | 2.3 + 2.4 | No |
| P3d | Margin targets calculated | 2.7 | **Yes** |
| P4a | Reseller/third-party discounts acknowledged | 2.4 | No |
| P4b | S&M margin targets set | 2.7 | **Yes** |
| P5 | External consultancy costed | 2.4 | No |
| P6 | Contingency as named pricing line item | 2.4 | No |
| P7 | Infrastructure cost — dev environment | 2.4 | No |
| P8 | Infrastructure cost — test environment | 2.4 | No |
| P9 | Infrastructure cost — QA/pre-prod environment | 2.4 | No |
| P10 | Infrastructure cost — production environment | 2.4 | No |
| P11 | Rate card for all roles | 2.5 | No |

## Resource Files

| File | Purpose |
|---|---|
| resources/estimation_checklist.py | E1–E4, E11, E12 as structured Python constants + prompt builder |
| resources/phase_list.py | 17 delivery phases E6–E24 as structured constants + prompt builder |
| resources/pricing_checklist.py | P-series items with internal flag + prompt builders |
| resources/commercial_model_rules.py | Risk rules per commercial model type + dynamic prompt builder |

## Commercial Model Dynamic Calibration (Skill 2.5)
Skill 2.5 is calibrated by `proposal_type` — analogous to how Agent 1's Skill 1.4 is
calibrated by `client_industry`. The `commercial_model_rules.py` resource contains risk rules
for each model type and `build_commercial_model_prompt_block(proposal_type)` injects the
relevant rules into the prompt.

## Internal Hygiene Separation Rule
P3d and P4b findings go EXCLUSIVELY into `internal_flags`. They must NEVER appear in
`estimation_issues` or `pricing_issues`. The report generator (Phase 4) strips `internal_flags`
from the client-facing PDF and places them in a separate watermarked internal section.

## Entry Point
```python
from agents.agent2 import run

result = run(
    pdf_bytes=pdf_bytes,
    client_industry=["Fintech / Banking"],
    proposal_type="Fixed Price",
    client_priorities=["Cost Certainty", "Speed to Market"],
)
```
