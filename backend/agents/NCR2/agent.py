"""
NCR2 Agent — Commercial Strength Reviewer (Custom Pipeline Specialist)

Evaluates proposals across 3 dimensions:
  - Estimation Rigour      : Are effort estimates backed by methodology and evidence?
  - Phase Coverage         : Are all delivery phases (discovery→support) represented?
  - Pricing Completeness   : Are all cost components documented without gaps?

Runs in Stage 2 of the Custom Checklist Review Pipeline, in parallel with NC3 and NCR1/3.
Makes a single Bedrock LLM call — same pattern as Agent 2.

Input:
    proposal_text : str  — full extracted text of the uploaded proposal
    nc1_context   : dict — NC1's auto_detected dict

Output schema (NCR wrapper):
{
    "status":        "complete" | "error",
    "dimension":     "commercial_strength",
    "score":         float,
    "result":        dict | None,
    "error_message": str | None,
}

NCR2 result schema:
{
    "agent": "ncr2_commercial_strength",
    "estimation_issues": [
        { "issue": str, "location": str, "severity": str, "recommendation": str }
    ],
    "phase_coverage": [
        { "phase": str, "status": "PRESENT|PARTIAL|ABSENT", "note": str }
    ],
    "pricing_issues": [
        { "issue": str, "location": str, "severity": str, "recommendation": str }
    ],
    "arithmetic_checks": [
        { "check": str, "result": "PASS|FLAG|UNVERIFIABLE", "detail": str }
    ],
    "scores": {
        "weights": { "estimation_rigour": float, "phase_coverage": float,
                     "pricing_completeness": float },
        "estimation_rigour":    float,
        "phase_coverage":       float,
        "pricing_completeness": float,
        "overall":              float
    }
}
"""

from __future__ import annotations

import logging
from typing import Any

from bedrock_client import invoke_agent_text_only
from agents.NCR2.skills import (
    estimation_rigour_prompt,
    phase_coverage_prompt,
    pricing_completeness_prompt,
)

logger = logging.getLogger(__name__)

DIMENSION = "commercial_strength"

# ── Identity ──────────────────────────────────────────────────────────────────

_IDENTITY = """You are NCR2: Commercial Strength Reviewer, part of NAVISPARK's Custom Proposal \
Review Pipeline. You are a senior commercial director and delivery architect with 20+ years of \
experience. You read pricing and delivery plans the way a client's procurement director would. \
You flag estimation assumptions, missing delivery phases, unexplained cost lines, and \
model-delivery mismatches with precision.

You review the proposal across 3 skills:
  Skill NCR2.1 — Estimation Rigour Evaluator
  Skill NCR2.2 — Phase Coverage Checker
  Skill NCR2.3 — Pricing Completeness Auditor (includes arithmetic spot-checks)"""

# ── Format instruction ────────────────────────────────────────────────────────

_FORMAT_INSTRUCTION = """
═══════════════════════════════════════════════════
CRITICAL INSTRUCTION — OUTPUT FORMAT
═══════════════════════════════════════════════════

You MUST return ONLY a single valid JSON object. No preamble. No explanation.
No markdown code fences. No text before or after the JSON.
The response must start with { and end with }.
Return ONLY the JSON."""

# ── Scoring criteria ──────────────────────────────────────────────────────────

_SCORING = """
═══════════════════════════════════════════════════
SCORING CRITERIA
═══════════════════════════════════════════════════

Score each dimension out of 10.0 (one decimal place). Use the FULL range 0–10.
A score of 8+ means genuinely strong. Most proposals score 4–7.

ESTIMATION RIGOUR (estimation_rigour):
  10.0 — Clear methodology, full WBS, contingency linked to named risks, client/vendor split clear
   8.0 — Methodology stated, minor gap (e.g., contingency % without risk linkage)
   6.0 — Estimates present but methodology unstated OR contingency generic
   4.0 — Phase-level only, no methodology, flat % contingency
   2.0 — High-level totals only, no breakdown, no methodology
   0.0 — No estimates at all

PHASE COVERAGE (phase_coverage):
  10.0 — All 7 phases present and individually costed
   8.0 — 6 phases present; 1 expected phase ABSENT with justification
   6.0 — 5 phases present; 1 critical phase PARTIAL
   4.0 — 1–2 critical phases ABSENT
   2.0 — Only 2–3 phases mentioned
   0.0 — No phase structure at all

PRICING COMPLETENESS (pricing_completeness):
  10.0 — All cost components documented; model stated; payment schedule with milestones
   8.0 — Minor gap (e.g., travel not mentioned but low-risk)
   6.0 — 1–2 cost components missing; commercial model stated
   4.0 — Multiple cost gaps; payment terms vague
   2.0 — Lump sum only, no breakdown, no model
   0.0 — No commercial section at all

DYNAMIC WEIGHT DETERMINATION:
  Analyze CLIENT CONTEXT (industry, proposal_type, priorities) and assign weights.
  All three weights must sum to exactly 1.0. Output in "scores.weights".

  Baseline defaults:
    estimation_rigour    = 0.35
    phase_coverage       = 0.35
    pricing_completeness = 0.30

  Adjustment guidance:
  - estimation_rigour:    Raise (0.40) for Fixed Price (estimation errors = overruns).
  - phase_coverage:       Raise (0.40) for T&M or Managed Services (phases define billing).
  - pricing_completeness: Raise (0.35) for Fixed Price; lower (0.25) for T&M with rate cards.

  overall = (estimation_rigour × w_er) + (phase_coverage × w_pc) + (pricing_completeness × w_pri)
  Round overall to 1 decimal place.

CRITICAL PENALTY: Graduated penalty applied automatically post-response.
Reflect severity honestly — many CRITICALs → meaningfully lower score.

SCORING PRECISION — permitted values only:
  Primary anchors: 0.0, 2.0, 4.0, 6.0, 8.0, 10.0
  Midpoints:       1.0, 3.0, 5.0, 7.0, 9.0
  Do NOT use arbitrary decimals."""

# ── Output JSON schema ────────────────────────────────────────────────────────

_OUTPUT_SCHEMA = """
═══════════════════════════════════════════════════
EXACT OUTPUT JSON SCHEMA
═══════════════════════════════════════════════════

Return EXACTLY this structure. Every field must be present. Use [] for empty arrays.
phase_coverage MUST have exactly 7 entries — one per phase in order.
arithmetic_checks MUST have exactly 3 entries — one per check in order.

{
  "agent": "ncr2_commercial_strength",
  "estimation_issues": [
    {
      "issue": "Specific description of the estimation gap",
      "location": "Section name or table where this is found or missing",
      "severity": "CRITICAL | MAJOR | MINOR",
      "recommendation": "Specific actionable fix — starts with a verb"
    }
  ],
  "phase_coverage": [
    {
      "phase": "Discovery / Requirements",
      "status": "PRESENT | PARTIAL | ABSENT",
      "note": "Specific note — quote or paraphrase what was found or what is absent."
    }
  ],
  "pricing_issues": [
    {
      "issue": "Specific description of the pricing gap or inconsistency",
      "location": "Section name or table",
      "severity": "CRITICAL | MAJOR | MINOR",
      "recommendation": "Specific actionable fix"
    }
  ],
  "arithmetic_checks": [
    {
      "check": "phase_totals | rate_consistency | model_payment_alignment",
      "result": "PASS | FLAG | UNVERIFIABLE",
      "detail": "What was checked and what was found (or why unverifiable)"
    }
  ],
  "scores": {
    "weights": {
      "estimation_rigour":    0.0,
      "phase_coverage":       0.0,
      "pricing_completeness": 0.0
    },
    "estimation_rigour":    0.0,
    "phase_coverage":       0.0,
    "pricing_completeness": 0.0,
    "overall":              0.0
  }
}

FINAL REMINDER: Return ONLY the JSON object. Nothing before {. Nothing after }."""


# ── Prompt composers ──────────────────────────────────────────────────────────

def _compose_system_prompt(
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
) -> str:
    return "\n".join([
        _IDENTITY,
        _FORMAT_INSTRUCTION,
        estimation_rigour_prompt,
        phase_coverage_prompt,
        pricing_completeness_prompt,
        _SCORING,
        _OUTPUT_SCHEMA,
    ])


def _build_user_message(
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
) -> str:
    industry_str   = ", ".join(client_industry) if client_industry else "Not specified"
    priorities_str = ", ".join(client_priorities) if client_priorities else "Not specified"
    return f"""Please review the proposal as NCR2: Commercial Strength Reviewer.

CLIENT CONTEXT:
- Client Industry:   {industry_str}
- Proposal Type:     {proposal_type or 'Not specified'}
- Client Priorities: {priorities_str}

Apply all 3 skills:
1. Evaluate estimation rigour — methodology, WBS, contingency, client/vendor split (estimation_issues)
2. Check all 7 delivery phases are present and costed (phase_coverage — exactly 7 entries)
3. Audit pricing completeness — cost components, commercial model, payment terms (pricing_issues)
4. Run 3 arithmetic spot-checks (arithmetic_checks — exactly 3 entries)
5. Score all 3 dimensions with dynamic weights from CLIENT CONTEXT (scores)

Return ONLY the JSON object as specified."""


# ── Deterministic score caps ──────────────────────────────────────────────────

_CRITICAL_DEDUCTION = {0: 0.0, 1: 0.3, 2: 0.6, 3: 1.0, 4: 1.4, 5: 1.8}


def _critical_deduction(n: int) -> float:
    return _CRITICAL_DEDUCTION.get(n, 1.8 + (n - 5) * 0.4) if n > 0 else 0.0


def _apply_score_caps(result: dict) -> dict:
    """
    Rule 1 — Phase coverage cap:
      Any CRITICAL delivery phase ABSENT → cap phase_coverage at 4.0.

    Rule 2 — Pricing completeness cap:
      Any arithmetic check FLAG → cap pricing_completeness at 6.0.

    Rule 0 — Placeholder-zero recovery from evidence.

    Rule 3 — Graduated overall penalty per CRITICAL count.
    """
    phase_coverage  = result.get("phase_coverage", [])
    critical_phases_absent = any(
        p.get("status") == "ABSENT"
        for p in phase_coverage
        if p.get("phase") in ("Discovery / Requirements", "Solution Design",
                               "Build / Development", "Testing / QA", "Deployment / Go-Live")
    )

    arith_checks = result.get("arithmetic_checks", [])
    has_flagged_arithmetic = any(c.get("result") == "FLAG" for c in arith_checks)

    scores = result.get("scores") or {}
    scores.setdefault("estimation_rigour",    0.0)
    scores.setdefault("phase_coverage",       0.0)
    scores.setdefault("pricing_completeness", 0.0)

    cap_applied = False

    # Rule 0: placeholder-zero recovery
    all_zero = all(scores.get(k, 0.0) == 0.0
                   for k in ("estimation_rigour", "phase_coverage", "pricing_completeness", "overall"))
    has_evidence = bool(result.get("estimation_issues") or result.get("phase_coverage") or
                        result.get("pricing_issues"))

    if all_zero and has_evidence:
        def _sev_score(issues):
            if not issues: return 8.0
            crits  = sum(1 for i in issues if i.get("severity") == "CRITICAL")
            majors = sum(1 for i in issues if i.get("severity") == "MAJOR")
            if crits >= 2: return 3.0
            if crits >= 1: return 4.0
            if majors >= 3: return 4.0
            if majors >= 1: return 6.0
            return 7.0

        scores["estimation_rigour"]    = _sev_score(result.get("estimation_issues") or [])
        scores["pricing_completeness"] = _sev_score(result.get("pricing_issues") or [])

        phases_present = sum(1 for p in phase_coverage if p.get("status") == "PRESENT")
        phases_total   = len(phase_coverage) or 7
        scores["phase_coverage"] = round(10.0 * phases_present / phases_total, 1)

        scores["_scores_recovered_from_evidence"] = True
        cap_applied = True

    # Rule 1
    if critical_phases_absent and scores.get("phase_coverage", 0.0) > 4.0:
        scores["phase_coverage"] = 4.0
        cap_applied = True

    # Rule 2
    if has_flagged_arithmetic and scores.get("pricing_completeness", 0.0) > 6.0:
        scores["pricing_completeness"] = 6.0
        cap_applied = True

    # Recompute overall
    if cap_applied:
        weights = scores.get("weights", {})
        w_er  = weights.get("estimation_rigour",    0.35)
        w_pc  = weights.get("phase_coverage",       0.35)
        w_pri = weights.get("pricing_completeness", 0.30)
        recomputed = (
            scores.get("estimation_rigour",    0.0) * w_er
            + scores.get("phase_coverage",     0.0) * w_pc
            + scores.get("pricing_completeness",0.0) * w_pri
        )
        total_critical = (
            sum(1 for i in result.get("estimation_issues", []) if i.get("severity") == "CRITICAL")
            + sum(1 for p in phase_coverage if p.get("status") == "ABSENT"
                  and p.get("phase") in ("Discovery / Requirements", "Solution Design",
                                          "Build / Development", "Testing / QA", "Deployment / Go-Live"))
            + sum(1 for i in result.get("pricing_issues", []) if i.get("severity") == "CRITICAL")
        )
        recomputed = max(0.0, recomputed - _critical_deduction(total_critical))
        scores["overall"] = round(recomputed, 1)

    if "overall" not in scores:
        weights = scores.get("weights", {})
        scores["overall"] = round(
            scores.get("estimation_rigour",    0.0) * weights.get("estimation_rigour",    0.35)
            + scores.get("phase_coverage",     0.0) * weights.get("phase_coverage",       0.35)
            + scores.get("pricing_completeness",0.0) * weights.get("pricing_completeness", 0.30),
            1,
        )

    scores["critical_phase_absent"]      = critical_phases_absent
    scores["arithmetic_flag_present"]    = has_flagged_arithmetic
    result["scores"] = scores
    return result


# ── Context extractor ─────────────────────────────────────────────────────────

def _extract_context(nc1_context: dict[str, Any]) -> tuple[list[str], str, list[str]]:
    industry = nc1_context.get("industry") or nc1_context.get("client_industry") or ""
    client_industry = (industry if isinstance(industry, list) else
                       ([industry] if isinstance(industry, str) and industry else []))
    proposal_type = str(nc1_context.get("proposal_type") or "Not specified")
    priorities    = nc1_context.get("client_priorities") or []
    if isinstance(priorities, str):
        priorities = [p.strip() for p in priorities.split(",") if p.strip()]
    return client_industry, proposal_type, list(priorities)


# ── Agent class ───────────────────────────────────────────────────────────────

class NCR2Agent:
    """Commercial Strength specialist for the Custom Checklist pipeline.

    Makes a single Bedrock LLM call covering 3 dimensions (estimation rigour,
    phase coverage, pricing completeness) plus arithmetic spot-checks.
    Applies deterministic score caps post-LLM.

    Usage:
        result = NCR2Agent().run(proposal_text, nc1_output["auto_detected"])
    """

    def run(
        self,
        proposal_text: str,
        nc1_context: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            client_industry, proposal_type, client_priorities = _extract_context(nc1_context)

            logger.info(
                "NCR2Agent.run() — industry=%s type=%s priorities=%s",
                client_industry, proposal_type, client_priorities,
            )

            system_prompt = _compose_system_prompt(client_industry, proposal_type, client_priorities)
            user_message  = _build_user_message(client_industry, proposal_type, client_priorities)

            combined_message = (
                "PROPOSAL DOCUMENT (full extracted text):\n\n"
                f"{proposal_text}\n\n"
                "---\n\n"
                f"{user_message}"
            )

            raw_result = invoke_agent_text_only(system_prompt, combined_message)
            result     = _apply_score_caps(raw_result)
            score      = float(result.get("scores", {}).get("overall", 0.0))

            logger.info(
                "NCR2Agent complete — estimation=%.1f phase_coverage=%.1f pricing=%.1f overall=%.1f",
                result.get("scores", {}).get("estimation_rigour", 0),
                result.get("scores", {}).get("phase_coverage", 0),
                result.get("scores", {}).get("pricing_completeness", 0),
                score,
            )

            return {"status": "complete", "dimension": DIMENSION,
                    "score": score, "result": result, "error_message": None}

        except Exception as exc:
            logger.error("NCR2Agent.run() FAILED: %s", exc, exc_info=True)
            return {"status": "error", "dimension": DIMENSION,
                    "score": 0.0, "result": None, "error_message": str(exc)}
