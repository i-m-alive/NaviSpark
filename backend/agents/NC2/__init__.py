"""
NC2 — Checklist Intelligence Agent
Part of the Custom Checklist Review Pipeline (NC1 → NC2 → NC3 → NC4).
Runs in parallel with NC1 (Stage 1).
Converts any user-uploaded checklist file into structured evaluation criteria
and dynamically writes the evaluation prompts that NC3 instances will use.
Exports the main NC2Agent class.
"""

from .agent import NC2Agent

__all__ = ["NC2Agent"]
