"""
Agent 1 — Completeness & Clarity Reviewer
Orchestrates all 6 skills into a single Bedrock call.
"""

from bedrock_client import invoke_agent_with_pdf
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

HARD RULE: A proposal with 3 or more CRITICAL issues CANNOT score above 5.5 overall.
A proposal with no CRITICAL issues and only MINOR issues can score 8.0+."""

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

    scores = result.get("scores", {})
    cap_applied = False

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
        # Rule 3: hard cap when total CRITICAL issues ≥ 3
        total_critical = mandatory_missing_count + (1 if has_critical_scope else 0)
        if total_critical >= 3:
            recomputed = min(recomputed, 5.5)
        scores["overall"] = round(recomputed, 1)

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
) -> dict:
    """
    Runs Agent 1 analysis on a proposal PDF.

    Composes the full system prompt from all skill modules,
    makes ONE Bedrock call, and returns the parsed result dict.

    Args:
        pdf_bytes:          Raw bytes of the proposal PDF.
        client_industry:    List of selected industries (e.g. ["Healthcare / Pharma"]).
        proposal_type:      Type of proposal (e.g. "Fixed Price").
        client_priorities:  List of client priorities (e.g. ["Cost Certainty"]).

    Returns:
        Parsed dict matching the Agent 1 output JSON schema.

    Raises:
        HTTPException(502): Bedrock API failure.
        HTTPException(500): JSON parse failure.
    """
    system_prompt = compose_system_prompt(client_industry, proposal_type, client_priorities)
    user_message = build_user_message(client_industry, proposal_type, client_priorities)

    result = invoke_agent_with_pdf(
        system_prompt=system_prompt,
        user_message=user_message,
        pdf_bytes=pdf_bytes,
        file_type=file_type,
    )
    return _apply_score_caps(result)
