"""
Task 4.1 — Weighted Final Score (pure Python, no LLM).

Two-stage scoring:
  1. Checklist-based score  — deterministic, derived from the 57-item coverage grid
                              built by task_4_5_checklist_merge. Immune to LLM weight
                              hallucinations and sub-score inconsistencies.
  2. LLM-based score        — the overall score each specialist agent self-reported.

Final agent score = 0.5 × LLM score  +  0.5 × checklist score

This 50/50 blend means a proposal with good checklist coverage but a harsh LLM
assessment, or vice-versa, converges to a balanced middle rather than an extreme.
The blend also prevents the Agent 2 zero-weight bug from zeroing the overall score.

Checklist items mapping per agent:
  Agent 1 → P-sheet items where primary_agent == "A1"
  Agent 2 → E-sheet items + PR-sheet items (all primary_agent == "A2")
  Agent 3 → P-sheet items where primary_agent == "A3"

Within each group, mandatory items are weighted 2× non-mandatory items.
Internal-only items (internal=True) are excluded from the coverage score.
Score formula per item:
  COVERED  → 1.0
  PARTIAL  → 0.5
  MISSING  → 0.0
"""

from agents.agent4.resources.weight_config import resolve_weights, compute_verdict


# ── Checklist coverage scorer ─────────────────────────────────────────────────

def _checklist_score_for_agent(checklist: list, agent_key: str) -> float:
    """
    Computes a 0–10 coverage score from the checklist items that belong
    to the given agent (primary_agent field).

    Agent 2 owns both Estimation and Pricing items; all other agents own
    only Proposal items.

    Mandatory items are weighted 2×; internal items excluded.
    Returns 0.0 if no items found (graceful degradation if checklist is absent).
    """
    if not checklist:
        return 0.0

    # Select the items this agent owns
    if agent_key == "A2":
        items = [
            i for i in checklist
            if i.get("primary_agent") == "A2" and not i.get("internal", False)
        ]
    else:
        items = [
            i for i in checklist
            if i.get("primary_agent") == agent_key and not i.get("internal", False)
        ]

    if not items:
        return 0.0

    STATUS_VALUE = {"COVERED": 1.0, "PARTIAL": 0.5, "MISSING": 0.0}

    weighted_sum   = 0.0
    total_weight   = 0.0
    for item in items:
        w      = 2.0 if item.get("mandatory", False) else 1.0
        value  = STATUS_VALUE.get(item.get("status", "MISSING"), 0.0)
        weighted_sum  += w * value
        total_weight  += w

    if total_weight == 0:
        return 0.0

    return round(10.0 * weighted_sum / total_weight, 1)


def _blend(llm_score: float, checklist_score: float, llm_weight: float = 0.5) -> float:
    """Blends LLM and checklist scores. Returns 1-decimal float."""
    return round(llm_weight * llm_score + (1.0 - llm_weight) * checklist_score, 1)


# ── Main entry point ──────────────────────────────────────────────────────────

def run(
    agent1_output: dict,
    agent2_output: dict,
    agent3_output: dict,
    proposal_type: str,
    client_priorities: list,
    checklist_coverage: list | None = None,
) -> dict:
    """
    Computes the weighted final score from the three agent overalls,
    anchored by checklist coverage.

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
          "section_scorecard": dict,
          "checklist_scores": {        ← new: per-agent checklist coverage 0-10
            "agent1": float,
            "agent2": float,
            "agent3": float,
          }
        }
    """
    checklist = checklist_coverage or []

    # ── Raw LLM scores ────────────────────────────────────────────────────────
    a1_llm = _safe_score(agent1_output, "scores", "overall")
    a2_llm = _safe_score(agent2_output, "scores", "overall")
    a3_llm = _safe_score(agent3_output, "scores", "overall")

    # ── Checklist-based scores ────────────────────────────────────────────────
    a1_cl = _checklist_score_for_agent(checklist, "A1")
    a2_cl = _checklist_score_for_agent(checklist, "A2")
    a3_cl = _checklist_score_for_agent(checklist, "A3")

    # ── Blended scores (50 % LLM + 50 % checklist) ───────────────────────────
    a1_score = _blend(a1_llm, a1_cl)
    a2_score = _blend(a2_llm, a2_cl)
    a3_score = _blend(a3_llm, a3_cl)

    # ── Resolve context-driven inter-agent weights ────────────────────────────
    weight_result = resolve_weights(proposal_type, client_priorities)
    weights = weight_result["weights"]

    # ── Compute weighted overall ──────────────────────────────────────────────
    overall = round(
        a1_score * weights["agent1"]
        + a2_score * weights["agent2"]
        + a3_score * weights["agent3"],
        1,
    )

    # ── Build section scorecard (all sub-dimension scores) ────────────────────
    a1_scores = agent1_output.get("scores") or {}
    a2_scores = agent2_output.get("scores") or {}
    a3_scores = agent3_output.get("scores") or {}

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
        # Transparency: expose raw components so the output explains the score
        "checklist_scores": {
            "agent1": a1_cl,
            "agent2": a2_cl,
            "agent3": a3_cl,
        },
        "llm_scores": {
            "agent1": a1_llm,
            "agent2": a2_llm,
            "agent3": a3_llm,
        },
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
