"""
NCR1 — Clarity & Completeness Specialist (Custom Pipeline)
Part of the Custom Checklist Review Pipeline Stage 2 specialist layer.

Mirrors Agent 1's 6-skill domain expertise for proposals evaluated
via the custom checklist pipeline (NC1 → NC2 → NC3+NCR1/2/3 → NC4).

Exports:
    NCR1Agent   — runs Agent 1-level Clarity & Completeness review
                  using extracted proposal text + NC1 auto-detected context.
"""

from __future__ import annotations

from .agent import NCR1Agent

__all__ = ["NCR1Agent"]
