---
name: NC1 — Document Intelligence
pipeline: Custom Checklist Review (NC1 → NC2 → NC3 → NC4)
stage: 1 (parallel with NC2)
version: 1.0
---

# NC1 — Document Intelligence Agent

## Role

NC1 is the Document Intelligence agent of the Custom Checklist Review Pipeline.
It runs in parallel with NC2 and is always the first stage to complete.
Its output feeds directly into the ContextConfirmPanel (frontend) and into
every NC3 instance as contextual background.

## What NC1 Does

NC1 eliminates manual context entry. Instead of asking users to fill in
industry, proposal type, and client priorities, NC1 reads the proposal and
infers them automatically.

## Skills

| Skill | ID | Description |
|---|---|---|
| Proposal Structure Mapper | NC1.1 | Extracts TOC, section headings, slide titles. Builds a full structural map. |
| Context Auto-Detector | NC1.2 | Identifies client industry, proposal type, and client priorities via keyword matching. |
| Project Metadata Extractor | NC1.3 | Extracts client name, vendor name, project name, timeline, budget, team size, methodology. |
| Document Quality Pre-scanner | NC1.4 | Surface-level completeness check. Verifies presence of 8 key proposal sections. |
| Confidence Scorer | NC1.5 | Computes a 0.0–1.0 confidence score from signals across all other skills. |

## Output Schema

```json
{
  "auto_detected": {
    "client_industry":       ["Healthcare"],
    "proposal_type":         "Fixed Price",
    "client_priorities":     ["Cost Certainty", "Risk Mitigation"],
    "client_name":           "Acme Corp",
    "vendor_name":           "TechCo Ltd",
    "project_name":          "EHR Modernization",
    "proposed_timeline":     "18 months",
    "budget_range":          "$2.5M-$3M",
    "team_size":             12,
    "delivery_methodology":  "Agile"
  },
  "structure_map": {
    "sections":       ["Executive Summary", "Scope", "Timeline", "Pricing"],
    "slide_count":    24,
    "has_toc":        true,
    "structure_type": "pptx"
  },
  "quality_scan": {
    "sections_present":   { "Executive Summary": true, "Pricing / Commercial": false },
    "completeness_score": 0.75,
    "missing_sections":   ["Pricing / Commercial"],
    "quality_flags":      ["MISSING_PRICING: No pricing or commercial section detected"]
  },
  "confidence": 0.87
}
```

## Confidence Thresholds

| Score | Label | UI Behaviour |
|---|---|---|
| ≥ 0.85 | HIGH | Green indicator. User may proceed directly. |
| 0.70–0.84 | GOOD | No warning. Normal confirmation step. |
| 0.50–0.69 | MODERATE | Yellow warning banner: "Review detected values carefully." |
| 0.40–0.49 | LOW | Orange warning banner: "Some fields could not be detected." |
| < 0.40 | VERY LOW | Evaluation blocked. User must enter context manually. |

## Inputs Accepted

| Field | Type | Description |
|---|---|---|
| document_text | str | Raw extracted text of the proposal |
| file_type | str | "pdf" or "pptx" |

## Dependencies

- Python standard library only (`re`, `logging`)
- No external libraries required
- No LLM calls — all detection is rule-based and deterministic

## Position in Pipeline

```
[NC1] ─────────────────────────────────────────────────┐
  (Document Intelligence — parallel)                    │
                                                         ▼
[NC2] ─────────────────────────────────────────────► [NC3 fan-out] ──► [NC4]
  (Checklist Intelligence — parallel)
```
