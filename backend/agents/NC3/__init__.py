"""
NC3 — Proposal Evaluator Agent (Dynamic Fan-Out)
Part of the Custom Checklist Review Pipeline (NC1 → NC2 → NC3 → NC4).

Runs in Stage 2 — after NC1 and NC2 complete.
One NC3 instance is spawned per checklist category from NC2.
All instances run in parallel via ThreadPoolExecutor.

NC3 is the only LLM-calling agent in the pipeline.
Its evaluation logic is entirely derived from NC2 output at runtime.

Exports:
    NC3Agent         — single-category evaluator (one instance per category)
    run_nc3_fanout   — orchestrates all NC3 instances in parallel
"""

from __future__ import annotations

from .agent import NC3Agent, run_nc3_fanout

__all__ = ["NC3Agent", "run_nc3_fanout"]
