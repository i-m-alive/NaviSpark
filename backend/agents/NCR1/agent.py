"""
NCR1 Agent — Clarity & Completeness Reviewer (Custom Pipeline Specialist)

Evaluates proposals across 3 dimensions:
  - Section Completeness  : Are all mandatory proposal sections present and filled?
  - Writing Quality       : Is the language clear, professional, free of filler?
  - Scope Clarity         : Is the project scope unambiguous and well-defined?

Runs in Stage 2 of the Custom Checklist Review Pipeline, in parallel with NC3 and NCR2/3.
Takes extracted proposal text + NC1 auto-detected context (no raw PDF bytes needed).
Makes a single Bedrock LLM call — same pattern as Agent 1.

Input:
    proposal_text : str  — full extracted text of the uploaded proposal
    nc1_context   : dict — NC1's auto_detected dict (industry, proposal_type,
                          client_priorities, client_name, etc.)

Output schema (NCR wrapper):
{
    "status":        "complete" | "error",
    "dimension":     "clarity_completeness",
    "score":         float,        # overall score 0.0–10.0
    "result":        dict | None,  # full NCR1 output (schema below)
    "error_message": str | None,
}

NCR1 result schema:
{
    "agent": "ncr1_clarity_completeness",
    "section_audit": [
        { "section": str, "mandatory": bool, "status": "COVERED|PARTIAL|MISSING", "note": str }
    ],
    "writing_issues": [
        { "type": str, "quote": str, "location": str, "why": str, "severity": str }
    ],
    "scope_clarity_issues": [
        { "issue": str, "location": str, "quote": str, "severity": str, "recommendation": str }
    ],
    "high_risk_assumptions": [
        { "assumption": str, "location": str, "risk_if_wrong": str }
    ],
    "rewrite": { "section": str, "original": str, "improved": str, "what_changed": str },
    "scores": {
        "weights": { "section_completeness": float, "writing_quality": float,
                     "scope_clarity": float, "client_coverage": float },
        "section_completeness": float,
        "writing_quality":      float,
        "scope_clarity":        float,
        "client_coverage":      float,
        "overall":              float
    }
}
"""

from __future__ import annotations

import logging
from typing import Any

from bedrock_client import invoke_agent_text_only
from agents.NCR1.skills import (
    section_completeness_prompt,
    writing_quality_prompt,
    scope_clarity_prompt,
)

logger = logging.getLogger(__name__)

DIMENSION = "clarity_completeness"

# ── Identity ──────────────────────────────────────────────────────────────────

_IDENTITY = """You are NCR1: Clarity & Completeness Reviewer, part of NAVISPARK's Custom Proposal \
Review Pipeline. You are a senior proposal consultant with 20+ years of experience reviewing \
professional services and IT consulting proposals. You read proposals the way a demanding client \
evaluation committee would — you do not give the benefit of the doubt. You flag what is missing, \
vague, or weak with precision and evidence from the actual document.

You review the proposal across 3 skills:
  Skill NCR1.1 — Section Completeness Evaluator
  Skill NCR1.2 — Writing Quality Analyzer
  Skill NCR1.3 — Scope Clarity Checker
  Skill NCR1.4 — Rewrite Generator (weakest paragraph)"""

# ── Format instruction ────────────────────────────────────────────────────────

_FORMAT_INSTRUCTION = """
═══════════════════════════════════════════════════
CRITICAL INSTRUCTION — OUTPUT FORMAT
═══════════════════════════════════════════════════

You MUST return ONLY a single valid JSON object. No preamble. No explanation.
No markdown code fences. No text before or after the JSON.
The response must start with { and end with }.
If you include ANY text outside the JSON object, the system will fail.
Return ONLY the JSON."""

# ── Rewrite skill ─────────────────────────────────────────────────────────────

_REWRITE_SECTION = """
═══════════════════════════════════════════════════
SKILL NCR1.4 — REWRITE GENERATOR
═══════════════════════════════════════════════════

Identify the single weakest paragraph in the proposal — the one that most
reduces credibility due to filler, passive accountability, or template smell.
Rewrite it to be specific, active, and client-relevant.

Rules:
- Choose the paragraph with the MOST issues identified in Skills NCR1.2 or NCR1.3.
- The rewritten version must be the same length or shorter.
- Use active voice. Replace every filler phrase with a specific claim.
- Do NOT invent facts — only use information already present in the proposal.
- what_changed: 1-2 sentences explaining what changed and why.
"""

# ── Scoring criteria ──────────────────────────────────────────────────────────

_SCORING = """
═══════════════════════════════════════════════════
SCORING CRITERIA
═══════════════════════════════════════════════════

Score each dimension out of 10.0 (one decimal place). Use the FULL range 0–10.
Do not cluster scores around 6–7. A score of 8+ means genuinely strong. Most proposals score 4–7.

SECTION COMPLETENESS (section_completeness):
  10.0 — All 10 core sections COVERED, all mandatory sections fully developed
   8.0 — All mandatory sections COVERED, some expected PARTIAL or MISSING
   6.0 — Most mandatory COVERED; 1–2 mandatory PARTIAL
   4.0 — Multiple mandatory PARTIAL or 1 mandatory MISSING
   2.0 — Several mandatory MISSING
   0.0 — Fewer than half of mandatory sections are COVERED

WRITING QUALITY (writing_quality):
  10.0 — No filler, no passive accountability, no template smell, all claims substantiated
   8.0 — 1–2 minor issues, no credibility damage
   6.0 — 3–4 issues, mostly minor to major
   4.0 — Multiple major issues, noticeable template smell
   2.0 — Pervasive filler, hidden accountability throughout
   0.0 — Proposal reads as entirely generic

SCOPE CLARITY (scope_clarity):
  10.0 — In-scope and out-of-scope explicit, ownership unambiguous, no creep risk
   8.0 — Mostly clear, minor gaps
   6.0 — Scope section exists but has 1–2 meaningful gaps (e.g., out-of-scope vague)
   4.0 — Scope vague or missing out-of-scope statement
   2.0 — No clear scope section
   0.0 — No scope definition at all

CLIENT COVERAGE (client_coverage):
  This dimension reflects whether the proposal shows awareness of the client's industry context.
  10.0 — Industry-specific factors explicitly addressed with specific content
   8.0 — Most industry factors addressed, 1 minor gap
   6.0 — Some industry awareness, 1–2 significant gaps
   4.0 — Few industry-specific elements present
   2.0 — Almost no industry awareness
   0.0 — No industry-specific content at all
   N/A  — Industry not determinable (set client_coverage to 5.0 as neutral)

DYNAMIC WEIGHT DETERMINATION:
  Analyze the CLIENT CONTEXT below and assign weights to each scoring dimension.
  All four weights must sum to exactly 1.0. Output chosen weights in "scores.weights".

  Baseline defaults:
    section_completeness = 0.40
    writing_quality      = 0.20
    scope_clarity        = 0.25
    client_coverage      = 0.15

  Weight adjustment guidance:
  - section_completeness: Raise (0.45–0.50) for Government, Healthcare, Insurance, Fixed Price,
    or priorities "Compliance", "Risk Mitigation". These clients demand contractual completeness.
  - writing_quality: Raise (0.25–0.30) for Consulting, SaaS, or priorities "Quality", "Innovation".
  - scope_clarity: Raise (0.30–0.35) for Fixed Price, Managed Services, "Cost Certainty" priority.
    Ambiguous scope = overrun risk for these engagements.
  - client_coverage: Raise (0.20–0.25) for specialised industries (Fintech, Healthcare, Government,
    Insurance, Energy, Telecom). Set to 0.0 if industry unknown — redistribute proportionally.

  After weights, compute:
    overall = (section_completeness × w_sc) + (writing_quality × w_wq)
            + (scope_clarity × w_so) + (client_coverage × w_cc)
  Round overall to 1 decimal place.

CRITICAL PENALTY: The more CRITICAL issues, the lower the overall score.
The system applies a graduated penalty after your response — do not manually cap.
Simply reflect severity honestly: many CRITICALs → score meaningfully lower.

SCORING PRECISION — permitted values only:
  Primary anchors: 0.0, 2.0, 4.0, 6.0, 8.0, 10.0
  Midpoints:       1.0, 3.0, 5.0, 7.0, 9.0
  Do NOT use arbitrary decimals (5.3, 6.7, 7.8, etc.)."""

# ── Output JSON schema ────────────────────────────────────────────────────────

_OUTPUT_SCHEMA = """
═══════════════════════════════════════════════════
EXACT OUTPUT JSON SCHEMA
═══════════════════════════════════════════════════

Return EXACTLY this structure. Every field must be present.
Use [] for empty arrays, null for rewrite only if no weak paragraph found.

{
  "agent": "ncr1_clarity_completeness",
  "section_audit": [
    {
      "section": "section name (e.g. Executive Summary)",
      "mandatory": true,
      "status": "COVERED | PARTIAL | MISSING",
      "note": "Specific note referencing actual content. Quote or paraphrase. Never generic."
    }
  ],
  "writing_issues": [
    {
      "type": "filler_phrase | hidden_accountability | template_smell | inconsistent_terminology | unsubstantiated_claim",
      "quote": "Exact text from the proposal (max 30 words)",
      "location": "Section name where this appears",
      "why": "Why this reduces credibility",
      "severity": "CRITICAL | MAJOR | MINOR"
    }
  ],
  "scope_clarity_issues": [
    {
      "issue": "Specific description of the scope clarity problem",
      "location": "Section name",
      "quote": "The ambiguous text (max 40 words)",
      "severity": "CRITICAL | MAJOR | MINOR",
      "recommendation": "Specific actionable fix"
    }
  ],
  "high_risk_assumptions": [
    {
      "assumption": "The assumption being made (explicit or implicit)",
      "location": "Where this appears or is implied",
      "risk_if_wrong": "What would happen to scope/cost/timeline if wrong"
    }
  ],
  "rewrite": {
    "section": "Section name containing the weakest paragraph",
    "original": "Full original paragraph exactly as in the proposal",
    "improved": "Full rewritten paragraph — same or shorter, active voice, specific",
    "what_changed": "1-2 sentences explaining what changed and why"
  },
  "scores": {
    "weights": {
      "section_completeness": 0.0,
      "writing_quality":      0.0,
      "scope_clarity":        0.0,
      "client_coverage":      0.0
    },
    "section_completeness": 0.0,
    "writing_quality":      0.0,
    "scope_clarity":        0.0,
    "client_coverage":      0.0,
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
        section_completeness_prompt(),
        writing_quality_prompt,
        scope_clarity_prompt,
        _REWRITE_SECTION,
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
    return f"""Please review the proposal as NCR1: Clarity & Completeness Reviewer.

CLIENT CONTEXT:
- Client Industry: {industry_str}
- Proposal Type:   {proposal_type or 'Not specified'}
- Client Priorities: {priorities_str}

Apply all 4 skills:
1. Audit all 10 core proposal sections — COVERED / PARTIAL / MISSING (section_audit)
2. Flag all writing quality issues — filler, hidden accountability, template smell (writing_issues)
3. Check scope clarity, out-of-scope, and high-risk assumptions (scope_clarity_issues, high_risk_assumptions)
4. Identify and rewrite the single weakest paragraph (rewrite)
5. Score all 4 dimensions with dynamic weights from CLIENT CONTEXT (scores)

Return ONLY the JSON object as specified."""


# ── Deterministic score caps ──────────────────────────────────────────────────

_CRITICAL_DEDUCTION = {0: 0.0, 1: 0.3, 2: 0.6, 3: 1.0, 4: 1.4, 5: 1.8}


def _critical_deduction(n: int) -> float:
    return _CRITICAL_DEDUCTION.get(n, 1.8 + (n - 5) * 0.4) if n > 0 else 0.0


def _apply_score_caps(result: dict) -> dict:
    """
    Rule 1 — Section completeness cap:
      ≥3 mandatory sections MISSING → cap section_completeness at 4.0.

    Rule 2 — Scope clarity cap:
      Any CRITICAL scope_clarity_issue → cap scope_clarity at 4.0.

    Rule 0 — Placeholder-zero recovery:
      All scores are 0.0 but analysis evidence exists → recover from evidence.

    Rule 3 — Graduated overall penalty per CRITICAL count.
    """
    section_audit = result.get("section_audit", [])
    mandatory_missing = sum(
        1 for item in section_audit
        if item.get("mandatory") is True and item.get("status") == "MISSING"
    )

    scope_issues = result.get("scope_clarity_issues", [])
    has_critical_scope = any(i.get("severity") == "CRITICAL" for i in scope_issues)

    scores = result.get("scores") or {}
    scores.setdefault("section_completeness", 0.0)
    scores.setdefault("writing_quality",      0.0)
    scores.setdefault("scope_clarity",        0.0)
    scores.setdefault("client_coverage",      0.0)

    cap_applied = False

    # Rule 0: placeholder-zero recovery
    all_zero = all(scores.get(k, 0.0) == 0.0 for k in
                   ("section_completeness", "writing_quality", "scope_clarity", "client_coverage", "overall"))
    has_evidence = bool(result.get("section_audit") or result.get("writing_issues") or
                        result.get("scope_clarity_issues"))

    if all_zero and has_evidence:
        audit = result.get("section_audit") or []
        if audit:
            w_sum   = sum((2.0 if i.get("mandatory") else 1.0) *
                          (1.0 if i.get("status") == "COVERED" else
                           0.5 if i.get("status") == "PARTIAL" else 0.0)
                          for i in audit)
            w_total = sum(2.0 if i.get("mandatory") else 1.0 for i in audit)
            scores["section_completeness"] = round(max(1.0, 10.0 * w_sum / w_total), 1) if w_total else 5.0
        else:
            scores["section_completeness"] = 5.0

        def _sev_score(issues):
            if not issues: return 8.0
            crits  = sum(1 for i in issues if i.get("severity") == "CRITICAL")
            majors = sum(1 for i in issues if i.get("severity") == "MAJOR")
            if crits >= 3: return 2.0
            if crits >= 2: return 3.0
            if crits >= 1: return 4.0
            if majors >= 4: return 4.0
            if majors >= 2: return 5.0
            if majors >= 1: return 6.0
            return 7.0

        scores["writing_quality"] = _sev_score(result.get("writing_issues") or [])
        scores["scope_clarity"]   = _sev_score(result.get("scope_clarity_issues") or [])
        gaps = result.get("client_specific_gaps") or []
        if not gaps:
            scores["client_coverage"] = 5.0
        else:
            major_gaps = sum(1 for g in gaps if g.get("severity") in ("CRITICAL", "MAJOR"))
            scores["client_coverage"] = 3.0 if major_gaps >= 3 else (5.0 if major_gaps >= 1 else 7.0)
        scores["_scores_recovered_from_evidence"] = True
        cap_applied = True

    # Rule 1
    if mandatory_missing >= 3 and scores.get("section_completeness", 0.0) > 4.0:
        scores["section_completeness"] = 4.0
        cap_applied = True

    # Rule 2
    if has_critical_scope and scores.get("scope_clarity", 0.0) > 4.0:
        scores["scope_clarity"] = 4.0
        cap_applied = True

    # Recompute overall
    if cap_applied:
        weights = scores.get("weights", {})
        w_sc = weights.get("section_completeness", 0.40)
        w_wq = weights.get("writing_quality",      0.20)
        w_so = weights.get("scope_clarity",        0.25)
        w_cc = weights.get("client_coverage",      0.15)
        recomputed = (
            scores.get("section_completeness", 0.0) * w_sc
            + scores.get("writing_quality",    0.0) * w_wq
            + scores.get("scope_clarity",      0.0) * w_so
            + scores.get("client_coverage",    0.0) * w_cc
        )
        total_critical = mandatory_missing + (1 if has_critical_scope else 0)
        recomputed = max(0.0, recomputed - _critical_deduction(total_critical))
        scores["overall"] = round(recomputed, 1)

    if "overall" not in scores:
        weights = scores.get("weights", {})
        scores["overall"] = round(
            scores.get("section_completeness", 0.0) * weights.get("section_completeness", 0.40)
            + scores.get("writing_quality",    0.0) * weights.get("writing_quality",      0.20)
            + scores.get("scope_clarity",      0.0) * weights.get("scope_clarity",        0.25)
            + scores.get("client_coverage",    0.0) * weights.get("client_coverage",      0.15),
            1,
        )

    scores["mandatory_missing_count"]    = mandatory_missing
    scores["has_critical_scope_issue"]   = has_critical_scope
    result["scores"] = scores
    return result


# ── Context extractor ─────────────────────────────────────────────────────────

def _extract_context(nc1_context: dict[str, Any]) -> tuple[list[str], str, list[str]]:
    industry = nc1_context.get("industry") or nc1_context.get("client_industry") or ""
    if isinstance(industry, list):
        client_industry = [i for i in industry if i]
    elif isinstance(industry, str) and industry:
        client_industry = [industry]
    else:
        client_industry = []

    proposal_type = str(nc1_context.get("proposal_type") or "Not specified")

    priorities = nc1_context.get("client_priorities") or []
    if isinstance(priorities, str):
        priorities = [p.strip() for p in priorities.split(",") if p.strip()]

    return client_industry, proposal_type, list(priorities)


# ── Agent class ───────────────────────────────────────────────────────────────

class NCR1Agent:
    """Clarity & Completeness specialist for the Custom Checklist pipeline.

    Makes a single Bedrock LLM call covering 3 dimensions (section completeness,
    writing quality, scope clarity) plus a rewrite. Applies deterministic score
    caps post-LLM. Returns an NCR wrapper dict compatible with NC4.

    Usage:
        result = NCR1Agent().run(proposal_text, nc1_output["auto_detected"])
    """

    def run(
        self,
        proposal_text: str,
        nc1_context: dict[str, Any],
    ) -> dict[str, Any]:
        """Run Clarity & Completeness review on extracted proposal text.

        Returns:
            NCR wrapper: {status, dimension, score, result, error_message}.
            Never raises — exceptions returned as error status.
        """
        try:
            client_industry, proposal_type, client_priorities = _extract_context(nc1_context)

            logger.info(
                "NCR1Agent.run() — industry=%s type=%s priorities=%s",
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

            logger.info("NCR1Agent complete — section_completeness=%.1f writing_quality=%.1f scope_clarity=%.1f overall=%.1f",
                        result.get("scores", {}).get("section_completeness", 0),
                        result.get("scores", {}).get("writing_quality", 0),
                        result.get("scores", {}).get("scope_clarity", 0),
                        score)

            return {"status": "complete", "dimension": DIMENSION,
                    "score": score, "result": result, "error_message": None}

        except Exception as exc:
            logger.error("NCR1Agent.run() FAILED: %s", exc, exc_info=True)
            return {"status": "error", "dimension": DIMENSION,
                    "score": 0.0, "result": None, "error_message": str(exc)}
