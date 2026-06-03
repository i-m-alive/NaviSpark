---
name: NC4 — Synthesis & Report
pipeline: Custom Checklist Review (NC1 → NC2 → NC3 → NC4)
stage: 3 (sequential — runs after all NC3 instances complete)
version: 1.0
---

# NC4 — Synthesis & Report Agent

## Role

NC4 is the final stage of the Custom Checklist Review Pipeline. It runs once,
sequentially, after all NC3 fan-out instances complete. It aggregates
per-category findings into a single final report with a three-tier verdict.

NC4 is purely deterministic — no LLM calls. All logic is arithmetic, rules,
keyword matching, and string templating.

NC4's output is consumed directly by three frontend components:
- **CustomVerdictPanel** — renders verdict, score, must-fix list
- **CategoryScoreCard** — renders per-category scores and findings
- **ChecklistCoverageTable** — renders the full itemised checklist pass/fail table

## Skills

| Skill | ID | Description |
|---|---|---|
| Weighted Score Aggregator | NC4.1 | Normalises + weights all category scores; applies penalty cap; computes overall score |
| Cross-Checklist Consistency Check | NC4.2 | Detects numerical, metadata, and scope contradictions across categories |
| Priority Action Generator | NC4.3 | Builds must_fix / should_fix / next_time action lists sorted by combined weight |
| Strengths Identifier | NC4.4 | Identifies top 3 performing categories with highlight sentences |
| Executive Summary Generator | NC4.5 | Produces 4–5 sentence plain-English briefing (deterministic templating) |
| Verdict Engine | NC4.6 | Applies 5-rule verdict logic → READY / NEEDS REVISION / DO NOT SEND |

## Verdict Rules (applied in order — first match wins)

| Rule | Condition | Verdict |
|---|---|---|
| 1 | overall_score < 5.0 | DO NOT SEND |
| 2 | must_fix_count >= 4 | DO NOT SEND |
| 3 | Any critical category (weight ≥ 0.30) scores < 2.0/10 | DO NOT SEND |
| 4 | overall_score >= 8.0 AND must_fix_count == 0 | READY TO SEND |
| 5 | All other cases | NEEDS MAJOR REVISION |

## Scoring Normalisation

NC4 normalises all category scores to a 0–10 scale:
`normalised = (raw_score / raw_max_score) * 10.0`

**Penalty cap:** if > 60% of items FAIL and any failed item has
`combined_weight ≥ 0.25`, the category's normalised score is reduced by 15%
(× 0.85).

## Skill Execution Order

```
NC4.1 (score aggregation)
  → NC4.2 (consistency check)
  → NC4.3 (priority actions)
  → NC4.4 (strengths)
  → NC4.6 (verdict)       ← must run before NC4.5
  → coverage computation
  → NC4.5 (executive summary — needs verdict string)
```

## Output Schema

```json
{
  "overall_score":   6.4,
  "max_score":       10.0,
  "verdict":         "NEEDS MAJOR REVISION",
  "verdict_code":    "REVISION",
  "category_scores": {
    "Technical Approach": 7.6,
    "Commercial":         8.4,
    "Team":               5.2,
    "Risk":               3.8
  },
  "priority_actions": {
    "must_fix":      [{"action_id": "MF-001", "item_id": "R-01"}],
    "should_fix":    [{"action_id": "SF-001"}],
    "next_time":     [{"action_id": "NT-001"}],
    "total_actions": 8
  },
  "top_3_strengths": [
    {"rank": 1, "category_name": "Commercial", "score": 8.4, "highlight": "..."}
  ],
  "plain_english_summary": "This proposal for Acme Corp scored 6.4 out of 10...",
  "checklist_coverage": {
    "total_items": 34, "passed": 22, "partial": 4,
    "failed": 8, "error_items": 0, "pass_rate": 0.647
  },
  "consistency_warnings": [],
  "error_categories":     [],
  "scoring_breakdown":    [],
  "verdict_meta": {
    "triggering_rule": "default_revision",
    "must_fix_count":  2,
    "score_band":      "5.0-7.9",
    "critical_category_failures": []
  },
  "nc1_confidence":     0.87,
  "nc2_checklist_id":   "checklist-criteria.xlsx",
  "nc2_scoring_type":   "weighted_1_to_5",
  "nc2_weights_source": "equal"
}
```

## Error Handling

| Scenario | Behaviour |
|---|---|
| NC3 instance failed (status="error") | Excluded from scoring; listed in error_categories |
| All NC3 instances failed | overall_score = 0.0; verdict = DO NOT SEND (rule 1) |
| nc3_results empty | ValueError raised immediately |
| Zero total_items in NC2 | pass_rate = 0.0; coverage shows all zeros |
| No must-fix items | s4 in executive summary falls back to should_fix or "no gaps" |
| No top strengths | top_3_strengths = []; summary sentence adjusted |

## Position in Pipeline

```
[NC1] + [NC2] → [NC3 × N categories] → [NC4]
                                              │
                             ┌────────────────┘
                             ▼
                   NC4.1 score aggregation
                   NC4.2 consistency check
                   NC4.3 priority actions
                   NC4.4 strengths
                   NC4.6 verdict
                   NC4.5 executive summary
                             │
                             ▼
                   Final report → Frontend
```

## Dependencies

- Python standard library only: `re`, `logging`, `typing`
- No LLM calls
- No external libraries
