---
name: NC2 — Checklist Intelligence
pipeline: Custom Checklist Review (NC1 → NC2 → NC3 → NC4)
stage: 1 (parallel with NC1)
version: 1.0
---

# NC2 — Checklist Intelligence Agent

## Role

NC2 is the Checklist Intelligence agent of the Custom Checklist Review Pipeline.
It runs in parallel with NC1 and is described in the architecture as
"the most novel agent in the pipeline."

NC2 converts any user-uploaded checklist file — in any supported format —
into structured evaluation criteria and dynamically writes the evaluation
prompts that each NC3 instance will receive as its task definition.

## Key Design Principle

NC2.5 writes NC3's instructions at runtime. NC3 is a parameterised evaluator —
it has no hardcoded evaluation logic. The pipeline adapts to ANY checklist
the user provides without code changes.

## Skills

| Skill | ID | Description |
|---|---|---|
| Format Detector & Parser | NC2.1 | Detects file format (xlsx/csv/docx/pdf) and extracts raw rows |
| Criteria Extractor | NC2.2 | Converts raw rows into structured checklist items with all fields |
| Category Grouper | NC2.3 | Groups items into logical categories that become NC3 instances |
| Weight & Scoring Schema Extractor | NC2.4 | Extracts or assigns weights; determines binary vs scored schema |
| Evaluation Framework Builder | NC2.5 | Writes the complete NC3 evaluation prompt for each category |

## Supported Input Formats

| Format | Library | Notes |
|---|---|---|
| Excel (.xlsx, .xlsm) | openpyxl | Multi-sheet; weight columns auto-detected |
| CSV (.csv) | csv (stdlib) | Auto-detects comma / tab / semicolon delimiter |
| DOCX (.docx) | python-docx | Tables and bulleted lists both parsed as criteria |
| PDF (.pdf) | pypdf + pdfplumber | Text extraction + table extraction if pdfplumber available |

## Output Schema

```json
{
  "checklist_id":  "checklist-my_criteria.xlsx",
  "format":        "xlsx",
  "total_items":   34,
  "scoring_type":  "weighted_1_to_5",
  "weights_source": "equal",
  "categories": [
    {
      "id":          "cat_technical_approach",
      "name":        "Technical Approach",
      "item_count":  12,
      "weight":      0.35,
      "source":      "explicit",
      "items": [
        {
          "id":                "T-01",
          "text":              "Solution architecture diagram included?",
          "description":       null,
          "required_evidence": "Slide or section showing architecture",
          "pass_condition":    null,
          "weight":            1.0,
          "scoring":           "binary",
          "raw_source":        "Sheet1:Row4"
        }
      ],
      "evaluation_prompt": "You are evaluating a proposal..."
    }
  ],
  "parse_warnings": []
}
```

## Security Note

NC2.5 evaluation prompts are injected into the **user prompt** of each NC3
instance, NOT the system prompt. This sandboxes prompt injection risk — a
crafted or malicious checklist cannot override NC3's system-level behaviour.

## Error Handling

| Scenario | Behaviour |
|---|---|
| Zero rows parsed by NC2.1 | RuntimeError raised, pipeline halted with clear message |
| Zero items after NC2.2 | RuntimeError raised, pipeline halted with clear message |
| No categories detected by NC2.3 | Falls back to single "General" category |
| No weights in checklist | NC2.4 assigns equal weights; weights_source = "equal" |
| pdfplumber not installed | NC2.1 falls back to pypdf text extraction only |
| Unsupported file format | ValueError raised at NC2.1 with list of supported formats |

## Position in Pipeline

```
[NC1] ─────────────────────────────────────────────────┐
  (Document Intelligence — parallel)                    │
                                                         ▼
[NC2] ─────────────────────────────────────────────► [NC3 fan-out] ──► [NC4]
  (Checklist Intelligence — parallel)
       │
       └─ NC2 category count = NC3 fan-out count
          (e.g. 4 categories → 4 NC3 instances run in parallel)
```

## Dependencies

- `openpyxl` — Excel parsing (already in project requirements)
- `python-docx` — DOCX parsing (already in project requirements)
- `pypdf` — PDF text extraction (already in project requirements)
- `pdfplumber` — PDF table extraction (optional; gracefully skipped if absent)
- `csv`, `re`, `os`, `mimetypes`, `logging` — stdlib only
