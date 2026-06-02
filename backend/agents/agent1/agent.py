"""
Agent 1 — Completeness & Clarity Reviewer
Orchestrates all 6 skills into a single Bedrock call.
"""

from bedrock_client import invoke_agent_with_pdf, invoke_agent_with_context_json, reset_token_accumulator, get_accumulated_tokens
from agents.agent1.skills import (
    skill_1_1_section_audit,
    skill_1_2_writing_quality,
    skill_1_3_scope_clarity,
    skill_1_4_industry_gaps,
    skill_1_5_jargon_check,
    skill_1_6_rewrite,
)

# ── Identity Block ────────────────────────────────────────────────────────────

_IDENTITY = """You are Agent 1: Completeness & Clarity Reviewer for NAVISPARK PS03, an AI-powered \
proposal review system used by professional services and IT consulting firms to evaluate client \
proposals before submission.

You are a senior proposal consultant with 20+ years of experience reviewing hundreds of IT services \
proposals across industries. You read proposals critically, the way a demanding client evaluation \
committee would. You do not give the benefit of the doubt. You flag what is missing, vague, or weak \
with precision and evidence from the actual document.

You review the proposal across 6 skills:
  Skill 1.1 — Section Completeness Audit
  Skill 1.2 — Writing Quality Analysis
  Skill 1.3 — Scope Clarity Check
  Skill 1.4 — Client-Specific Completeness
  Skill 1.5 — Jargon Density Check
  Skill 1.6 — Rewrite Generator"""

# ── Output Format Instruction ─────────────────────────────────────────────────

_FORMAT_INSTRUCTION = """
═══════════════════════════════════════════════════
CRITICAL INSTRUCTION — OUTPUT FORMAT
═══════════════════════════════════════════════════

You MUST return ONLY a single valid JSON object. No preamble. No explanation.
No markdown code fences. No text before or after the JSON.
The response must start with { and end with }.
If you include ANY text outside the JSON object, the system will fail.
Return ONLY the JSON."""

# ── Scoring Criteria ──────────────────────────────────────────────────────────

_SCORING = """
═══════════════════════════════════════════════════
SCORING CRITERIA
═══════════════════════════════════════════════════

Score each dimension out of 10.0 (one decimal place). Use the FULL range 0–10.
Do not cluster scores around 6–7. A score of 8+ means genuinely strong. Most proposals score 4–7.

SECTION COMPLETENESS (section_completeness):
  10.0 — All 22 items COVERED, all mandatory items fully developed
   8.0 — All mandatory items COVERED, some optional PARTIAL or MISSING
   6.0 — Most mandatory COVERED, 1–2 mandatory PARTIAL
   4.0 — Multiple mandatory PARTIAL or 1 mandatory MISSING
   2.0 — Several mandatory MISSING
   0.0 — Fewer than half of mandatory items are COVERED

WRITING QUALITY (writing_quality):
  10.0 — No filler, no passive accountability, no template smell, all claims substantiated
   8.0 — 1–2 minor issues, no credibility damage
   6.0 — 3–4 issues, mostly minor to major
   4.0 — Multiple major issues, noticeable template smell
   2.0 — Pervasive filler, hidden accountability throughout
   0.0 — Proposal reads as entirely generic

SCOPE CLARITY (scope_clarity):
  10.0 — In-scope and out-of-scope clear, ownership unambiguous, no creep risk
   8.0 — Mostly clear, minor gaps
   6.0 — Scope section exists with 1–2 meaningful gaps
   4.0 — Scope vague or missing out-of-scope section
   2.0 — No clear scope section
   0.0 — No scope definition at all

CLIENT COVERAGE (client_coverage):
  10.0 — All industry-specific factors addressed with specific content
   8.0 — Most addressed, 1 minor gap
   6.0 — Some addressed, 1–2 significant gaps
   4.0 — Few industry-specific factors present
   2.0 — Almost no industry awareness
   0.0 — No industry-specific content
   N/A — Industry not in known list (set client_coverage to 5.0 as neutral)

DYNAMIC WEIGHT DETERMINATION:
  Before computing the overall score, analyze the CLIENT CONTEXT (CLIENT_INDUSTRY, PROPOSAL_TYPE,
  CLIENT_PRIORITIES) provided in the user message and assign a weight to each scoring dimension.
  All four weights must sum to exactly 1.0. Output the chosen weights in "scores.weights".

  Baseline defaults: section_completeness=0.40, writing_quality=0.20, scope_clarity=0.25, client_coverage=0.15

  Weight adjustment guidance (use professional judgement — these are directional signals):
  - section_completeness: Raise (toward 0.45–0.50) for Government, Healthcare, Insurance, or Energy
    industries; "Fixed Price" or "Government RFP" proposal types; or priorities "Compliance",
    "Risk Mitigation". These clients need contractual and regulatory completeness.
  - writing_quality: Raise (toward 0.25–0.30) for "Consulting" or "SaaS / Product" proposal types;
    or priorities "Quality", "Innovation". These clients are buying intellectual rigour.
  - scope_clarity: Raise (toward 0.30–0.35) for "Fixed Price" or "Managed Services" proposal types;
    or priorities "Cost Certainty", "Risk Mitigation". Ambiguous scope = overrun risk for these clients.
  - client_coverage: Raise (toward 0.20–0.25) for specialised industries (Fintech, Healthcare,
    Government, Insurance, Energy, Telecom). If the industry is not in the known list, set
    client_coverage weight to 0.0 and redistribute proportionally to the other three dimensions.

  After determining weights, compute:
    overall = (section_completeness × weights.section_completeness)
            + (writing_quality × weights.writing_quality)
            + (scope_clarity × weights.scope_clarity)
            + (client_coverage × weights.client_coverage)
  Round overall to 1 decimal place.

CRITICAL PENALTY: The more CRITICAL issues a proposal has, the lower the overall score must be.
The system applies a graduated penalty automatically after you respond — do not manually hard-cap
your score. Simply reflect severity honestly: a proposal with many CRITICAL issues should score
meaningfully lower than one with only MINOR issues. A proposal with no CRITICAL issues and only
MINOR issues can score 8.0+.

SCORING PRECISION — use only these permitted values for each dimension score:
  Primary anchors: 0.0, 2.0, 4.0, 6.0, 8.0, 10.0
  Midpoints (between two anchors): 1.0, 3.0, 5.0, 7.0, 9.0
  Do NOT use arbitrary decimals such as 5.3, 6.7, 7.8, 4.2.
  Choose whichever anchor or midpoint best fits the evidence. This constraint ensures
  consistent, reproducible scores across repeated analysis of the same document."""

# ── Output JSON Schema ────────────────────────────────────────────────────────

_OUTPUT_SCHEMA = """
═══════════════════════════════════════════════════
EXACT OUTPUT JSON SCHEMA
═══════════════════════════════════════════════════

Return EXACTLY this structure. Every field must be present.
Use [] for empty arrays, null for rewrite if somehow not applicable.

{
  "agent": "completeness_clarity",
  "section_audit": [
    {
      "id": "P-01",
      "section": "section name from the checklist",
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
  "client_specific_gaps": [
    {
      "industry_lens": "Industry name",
      "gap": "Specific element missing or insufficient",
      "why_it_matters": "Why a client in this industry expects this",
      "severity": "MAJOR | MINOR"
    }
  ],
  "jargon_flags": [
    {
      "passage": "First 20 words of the jargon-dense paragraph",
      "jargon_terms": ["list", "of", "terms"],
      "plain_language_suggestion": "Plain-English explanation in context"
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
      "writing_quality": 0.0,
      "scope_clarity": 0.0,
      "client_coverage": 0.0
    },
    "section_completeness": 0.0,
    "writing_quality": 0.0,
    "scope_clarity": 0.0,
    "client_coverage": 0.0,
    "overall": 0.0
  }
}

FINAL REMINDER: Return ONLY the JSON object. Nothing before {. Nothing after }."""


# ── Prompt Composer ───────────────────────────────────────────────────────────

def compose_system_prompt(
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
) -> str:
    """
    Builds the complete Agent 1 system prompt by assembling all skill sections.
    Skills 1.4 and 1.5 are conditionally included based on the client industry.
    """
    sections = [
        _IDENTITY,
        _FORMAT_INSTRUCTION,
        skill_1_1_section_audit.get_prompt_section(),
        skill_1_2_writing_quality.get_prompt_section(),
        skill_1_3_scope_clarity.PROMPT_SECTION,
    ]

    # Skill 1.4: only include if industry has known factors
    if skill_1_4_industry_gaps.is_active(client_industry):
        sections.append(skill_1_4_industry_gaps.get_prompt_section(client_industry))

    # Skill 1.5: always include (it handles suppression internally via routing message)
    sections.append(skill_1_5_jargon_check.get_prompt_section(client_industry))

    sections.extend([
        skill_1_6_rewrite.PROMPT_SECTION,
        _SCORING,
        _OUTPUT_SCHEMA,
    ])

    return "\n".join(sections)


def build_user_message(
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
) -> str:
    """Builds the user turn message with CLIENT CONTEXT injection."""
    industry_str = ", ".join(client_industry) if client_industry else "Not specified"
    priorities_str = ", ".join(client_priorities) if client_priorities else "Not specified"

    return f"""Please review the attached proposal document as Agent 1: Completeness & Clarity Reviewer.

CLIENT CONTEXT:
- Client Industry: {industry_str}
- Proposal Type: {proposal_type or 'Not specified'}
- Client Priorities: {priorities_str}

Apply all 6 skills to this proposal:
1. Audit all 22 GSK checklist items (section_audit — MUST have exactly 22 entries)
2. Flag all writing quality issues (writing_issues)
3. Check scope clarity and high-risk assumptions (scope_clarity_issues, high_risk_assumptions)
4. Check for industry-specific gaps based on Client Industry above (client_specific_gaps)
5. Check jargon density based on Client Industry above (jargon_flags)
6. Identify and rewrite the single weakest paragraph (rewrite)

Return ONLY the JSON object as specified in your instructions. No other text."""


# ── Score Cap (deterministic post-processing) ────────────────────────────────

# Graduated deduction per CRITICAL issue count.
# Replaces the old hard cliff-edge (min 5.5 at count ≥ 3) with a smooth ramp
# so that one extra LLM-generated CRITICAL finding causes at most a 0.3–0.4
# point change rather than a sudden 1–2 point drop.
_CRITICAL_DEDUCTION_TABLE = {0: 0.0, 1: 0.3, 2: 0.6, 3: 1.0, 4: 1.4, 5: 1.8}


def _critical_deduction(n: int) -> float:
    if n <= 0:
        return 0.0
    return _CRITICAL_DEDUCTION_TABLE.get(n, 1.8 + (n - 5) * 0.4)


def _apply_score_caps(result: dict) -> dict:
    """
    Deterministic guard applied AFTER the LLM returns scores.

    Rule 1 — Section completeness cap:
      If ≥3 mandatory checklist items are MISSING, cap section_completeness
      at 4.0. Each mandatory MISSING item is one CRITICAL issue.

    Rule 2 — Scope clarity cap:
      Fires if EITHER of these is true (OR logic — the LLM severity is unreliable):
        (a) Any scope_clarity_issue is rated CRITICAL by the LLM.
        (b) P-06 (Out of Scope) is PARTIAL or MISSING in section_audit.
      P-06 PARTIAL/MISSING is always an out-of-scope gap, regardless of whether
      the LLM chose MAJOR or CRITICAL when describing it in scope_clarity_issues.
      The rubric maps "missing out-of-scope section" → 4.0.

    Rule 3 — Overall hard cap:
      Per the scoring rubric: 3+ CRITICAL issues → overall cannot exceed 5.5.
      CRITICAL issues are counted as: mandatory MISSING items + P-06 gap presence.
    """
    section_audit = result.get("section_audit", [])
    mandatory_missing_count = sum(
        1 for item in section_audit
        if item.get("mandatory") is True and item.get("status") == "MISSING"
    )

    # P-06 being PARTIAL or MISSING is a guaranteed scope gap, regardless of LLM severity label
    p06_status = next(
        (item.get("status") for item in section_audit if item.get("id") == "P-06"),
        None,
    )
    p06_gap = p06_status in ("PARTIAL", "MISSING")

    scope_issues = result.get("scope_clarity_issues", [])
    has_critical_scope_flag = any(
        issue.get("severity") == "CRITICAL"
        for issue in scope_issues
    )

    # Either signal triggers the scope cap
    has_critical_scope = has_critical_scope_flag or p06_gap

    scores = result.get("scores") or {}
    cap_applied = False

    # Ensure all expected sub-score keys exist (LLM sometimes omits them entirely)
    scores.setdefault("section_completeness", 0.0)
    scores.setdefault("writing_quality",      0.0)
    scores.setdefault("scope_clarity",         0.0)
    scores.setdefault("client_coverage",       0.0)

    # Rule 0 — Placeholder-zero detection and evidence-based recovery
    # The LLM occasionally fills every score field with the schema template value
    # (0.0) — this happens whether or not overall is also 0. Detect the case where
    # ALL scores are zero but analysis evidence exists (section_audit populated,
    # issues found), then compute approximate scores from that evidence so the
    # scorecard is meaningful instead of blank.
    all_scores_zero = (
        scores.get("section_completeness", 0.0) == 0.0
        and scores.get("writing_quality",   0.0) == 0.0
        and scores.get("scope_clarity",     0.0) == 0.0
        and scores.get("client_coverage",   0.0) == 0.0
        and scores.get("overall",           0.0) == 0.0
    )
    has_analysis_evidence = bool(
        result.get("section_audit")
        or result.get("writing_issues")
        or result.get("scope_clarity_issues")
    )

    if all_scores_zero and has_analysis_evidence:
        # ── section_completeness: weighted audit coverage ──────────────────────
        audit = result.get("section_audit") or []
        if audit:
            w_sum = sum(
                (2.0 if i.get("mandatory") else 1.0) *
                (1.0 if i.get("status") == "COVERED" else
                 0.5 if i.get("status") == "PARTIAL" else 0.0)
                for i in audit
            )
            w_total = sum(2.0 if i.get("mandatory") else 1.0 for i in audit)
            scores["section_completeness"] = round(
                max(1.0, round(10.0 * w_sum / w_total)) if w_total else 5.0, 1
            )
        else:
            scores["section_completeness"] = 5.0

        # ── writing_quality / scope_clarity: severity-based estimate ──────────
        def _severity_score(issues):
            if not issues:
                return 8.0
            crit  = sum(1 for i in issues if i.get("severity") == "CRITICAL")
            major = sum(1 for i in issues if i.get("severity") == "MAJOR")
            if crit >= 3:   return 2.0
            if crit >= 2:   return 3.0
            if crit >= 1:   return 4.0
            if major >= 4:  return 4.0
            if major >= 2:  return 5.0
            if major >= 1:  return 6.0
            return 7.0

        scores["writing_quality"] = _severity_score(result.get("writing_issues") or [])
        scores["scope_clarity"]   = _severity_score(result.get("scope_clarity_issues") or [])

        # ── client_coverage: gap count / severity ─────────────────────────────
        gaps = result.get("client_specific_gaps") or []
        if not gaps:
            scores["client_coverage"] = 5.0  # neutral when industry not assessed
        else:
            crit_gaps  = sum(1 for g in gaps if g.get("severity") == "CRITICAL")
            major_gaps = sum(1 for g in gaps if g.get("severity") == "MAJOR")
            if crit_gaps >= 2 or major_gaps >= 4:
                scores["client_coverage"] = 3.0
            elif crit_gaps == 1 or major_gaps >= 2:
                scores["client_coverage"] = 5.0
            else:
                scores["client_coverage"] = 7.0

        scores["_scores_recovered_from_evidence"] = True
        cap_applied = True

    # Rule 1: section_completeness cap
    if mandatory_missing_count >= 3 and scores.get("section_completeness", 0.0) > 4.0:
        scores["section_completeness"] = 4.0
        cap_applied = True

    # Rule 2: scope_clarity cap
    if has_critical_scope and scores.get("scope_clarity", 0.0) > 4.0:
        scores["scope_clarity"] = 4.0
        cap_applied = True

    # Recompute overall whenever any cap fired
    if cap_applied:
        weights = scores.get("weights", {})
        w_sc = weights.get("section_completeness", 0.40)
        w_wq = weights.get("writing_quality",      0.20)
        w_so = weights.get("scope_clarity",         0.25)
        w_cc = weights.get("client_coverage",       0.15)

        recomputed = (
            scores.get("section_completeness", 0.0) * w_sc
            + scores.get("writing_quality",    0.0) * w_wq
            + scores.get("scope_clarity",      0.0) * w_so
            + scores.get("client_coverage",    0.0) * w_cc
        )
        # Rule 3: graduated CRITICAL penalty — avoids cliff-edge at count=3
        total_critical = mandatory_missing_count + (1 if has_critical_scope else 0)
        recomputed = max(0.0, recomputed - _critical_deduction(total_critical))
        scores["overall"] = round(recomputed, 1)

    # Guarantee overall is always present — LLM occasionally omits it
    if "overall" not in scores:
        weights = scores.get("weights", {})
        w_sc = weights.get("section_completeness", 0.40)
        w_wq = weights.get("writing_quality",      0.20)
        w_so = weights.get("scope_clarity",         0.25)
        w_cc = weights.get("client_coverage",       0.15)
        scores["overall"] = round(
            scores.get("section_completeness", 0.0) * w_sc
            + scores.get("writing_quality",    0.0) * w_wq
            + scores.get("scope_clarity",      0.0) * w_so
            + scores.get("client_coverage",    0.0) * w_cc,
            1,
        )

    # Diagnostic fields so Agent 4 can surface them
    scores["mandatory_missing_count"] = mandatory_missing_count
    scores["has_critical_scope_issue"] = has_critical_scope
    scores["p06_status"] = p06_status
    result["scores"] = scores
    return result


# ── Entry Point ───────────────────────────────────────────────────────────────

def run(
    pdf_bytes: bytes,
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
    file_type: str = "pdf",
    pre_processed_context: str = None,
    emit=None,
) -> dict:
    """
    Runs Agent 1 analysis on a proposal.

    For documents within the page threshold (<=30 pages), pdf_bytes is sent
    directly to Bedrock as a document block (existing behaviour).

    For large documents (>30 pages), the chunking pipeline pre-processes the
    file into a unified context JSON and passes it here as pre_processed_context.
    In that case pdf_bytes is ignored and the context JSON is sent as text.

    Args:
        pdf_bytes:              Raw bytes of the proposal file.
        client_industry:        List of selected industries.
        proposal_type:          Type of proposal (e.g. "Fixed Price").
        client_priorities:      List of client priorities.
        file_type:              'pdf', 'pptx', or 'ppt'.
        pre_processed_context:  Merged chunk-summary JSON string from chunking_service.
                                When set, overrides the raw-file path.
        emit:                   Optional callable emit(activity, status) for the live feed.

    Returns:
        Parsed dict matching the Agent 1 output JSON schema.
    """
    _e = emit if emit else (lambda a, s="running": None)

    reset_token_accumulator()

    _e("Document received", "completed")
    doc_label = "pre-processed context" if pre_processed_context else file_type.upper()
    _e(f"Loaded {doc_label} for completeness review")
    _e("Running section completeness audit (22 checklist items)")
    _e("Checking writing quality & filler phrases")
    _e("Evaluating scope clarity & assumptions")
    _e("Identifying industry-specific gaps")
    _e("Checking jargon density")
    _e("Generating rewrite suggestions")

    system_prompt = compose_system_prompt(client_industry, proposal_type, client_priorities)
    user_message = build_user_message(client_industry, proposal_type, client_priorities)

    if pre_processed_context:
        result = invoke_agent_with_context_json(
            system_prompt=system_prompt,
            user_message=user_message,
            context_json=pre_processed_context,
        )
    else:
        result = invoke_agent_with_pdf(
            system_prompt=system_prompt,
            user_message=user_message,
            pdf_bytes=pdf_bytes,
            file_type=file_type,
        )

    final = _apply_score_caps(result)
    token_usage = get_accumulated_tokens()
    score = final.get("scores", {}).get("overall", "?")
    _e(f"Completeness review done — score: {score}/10", "completed")
    return final, token_usage
