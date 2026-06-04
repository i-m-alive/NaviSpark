"""
NCR2 — Commercial Strength Specialist (Custom Pipeline)
Part of the Custom Checklist Review Pipeline Stage 2 specialist layer.

Mirrors Agent 2's 7-skill domain expertise for proposals evaluated
via the custom checklist pipeline (NC1 → NC2 → NC3+NCR1/2/3 → NC4).

Exports:
    NCR2Agent   — runs Agent 2-level Commercial Strength review
                  using extracted proposal text + NC1 auto-detected context.
"""

from __future__ import annotations

from .agent import NCR2Agent

__all__ = ["NCR2Agent"]
