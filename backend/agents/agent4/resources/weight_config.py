"""
Weight configuration for Agent 4 Task 4.1 (Weighted Final Score).
Weights are applied to the three specialist agent overall scores.
All weight sets sum to exactly 1.0.
"""

# Standard weights: estimation slightly heavier because numbers are the most
# common post-contract dispute root cause.
DEFAULT_WEIGHTS = {
    "agent1": 0.30,   # Completeness & Clarity
    "agent2": 0.40,   # Estimation & Commercial
    "agent3": 0.30,   # Competitive Strength
}

# Government RFP: format compliance and cost transparency are eliminatory.
# Competitive narrative matters less — evaluation panels follow a scoring rubric.
GOVERNMENT_RFP_WEIGHTS = {
    "agent1": 0.40,
    "agent2": 0.35,
    "agent3": 0.25,
}

# Cost Certainty as the #1 client priority: the client will scrutinise every
# number. Estimation integrity becomes the dominant criterion.
COST_CERTAINTY_WEIGHTS = {
    "agent1": 0.25,
    "agent2": 0.50,
    "agent3": 0.25,
}

# Risk Minimisation / Regulatory Compliance dominant: completeness of risk
# disclosure and contractual rigour matter most.
RISK_FOCUS_WEIGHTS = {
    "agent1": 0.35,
    "agent2": 0.40,
    "agent3": 0.25,
}

# Innovation / Speed to Market priorities: differentiation and competitive
# narrative are elevated because the client is choosing a partner, not a commodity.
INNOVATION_WEIGHTS = {
    "agent1": 0.25,
    "agent2": 0.35,
    "agent3": 0.40,
}

# ── Verdict thresholds ────────────────────────────────────────────────────────

VERDICT_THRESHOLDS = {
    "READY TO SEND": 8.0,         # score >= 8.0
    "REVISE BEFORE SENDING": 5.0, # score >= 5.0 and < 8.0
    "DO NOT SEND": 0.0,           # score < 5.0
}


def resolve_weights(proposal_type: str, client_priorities: list) -> dict:
    """
    Returns the weight dict plus adjustment metadata based on context.
    Priority order:
      1. proposal_type containing 'government' or 'rfp'
      2. client_priorities containing 'cost certainty'
      3. client_priorities containing 'risk' or 'regulatory' or 'compliance'
      4. client_priorities containing 'innovation' or 'speed to market'
      5. Default

    Returns:
        {
          "weights": {"agent1": float, "agent2": float, "agent3": float},
          "adjusted": bool,
          "reason": str,
          "label": str   — short label for UI display
        }
    """
    pt = (proposal_type or "").lower()
    prio = " ".join(p.lower() for p in (client_priorities or []))

    if "government" in pt or "rfp" in pt:
        return {
            "weights": GOVERNMENT_RFP_WEIGHTS.copy(),
            "adjusted": True,
            "reason": (
                "Government / RFP proposal type detected. Completeness is weighted at 40% "
                "because RFP scoring panels often disqualify on format compliance before reading "
                "content. Estimation integrity weighted at 35%; competitive narrative at 25%."
            ),
            "label": "Government RFP",
        }

    if "cost certainty" in prio:
        return {
            "weights": COST_CERTAINTY_WEIGHTS.copy(),
            "adjusted": True,
            "reason": (
                "Cost Certainty is a stated client priority. Estimation & Commercial integrity "
                "weighted at 50% — the client will challenge every number before signing. "
                "Completeness and competitive strength share the remaining 50% equally."
            ),
            "label": "Cost Certainty focus",
        }

    if any(kw in prio for kw in ("risk minimisation", "regulatory compliance", "risk mitigation")):
        return {
            "weights": RISK_FOCUS_WEIGHTS.copy(),
            "adjusted": True,
            "reason": (
                "Risk Minimisation or Regulatory Compliance is a stated client priority. "
                "Completeness weighted at 35% to reflect the importance of a thorough risk register "
                "and dependency disclosure. Estimation at 40%; competitive strength at 25%."
            ),
            "label": "Risk / Compliance focus",
        }

    if any(kw in prio for kw in ("innovation", "speed to market")):
        return {
            "weights": INNOVATION_WEIGHTS.copy(),
            "adjusted": True,
            "reason": (
                "Innovation or Speed to Market is a stated client priority. Competitive Strength "
                "weighted at 40% — the client is selecting a partner for their differentiated "
                "approach, not just a compliant bid. Estimation at 35%; completeness at 25%."
            ),
            "label": "Innovation / Speed focus",
        }

    return {
        "weights": DEFAULT_WEIGHTS.copy(),
        "adjusted": False,
        "reason": (
            "Standard weighting applied: Completeness & Clarity 30%, "
            "Estimation & Commercial Integrity 40%, Competitive Strength 30%."
        ),
        "label": "Standard",
    }


def compute_verdict(overall_score: float) -> str:
    """Maps a final score to a verdict string."""
    if overall_score >= VERDICT_THRESHOLDS["READY TO SEND"]:
        return "READY TO SEND"
    if overall_score >= VERDICT_THRESHOLDS["REVISE BEFORE SENDING"]:
        return "REVISE BEFORE SENDING"
    return "DO NOT SEND"
