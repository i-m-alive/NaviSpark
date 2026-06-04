"""
NCR3 Agent — Competitive Position Reviewer (Custom Pipeline Specialist)

NOTE: This is NCR3 (Competitive Position specialist), not NC3 (Proposal Evaluator).
      NC3 lives at agents/NC3/ and evaluates custom checklist categories.
      NCR3 lives here and applies Agent 3-level competitive expertise.

Evaluates proposals across 5 core dimensions (+ 1 conditional):
  - Client Fit          : Does the proposal address the client's stated priorities?
  - Differentiation     : Does it stand out from a generic template response?
  - Risk Transparency   : Are risks, dependencies, and mitigations clearly surfaced?
  - Credibility         : Are past experience and credentials effectively presented?
  - Narrative           : Does the proposal tell a coherent, compelling story?
  - Industry Factors    : (Conditional) Industry-specific win signals — when NC1 detected
                          a known industry.

Runs in Stage 2 of the Custom Checklist Review Pipeline, in parallel with NC3 and NCR1/2.
Makes a single Bedrock LLM call — same pattern as Agent 3.

Input:
    proposal_text : str  — full extracted text of the uploaded proposal
    nc1_context   : dict — NC1's auto_detected dict

Output schema (NCR wrapper):
{
    "status":        "complete" | "error",
    "dimension":     "competitive_position",
    "score":         float,
    "result":        dict | None,
    "error_message": str | None,
}

NCR3 result schema:
{
    "agent": "ncr3_competitive_position",
    "client_fit_issues": [
        { "priority": str, "issue": str, "severity": str, "recommendation": str }
    ],
    "differentiation": {
        "differentiators_found": [str],
        "sounds_generic": bool,
        "generic_elements": [str]
    },
    "risk_transparency_issues": [
        { "type": "risk_register|dependency|assumption|pre_project",
          "issue": str, "severity": str }
    ],
    "credibility_gaps": [
        { "type": "team|case_study|governance|overclaiming", "issue": str, "severity": str }
    ],
    "overclaiming_flags": [
        { "claim": str, "location": str, "severity": str }
    ],
    "narrative_assessment": {
        "flows_as_story": bool,
        "exec_summary_compelling": bool,
        "clear_why_us": bool,
        "clear_next_step": bool,
        "narrative_gaps": [str]
    },
    "industry_findings": [
        { "factor": str, "finding": "present|absent|weak|not_applicable", "severity": str }
    ],
    "scores": {
        "weights": { "client_fit": float, "differentiation": float,
                     "risk_transparency": float, "credibility": float,
                     "narrative": float, "industry_factors": float },
        "client_fit":          float,
        "differentiation":     float,
        "risk_transparency":   float,
        "credibility":         float,
        "narrative":           float,
        "industry_factors":    float,
        "overall":             float
    }
}
"""

from __future__ import annotations

import logging
from typing import Any

from bedrock_client import invoke_agent_text_only
from agents.NCR3.skills import (
    client_fit_prompt,
    differentiation_prompt,
    risk_transparency_prompt,
    credibility_prompt,
    narrative_prompt,
    industry_factors_prompt,
)
from agents.NCR3.skills.skill_ncr3_6_industry_win_factors import is_active

logger = logging.getLogger(__name__)

DIMENSION = "competitive_position"

# ── Identity ──────────────────────────────────────────────────────────────────

_IDENTITY = """You are NCR3: Competitive Position Reviewer, part of NAVISPARK's Custom Proposal \
Review Pipeline. You are a senior bid director and competitive intelligence specialist with 20+ \
years of experience evaluating proposals from both sides of the table — as a vendor and as a \
client. You spot a generic, template-derived response within the first two pages. You evaluate \
proposals the way a seasoned procurement committee would: genuine client understanding, real \
differentiators, honest risk disclosure, credible track record, and a compelling story.

You review the proposal across 5 skills (+ 1 conditional):
  Skill NCR3.1 — Client Fit Evaluator (calibrated by CLIENT_PRIORITIES)
  Skill NCR3.2 — Differentiation Assessor
  Skill NCR3.3 — Risk Transparency Checker
  Skill NCR3.4 — Credibility Evaluator
  Skill NCR3.5 — Narrative Assessor
  Skill NCR3.6 — Industry Win Factors (calibrated by CLIENT_INDUSTRY — conditional)"""

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

CLIENT FIT (client_fit):
  10.0 — Every stated priority directly addressed with specific, client-language content
   8.0 — All priorities addressed; 1–2 minor specificity gaps
   6.0 — Most priorities addressed; 1 priority vaguely or generically handled
   4.0 — 1–2 priorities completely absent; benefits stated as vendor features
   2.0 — Multiple priorities absent; proposal feels written for a generic client
   0.0 — Fails name-swap test entirely

DIFFERENTIATION — HARD RULES (apply BEFORE rubric):
  IF sounds_generic = true                          → score CANNOT exceed 4.0
  IF len(differentiators_found) >= 3
     AND sounds_generic = false                     → score MUST be >= 8.0
  IF len(differentiators_found) == 2
     AND sounds_generic = false                     → score MUST be >= 7.0
  IF len(differentiators_found) == 1, not generic   → score in 5.0–6.5 range
  IF len(differentiators_found) == 0, not generic   → score in 3.0–5.0 range

RISK TRANSPARENCY (risk_transparency):
  10.0 — Named mitigations; dependencies with what/when/consequence; full pre-project list
   8.0 — Mostly specific; 1–2 minor gaps
   6.0 — Risk register present, some risks lack named mitigations
   4.0 — Generic risk list OR dependencies without consequences
   2.0 — Very generic risks AND missing dependency consequences
   0.0 — No risk register on a complex multi-dependency engagement

CREDIBILITY (credibility):
  10.0 — Named team + credentials + outcome-specific case studies + governance
   8.0 — Mostly credible; 1 minor gap
   6.0 — Case studies present but outcomes vague; team partially named
   4.0 — Generic case studies; unnamed delivery team; overclaiming flags
   2.0 — No relevant case studies; overclaiming throughout
   0.0 — No credibility signals at all

NARRATIVE — HARD RULES (boolean count → fixed score, no exceptions):
  Count TRUE booleans across: flows_as_story, exec_summary_compelling, clear_why_us, clear_next_step
  4 true  → score MUST be 10.0
  3 true  → score MUST be 8.0
  2 true  → score MUST be 6.0 (EXCEPT: if clear_why_us = false → 5.0)
  1 true  → score MUST be 3.0
  0 true  → score MUST be 0.0
  Do NOT adjust based on perceived quality of missing elements. The count is the rule.

INDUSTRY FACTORS (industry_factors):
  10.0 — All industry win factors addressed with specific, conviction-level content
   8.0 — Most factors addressed; 1 minor gap
   6.0 — Some factors addressed; 1–2 significant gaps
   4.0 — Key industry win factor absent
   2.0 — Almost no industry-specific content
   0.0 — No industry awareness demonstrated
   N/A  — Industry not in known list → set to 5.0 and weight to 0.0

DYNAMIC WEIGHT DETERMINATION:
  Analyze CLIENT CONTEXT and assign weights. All six weights must sum to 1.0.
  Output in "scores.weights".

  Baseline (equal weighting): all 6 dimensions = 0.167

  Adjustment guidance:
  - client_fit:        Raise (0.20–0.25) when priorities are specific and numerous.
  - differentiation:   Raise (0.20–0.25) for competitive bids (Consulting, SaaS, Staff Aug).
  - risk_transparency: Raise (0.20–0.25) for Govt, Healthcare, Fixed Price, Risk Mitigation.
  - credibility:       Raise (0.20–0.25) for large enterprise, Managed Services, Consulting.
  - narrative:         Raise (0.20) for Consulting, SaaS, Innovation priorities.
  - industry_factors:  Raise (0.20–0.25) for known specialised industries. Set to 0.0 and
                       redistribute if industry unknown — min weight 0.10 for known industries.

  overall = (client_fit × w_cf) + (differentiation × w_d) + (risk_transparency × w_rt)
          + (credibility × w_cr) + (narrative × w_n) + (industry_factors × w_if)
  Round overall to 1 decimal place.

CRITICAL PENALTY: Graduated penalty applied automatically. Reflect severity honestly.

SCORING PRECISION — permitted values only:
  Primary anchors: 0.0, 2.0, 4.0, 6.0, 8.0, 10.0
  Midpoints:       1.0, 3.0, 5.0, 7.0, 9.0
  Do NOT use arbitrary decimals."""

# ── Output JSON schema ────────────────────────────────────────────────────────

_OUTPUT_SCHEMA = """
═══════════════════════════════════════════════════
EXACT OUTPUT JSON SCHEMA
═══════════════════════════════════════════════════

Return EXACTLY this structure. Every field must be present.
differentiation and narrative_assessment are OBJECTS, not arrays.
Use [] for empty arrays. industry_findings may be empty if skill NCR3.6 is N/A.

{
  "agent": "ncr3_competitive_position",
  "client_fit_issues": [
    {
      "priority": "the client priority being evaluated",
      "issue": "specific description referencing actual content or absence",
      "severity": "CRITICAL | MAJOR | MINOR",
      "recommendation": "specific actionable fix — starts with a verb"
    }
  ],
  "differentiation": {
    "differentiators_found": ["list of genuine, specific differentiators — empty list if none"],
    "sounds_generic": false,
    "generic_elements": ["list of exact phrases or sections that are generic — empty if none"]
  },
  "risk_transparency_issues": [
    {
      "type": "risk_register | dependency | assumption | pre_project",
      "issue": "specific description of the risk transparency gap",
      "severity": "CRITICAL | MAJOR | MINOR"
    }
  ],
  "credibility_gaps": [
    {
      "type": "team | case_study | governance | overclaiming",
      "issue": "specific credibility gap referencing the proposal",
      "severity": "CRITICAL | MAJOR | MINOR"
    }
  ],
  "overclaiming_flags": [
    {
      "claim": "exact phrase from the proposal, max 20 words",
      "location": "section name",
      "severity": "MAJOR | MINOR"
    }
  ],
  "narrative_assessment": {
    "flows_as_story": true,
    "exec_summary_compelling": true,
    "clear_why_us": true,
    "clear_next_step": true,
    "narrative_gaps": ["list of specific missing or underdeveloped narrative elements"]
  },
  "industry_findings": [
    {
      "factor": "the specific industry win factor assessed",
      "finding": "present | absent | weak | not_applicable",
      "severity": "CRITICAL | MAJOR | MINOR | null"
    }
  ],
  "scores": {
    "weights": {
      "client_fit":        0.0,
      "differentiation":   0.0,
      "risk_transparency": 0.0,
      "credibility":       0.0,
      "narrative":         0.0,
      "industry_factors":  0.0
    },
    "client_fit":        0.0,
    "differentiation":   0.0,
    "risk_transparency": 0.0,
    "credibility":       0.0,
    "narrative":         0.0,
    "industry_factors":  0.0,
    "overall":           0.0
  }
}

CRITICAL REMINDERS:
1. differentiation is an OBJECT — not an array. Always has all three fields.
2. narrative_assessment is an OBJECT — all four booleans must be present.
3. If sounds_generic = true → differentiation score CANNOT exceed 4.0.
4. Narrative score is MECHANICAL — boolean count determines score, no exceptions.
5. Every finding must reference specific content — no generic feedback.
6. Return ONLY the JSON object. Nothing before {{. Nothing after }}."""


# ── Prompt composers ──────────────────────────────────────────────────────────

def _compose_system_prompt(
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
) -> str:
    sections = [
        _IDENTITY,
        _FORMAT_INSTRUCTION,
        client_fit_prompt(client_priorities),
        differentiation_prompt,
        risk_transparency_prompt,
        credibility_prompt,
        narrative_prompt,
        industry_factors_prompt(client_industry),
        _SCORING,
        _OUTPUT_SCHEMA,
    ]
    return "\n".join(sections)


def _build_user_message(
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
) -> str:
    industry_str   = ", ".join(client_industry) if client_industry else "Not specified"
    priorities_str = ", ".join(client_priorities) if client_priorities else "Not specified"
    industry_active = is_active(client_industry)

    return f"""Please review the proposal as NCR3: Competitive Position Reviewer.

CLIENT CONTEXT:
- Client Industry:   {industry_str}
- Proposal Type:     {proposal_type or 'Not specified'}
- Client Priorities: {priorities_str}

Apply all skills:
1. Evaluate client fit against each stated CLIENT PRIORITY above (client_fit_issues)
2. Assess solution differentiation — apply competitor name-swap test (differentiation)
3. Check risk and dependency transparency (risk_transparency_issues)
4. Evaluate credibility signals and flag overclaiming (credibility_gaps, overclaiming_flags)
5. Assess narrative arc — evaluate 4 boolean signals, apply mechanical score (narrative_assessment)
6. {'Check industry-specific win factors for CLIENT INDUSTRY above (industry_findings)' if industry_active else 'Industry not in known list — set industry_factors to 5.0, weight to 0.0, industry_findings = []'}
7. Score all dimensions with dynamic weights from CLIENT CONTEXT (scores)

Return ONLY the JSON object as specified."""


# ── Deterministic score caps ──────────────────────────────────────────────────

_CRITICAL_DEDUCTION = {0: 0.0, 1: 0.3, 2: 0.6, 3: 1.0, 4: 1.4, 5: 1.8}


def _critical_deduction(n: int) -> float:
    return _CRITICAL_DEDUCTION.get(n, 1.8 + (n - 5) * 0.4) if n > 0 else 0.0


def _apply_score_caps(
    result: dict,
    client_priorities: list[str],
    client_industry: list[str],
) -> dict:
    """
    Rule 1 — Differentiation floor/ceiling (sounds_generic + differentiator count).
    Rule 2 — Narrative mechanical mapping (boolean count → fixed score).
    Rule 3 — No risk register on complex engagement → cap risk_transparency at 4.0.
    Rule 4 — Uncovered client priority → cap client_fit at 7.0.
    Rule 5 — Industry weight floor (≥0.10 for known industries).
    Rule 0 — Placeholder-zero recovery from evidence.
    Rule 6 — Graduated CRITICAL penalty.
    """
    scores  = result.get("scores") or {}
    weights = scores.get("weights", {})

    for k in ("client_fit", "differentiation", "risk_transparency",
              "credibility", "narrative", "industry_factors"):
        scores.setdefault(k, 0.0)

    cap_applied = False

    # Rule 0: placeholder-zero recovery
    all_zero = all(scores.get(k, 0.0) == 0.0
                   for k in ("client_fit", "differentiation", "risk_transparency",
                              "credibility", "narrative", "industry_factors", "overall"))
    has_evidence = bool(
        result.get("client_fit_issues") or result.get("differentiation") or
        result.get("risk_transparency_issues") or result.get("credibility_gaps")
    )

    if all_zero and has_evidence:
        def _sev_score(issues):
            if not issues: return 7.0
            crits  = sum(1 for i in (issues if isinstance(issues, list) else []) if i.get("severity") == "CRITICAL")
            majors = sum(1 for i in (issues if isinstance(issues, list) else []) if i.get("severity") == "MAJOR")
            if crits >= 2: return 3.0
            if crits >= 1: return 4.0
            if majors >= 3: return 4.0
            if majors >= 1: return 5.0
            return 7.0

        scores["client_fit"]        = _sev_score(result.get("client_fit_issues") or [])
        scores["risk_transparency"] = _sev_score(result.get("risk_transparency_issues") or [])
        scores["credibility"]       = _sev_score(result.get("credibility_gaps") or [])

        diff = result.get("differentiation", {})
        n_diff = len(diff.get("differentiators_found") or [])
        generic = diff.get("sounds_generic", False)
        if generic:
            scores["differentiation"] = 3.0
        elif n_diff >= 3:
            scores["differentiation"] = 8.0
        elif n_diff >= 1:
            scores["differentiation"] = 6.0
        else:
            scores["differentiation"] = 4.0

        narr = result.get("narrative_assessment", {})
        true_count = sum([bool(narr.get("flows_as_story")), bool(narr.get("exec_summary_compelling")),
                          bool(narr.get("clear_why_us")), bool(narr.get("clear_next_step"))])
        narrative_map = {4: 10.0, 3: 8.0, 2: 6.0, 1: 3.0, 0: 0.0}
        scores["narrative"] = narrative_map.get(true_count, 0.0)
        if true_count == 2 and not narr.get("clear_why_us", True):
            scores["narrative"] = 5.0

        scores["industry_factors"] = 5.0
        scores["_scores_recovered_from_evidence"] = True
        cap_applied = True

    # Rule 1: differentiation
    diff       = result.get("differentiation", {})
    n_diff     = len(diff.get("differentiators_found") or [])
    sounds_gen = diff.get("sounds_generic", False)

    if sounds_gen and scores.get("differentiation", 0.0) > 4.0:
        scores["differentiation"] = 4.0
        cap_applied = True
    elif not sounds_gen:
        if n_diff >= 3 and scores.get("differentiation", 0.0) < 8.0:
            scores["differentiation"] = 8.0
            cap_applied = True
        elif n_diff == 2 and scores.get("differentiation", 0.0) < 7.0:
            scores["differentiation"] = 7.0
            cap_applied = True

    # Rule 2: narrative mechanical
    narr = result.get("narrative_assessment", {})
    true_count = sum([bool(narr.get("flows_as_story")), bool(narr.get("exec_summary_compelling")),
                      bool(narr.get("clear_why_us")), bool(narr.get("clear_next_step"))])
    narrative_map = {4: 10.0, 3: 8.0, 2: 6.0, 1: 3.0, 0: 0.0}
    expected_narr = narrative_map.get(true_count, 0.0)
    if true_count == 2 and not narr.get("clear_why_us", True):
        expected_narr = 5.0
    if scores.get("narrative", 0.0) != expected_narr:
        scores["narrative"] = expected_narr
        cap_applied = True

    # Rule 3: no risk register → cap risk_transparency at 4.0
    risk_issues = result.get("risk_transparency_issues") or []
    no_risk_register = any(
        i.get("type") == "risk_register" and i.get("severity") == "CRITICAL"
        for i in risk_issues
    )
    if no_risk_register and scores.get("risk_transparency", 0.0) > 4.0:
        scores["risk_transparency"] = 4.0
        cap_applied = True

    # Rule 4: uncovered priority → cap client_fit at 7.0
    if client_priorities:
        covered = {(i.get("priority") or "").strip().lower()
                   for i in result.get("client_fit_issues", [])}
        uncovered = [p for p in client_priorities if p.strip().lower() not in covered]
        if uncovered and scores.get("client_fit", 0.0) > 7.0:
            scores["client_fit"] = 7.0
            scores["uncovered_priorities"] = uncovered
            cap_applied = True

    # Rule 5: industry weight floor
    if is_active(client_industry):
        cur_if_weight = weights.get("industry_factors", 0.0)
        MIN_IF = 0.10
        if cur_if_weight < MIN_IF:
            deficit    = MIN_IF - cur_if_weight
            other_keys = [k for k in weights if k != "industry_factors"]
            total_other = sum(weights.get(k, 0.0) for k in other_keys)
            if total_other > 0:
                for k in other_keys:
                    weights[k] = round(weights.get(k, 0.0) - deficit * (weights.get(k, 0.0) / total_other), 4)
            weights["industry_factors"] = MIN_IF
            scores["weights"] = weights
            cap_applied = True

    # Rule 6: recompute overall + graduated CRITICAL penalty
    if cap_applied:
        w = scores.get("weights", {})
        default = 1.0 / 6.0
        recomputed = (
            scores.get("client_fit",        0.0) * w.get("client_fit",        default)
            + scores.get("differentiation", 0.0) * w.get("differentiation",   default)
            + scores.get("risk_transparency",0.0)* w.get("risk_transparency",  default)
            + scores.get("credibility",     0.0) * w.get("credibility",        default)
            + scores.get("narrative",       0.0) * w.get("narrative",          default)
            + scores.get("industry_factors",0.0) * w.get("industry_factors",   default)
        )
        critical_count = sum(
            1 for issue in (
                result.get("risk_transparency_issues", [])
                + result.get("client_fit_issues", [])
                + result.get("credibility_gaps", [])
            ) if issue.get("severity") == "CRITICAL"
        )
        recomputed = max(0.0, recomputed - _critical_deduction(critical_count))
        scores["overall"] = round(recomputed, 1)

    if "overall" not in scores:
        w = scores.get("weights", {})
        default = 1.0 / 6.0
        scores["overall"] = round(
            scores.get("client_fit",        0.0) * w.get("client_fit",        default)
            + scores.get("differentiation", 0.0) * w.get("differentiation",   default)
            + scores.get("risk_transparency",0.0)* w.get("risk_transparency",  default)
            + scores.get("credibility",     0.0) * w.get("credibility",        default)
            + scores.get("narrative",       0.0) * w.get("narrative",          default)
            + scores.get("industry_factors",0.0) * w.get("industry_factors",   default),
            1,
        )

    scores["differentiator_count"] = n_diff
    scores["sounds_generic"]       = sounds_gen
    scores["narrative_true_count"] = true_count
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

class NCR3Agent:
    """Competitive Position specialist for the Custom Checklist pipeline.

    Makes a single Bedrock LLM call covering 5 dimensions (+ conditional industry
    factors). Applies deterministic score caps post-LLM including the hard
    differentiation and narrative rules from Agent 3.

    Usage:
        result = NCR3Agent().run(proposal_text, nc1_output["auto_detected"])
    """

    def run(
        self,
        proposal_text: str,
        nc1_context: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            client_industry, proposal_type, client_priorities = _extract_context(nc1_context)

            logger.info(
                "NCR3Agent.run() — industry=%s type=%s priorities=%s",
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
            result     = _apply_score_caps(raw_result, client_priorities, client_industry)
            score      = float(result.get("scores", {}).get("overall", 0.0))

            sc = result.get("scores", {})
            logger.info(
                "NCR3Agent complete — client_fit=%.1f diff=%.1f risk=%.1f cred=%.1f narr=%.1f ind=%.1f overall=%.1f",
                sc.get("client_fit", 0), sc.get("differentiation", 0),
                sc.get("risk_transparency", 0), sc.get("credibility", 0),
                sc.get("narrative", 0), sc.get("industry_factors", 0), score,
            )

            return {"status": "complete", "dimension": DIMENSION,
                    "score": score, "result": result, "error_message": None}

        except Exception as exc:
            logger.error("NCR3Agent.run() FAILED: %s", exc, exc_info=True)
            return {"status": "error", "dimension": DIMENSION,
                    "score": 0.0, "result": None, "error_message": str(exc)}
