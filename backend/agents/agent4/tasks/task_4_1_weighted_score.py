"""
Task 4.1 — Weighted Final Score (pure Python, no LLM).

Extracts the three agent overall scores, applies context-driven weights,
computes the weighted final score, and maps it to a verdict.
"""

from agents.agent4.resources.weight_config import resolve_weights, compute_verdict


def run(
    agent1_output: dict,
    agent2_output: dict,
    agent3_output: dict,
    proposal_type: str,
    client_priorities: list,
) -> dict:
    """
    Computes the weighted final score from the three agent overalls.

    Returns:
        {
          "agent1_score": float,
          "agent2_score": float,
          "agent3_score": float,
          "weights": {"agent1": float, "agent2": float, "agent3": float},
          "weight_adjusted": bool,
          "weight_reason": str,
          "weight_label": str,
          "overall_score": float,
          "verdict": str,
          "section_scorecard": dict     -- all 11 sub-dimension scores for radar chart
        }
    """
    # ── Extract individual agent overall scores ───────────────────────────────
    a1_score = _safe_score(agent1_output, "scores", "overall")
    a2_score = _safe_score(agent2_output, "scores", "overall")
    a3_score = _safe_score(agent3_output, "scores", "overall")

    # ── Resolve weights based on context ─────────────────────────────────────
    weight_result = resolve_weights(proposal_type, client_priorities)
    weights = weight_result["weights"]

    # ── Compute weighted overall ──────────────────────────────────────────────
    overall = round(
        a1_score * weights["agent1"]
        + a2_score * weights["agent2"]
        + a3_score * weights["agent3"],
        1,
    )

    # ── Build section scorecard (all sub-dimension scores) ───────────────────
    a1_scores = agent1_output.get("scores", {})
    a2_scores = agent2_output.get("scores", {})
    a3_scores = agent3_output.get("scores", {})

    section_scorecard = {
        # Agent 1 sub-dimensions
        "section_completeness":  _f(a1_scores.get("section_completeness")),
        "writing_quality":       _f(a1_scores.get("writing_quality")),
        "scope_clarity":         _f(a1_scores.get("scope_clarity")),
        "client_coverage":       _f(a1_scores.get("client_coverage") or a1_scores.get("client_specificity")),
        # Agent 2 sub-dimensions
        "estimation_rigour":     _f(a2_scores.get("estimation_rigour")),
        "phase_coverage":        _f(a2_scores.get("phase_coverage")),
        "pricing_completeness":  _f(a2_scores.get("pricing_completeness")),
        "commercial_model_fit":  _f(a2_scores.get("commercial_model_fit")),
        "arithmetic_accuracy":   _f(a2_scores.get("arithmetic_accuracy")),
        # Agent 3 sub-dimensions
        "client_fit":            _f(a3_scores.get("client_fit")),
        "differentiation":       _f(a3_scores.get("differentiation")),
        "risk_transparency":     _f(a3_scores.get("risk_transparency")),
        "credibility":           _f(a3_scores.get("credibility")),
        "narrative":             _f(a3_scores.get("narrative")),
        "industry_factors":      _f(a3_scores.get("industry_factors")),
    }

    return {
        "agent1_score": a1_score,
        "agent2_score": a2_score,
        "agent3_score": a3_score,
        "weights": weights,
        "weight_adjusted": weight_result["adjusted"],
        "weight_reason": weight_result["reason"],
        "weight_label": weight_result["label"],
        "overall_score": overall,
        "verdict": compute_verdict(overall),
        "section_scorecard": section_scorecard,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_score(output: dict, *keys) -> float:
    """Safely traverses nested dict to retrieve a float score. Returns 0.0 if missing."""
    current = output
    for key in keys:
        if not isinstance(current, dict):
            return 0.0
        current = current.get(key)
        if current is None:
            return 0.0
    try:
        return float(current)
    except (TypeError, ValueError):
        return 0.0


def _f(val) -> float:
    """Safe float conversion with 1-decimal rounding."""
    try:
        return round(float(val), 1)
    except (TypeError, ValueError):
        return 0.0
