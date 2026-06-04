"""
NC4 — Synthesis & Report Agent
Part of the Custom Checklist Review Pipeline (NC1 → NC2 → NC3 → NC4).

Runs last, sequentially, after all NC3 instances complete (Stage 3).
Aggregates per-category findings into a final scored report with verdict.

No LLM calls — all logic is deterministic arithmetic, rules, and templating.

Exports the main NC4Agent class.
"""

from __future__ import annotations

from .agent import NC4Agent

__all__ = ["NC4Agent"]
