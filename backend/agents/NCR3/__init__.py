"""
NCR3 — Competitive Position Specialist (Custom Pipeline)
Part of the Custom Checklist Review Pipeline Stage 2 specialist layer.

NOTE: This is NCR3 (Competitive Position specialist), NOT NC3 (Proposal Evaluator).
      NC3 lives at agents/NC3/ and evaluates custom checklist categories.
      NCR3 lives here at agents/NCR3/ and applies Agent 3's competitive expertise.

Mirrors Agent 3's 6-skill domain expertise for proposals evaluated
via the custom checklist pipeline (NC1 → NC2 → NC3+NCR1/2/3 → NC4).

Exports:
    NCR3Agent   — runs Agent 3-level Competitive Position review
                  using extracted proposal text + NC1 auto-detected context.
"""

from __future__ import annotations

from .agent import NCR3Agent

__all__ = ["NCR3Agent"]
