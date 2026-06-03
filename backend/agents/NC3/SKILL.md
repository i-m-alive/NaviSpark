---
name: NC3 — Proposal Evaluator (Dynamic Fan-Out)
pipeline: Custom Checklist Review (NC1 → NC2 → NC3 → NC4)
stage: 2 (fan-out, parallel per category)
version: 1.0
---

# NC3 — Proposal Evaluator Agent

## Role

NC3 is the core evaluation engine of the Custom Checklist Review Pipeline.
It is the only agent in this pipeline that calls the Anthropic LLM API.

NC3 fans out dynamically — one instance per checklist category from NC2.
All instances run in parallel via ThreadPoolExecutor.

NC3 has no hardcoded evaluation criteria. Its evaluation logic is entirely
derived from NC2.5's dynamically-written evaluation prompts at runtime.
NC3 is a parameterised evaluator — it executes whatever checklist NC2 produced.

## Architecture

```
NC2 output (N categories)
│
├─── NC3 instance 0 (Category A) ──┐
├─── NC3 instance 1 (Category B) ──┤
├─── NC3 instance 2 (Category C) ──┼──► NC4 (aggregates all results)
└─── NC3 instance N (Category N) ──┘
         (all run in parallel)
```

## Skills

| Skill | ID | Description |
|---|---|---|
| Item Evaluator | NC3.1 | Calls LLM API; parses JSON response into raw findings |
| Evidence Linker | NC3.2 | Classifies and verifies evidence references |
| Partial Credit Scorer | NC3.3 | Validates scores; enforces PASS/PARTIAL/FAIL consistency rules |
| Gap Narrative Writer | NC3.4 | Structures gaps with severity, action tier, fix suggestions |

## Key Module: prompt_builder.py

A dedicated module (not a skill) that assembles the LLM prompts:
- `build_system_prompt()` — NC3's role and scoring rules (never overridable)
- `build_user_prompt()` — injects NC2.5 evaluation prompt + proposal text
- `chunk_proposal()` — selects relevant proposal sections if text > 80,000 chars
- `parse_llm_response()` — robust JSON parser with markdown-fence stripping

## LLM Configuration

| Parameter | Value |
|---|---|
| Model | claude-sonnet-4-20250514 |
| Max tokens | 4096 |
| System prompt | Built by `build_system_prompt()` — role + scoring rules |
| User prompt | NC2.5 evaluation prompt + proposal chunk |

## Output Schema (per category instance)

```json
{
  "category_id":     "cat_technical_approach",
  "category_name":   "Technical Approach",
  "status":          "complete",
  "score":           38.0,
  "max_score":       50.0,
  "items_evaluated": 10,
  "items_passed":    7,
  "items_partial":   1,
  "items_failed":    2,
  "findings": [
    {
      "item_id":   "T-01",
      "status":    "PASS",
      "score":     5.0,
      "evidence":  "Section 3: '3-tier architecture with Kubernetes'",
      "gap":       null,
      "evidence_meta": {
        "type":     "section_reference",
        "verified": true,
        "raw":      "Section 3: '3-tier architecture with Kubernetes'"
      },
      "score_meta": {
        "max_score":    5.0,
        "half_score":   2.5,
        "score_pct":    100.0,
        "corrections":  [],
        "scoring_type": "scored_1_to_5"
      },
      "gap_structured": null
    }
  ],
  "error_message": null
}
```

## Fan-Out Behaviour

| Property | Value |
|---|---|
| Fan-out count | `len(NC2.categories)` — determined at runtime |
| Parallelism | `ThreadPoolExecutor` — same pattern as existing pipeline |
| Worker cap | `min(len(categories), 8)` — avoids API rate limits |
| Result order | Preserved — same order as NC2 categories input |
| Failure isolation | Each instance catches own exceptions; returns error result |
| Context window | Proposals > 80,000 chars are chunked by `chunk_proposal()` |

## Error Handling

| Scenario | Behaviour |
|---|---|
| LLM API call fails | NC3.1 re-raises; NC3Agent.run() catches and returns error result |
| LLM returns invalid JSON | `parse_llm_response()` returns fallback FAIL findings for all items |
| LLM returns PASS with no evidence | NC3.2 downgrades to PARTIAL, adds gap note |
| Score inconsistent with status | NC3.3 corrects score, logs correction note in score_meta |
| Entire NC3 instance fails | Error result returned; NC4 marks category as "evaluation error" |
| Proposal exceeds context window | `chunk_proposal()` selects relevant sections; notes in proposal chunk |

## Security

NC3 enforces the pipeline's prompt injection sandbox:
- NC2.5 evaluation prompts are placed in the **user prompt** only.
- NC3's system prompt (built by `build_system_prompt()`) establishes the evaluator
  role and cannot be overridden by checklist content.
- A malformed or adversarial checklist cannot alter NC3's evaluation behaviour.

## Dependencies

- `anthropic` — Anthropic Python SDK (LLM API calls)
- `concurrent.futures.ThreadPoolExecutor` — parallel fan-out (stdlib)
- `json`, `re`, `logging` — stdlib only
