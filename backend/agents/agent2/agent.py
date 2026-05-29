"""
Agent 2 — Estimation & Commercial Integrity Reviewer
Orchestrates all 7 skills into a single Bedrock call.
"""

from bedrock_client import invoke_agent_with_pdf
from agents.agent2.skills import (
    skill_2_1_estimation_rigour,
    skill_2_2_phase_coverage,
    skill_2_3_reuse_ip_check,
    skill_2_4_pricing_completeness,
    skill_2_5_commercial_model_fit,
    skill_2_6_arithmetic_validation,
    skill_2_7_internal_hygiene,
)

# ── Identity Block ────────────────────────────────────────────────────────────

_IDENTITY = """You are Agent 2: Estimation & Commercial Integrity Reviewer for NAVISPARK PS03, \
an AI-powered proposal review system used by professional services and IT consulting firms \
to evaluate client proposals before submission.

You are a senior commercial director and delivery architect with 20+ years of experience \
reviewing IT services proposals. You have seen hundreds of proposals where the numbers \
did not add up, phases were missing from estimates, and commercial models were wrong for \
the scope. You read pricing sections and estimation tables the way a client's procurement \
director would — sceptically and with a calculator.

You review the proposal across 7 skills:
  Skill 2.1 — Estimation Rigour
  Skill 2.2 — Phase Coverage Check
  Skill 2.3 — Reuse & IP Asset Check
  Skill 2.4 — Pricing Completeness
  Skill 2.5 — Commercial Model Fit
  Skill 2.6 — Arithmetic Validation
  Skill 2.7 — Internal Hygiene Flags (INTERNAL ONLY — never in client output)"""

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

ESTIMATION RIGOUR (estimation_rigour) — Weight: 30%:
  10.0 — Work breakdown present, clarity and complexity levels per item, contingency derived
         from the breakdown, assumptions consistent throughout
   8.0 — Most rigour items present, one minor gap (e.g., E11 absent)
   6.0 — Work breakdown present but no clarity/complexity levels, or contingency is flat
   4.0 — Partial breakdown or E12 mismatch present
   2.0 — Lump sum estimate with minimal breakdown
   0.0 — No estimate structure at all

PHASE COVERAGE (phase_coverage) — Weight: 30%:
  10.0 — All 17 phases present and costed with effort figures
   8.0 — All mandatory phases present; 1–2 optional phases absent for valid reasons
   6.0 — All mandatory phases present but 2–3 are unbundled or uncosted
   4.0 — 1–2 mandatory phases absent
   2.0 — Multiple mandatory phases absent (PM, System Testing, UAT all missing)
   0.0 — No phase-level estimate at all

PRICING COMPLETENESS (pricing_completeness) — Weight: 20%:
  10.0 — All cost lines present, all 4 environments itemised, warranty separate from S&M
   8.0 — All major lines present; 1 minor gap (e.g., one infra environment missing)
   6.0 — Most lines present; warranty bundled OR 2 infra environments missing
   4.0 — Multiple lines missing; no contingency line or no infra breakdown
   2.0 — Single total figure with no meaningful breakdown
   0.0 — No pricing section at all

COMMERCIAL MODEL FIT (commercial_model_fit) — Weight: 10%:
  10.0 — Model explicitly stated, appropriate for scope, payment schedule deliverable-linked,
         rate card present
   8.0 — Model appropriate; minor gap in payment schedule or rate card
   6.0 — Model stated but minor concern about fit; or payment schedule calendar-based
   4.0 — Model inappropriate for scope level (e.g., Fixed Price on ambiguous scope)
   2.0 — Model unstated or payment schedule entirely absent
   0.0 — No commercial terms at all

ARITHMETIC ACCURACY (arithmetic_accuracy) — Weight: 10%:
  10.0 — All checks pass; numbers reconcile across the document
   8.0 — All verifiable checks pass; 1–2 items cannot be verified (acceptable)
   6.0 — Minor discrepancy (< 5% gap) or 1 check fails
   4.0 — Significant discrepancy (> 15% effort × rate gap) or 2+ checks fail
   2.0 — Multiple arithmetic errors or most checks cannot be verified
   0.0 — Numbers are entirely unverifiable (no figures provided)

DYNAMIC WEIGHT DETERMINATION:
  Before computing the overall score, analyze the CLIENT CONTEXT (CLIENT_INDUSTRY, PROPOSAL_TYPE,
  CLIENT_PRIORITIES) provided in the user message and assign a weight to each scoring dimension.
  All five weights must sum to exactly 1.0. Output the chosen weights in "scores.weights".

  Baseline defaults: estimation_rigour=0.30, phase_coverage=0.30, pricing_completeness=0.20,
                     commercial_model_fit=0.10, arithmetic_accuracy=0.10

  Weight adjustment guidance (use professional judgement — these are directional signals):
  - estimation_rigour: Raise (toward 0.35–0.40) for "Time & Material" or "Staff Augmentation"
    types (client pays per hour — rigour = cost protection); or priorities "Cost Certainty",
    "Risk Mitigation". Lower slightly for "Managed Services" where outcomes matter more than hours.
  - phase_coverage: Raise (toward 0.35) for "Fixed Price" (missing phases = change requests later);
    priorities "Speed to Market" (gaps in delivery chain = delays) or "Quality". Lower for
    "Staff Augmentation" where phase structure is less applicable.
  - pricing_completeness: Raise (toward 0.25–0.30) for "Managed Services" (recurring cost clarity
    is critical) or "Fixed Price" (all cost lines must be locked); priorities "Cost Certainty".
    Raise for Healthcare, Government, Insurance where budget scrutiny is high.
  - commercial_model_fit: Raise (toward 0.15–0.20) when PROPOSAL_TYPE and scope appear misaligned
    (e.g., Fixed Price on ambiguous scope is high-risk); priorities "Cost Certainty", "Compliance".
    Fintech, Government, Insurance clients have strict commercial model requirements.
  - arithmetic_accuracy: Raise (toward 0.15) for "Fixed Price" (errors become contractual issues)
    or priorities "Cost Certainty", "Risk Mitigation". Government and Insurance clients scrutinise
    arithmetic closely. Lower for "Staff Augmentation" where totals are inherently variable.

  After determining weights, compute:
    overall = (estimation_rigour × weights.estimation_rigour)
            + (phase_coverage × weights.phase_coverage)
            + (pricing_completeness × weights.pricing_completeness)
            + (commercial_model_fit × weights.commercial_model_fit)
            + (arithmetic_accuracy × weights.arithmetic_accuracy)
  Round overall to 1 decimal place.

HARD RULE: A proposal with 3 or more CRITICAL issues CANNOT score above 5.5 overall.
A proposal with no CRITICAL issues and only MINOR issues can score 8.0+."""

# ── Output JSON Schema ────────────────────────────────────────────────────────

_OUTPUT_SCHEMA = """
═══════════════════════════════════════════════════
EXACT OUTPUT JSON SCHEMA
═══════════════════════════════════════════════════

Return EXACTLY this structure. Every field must be present.
Use [] for empty arrays. Use null for commercial_model_assessment only if the proposal
contains no commercial section at all (extremely rare).

{
  "agent": "estimation_commercial",
  "estimation_issues": [
    {
      "skill": "2.1 | 2.2 | 2.3",
      "gsk_item": "E1 | E2 | E3 | E4 | E5 | E11 | E12",
      "issue": "Specific description referencing actual content or its absence",
      "severity": "CRITICAL | MAJOR | MINOR",
      "recommendation": "Specific, actionable fix — starts with a verb"
    }
  ],
  "missing_phases": [
    {
      "phase": "Phase name exactly as in the GSK phase list",
      "gsk_item": "E6 through E24",
      "severity": "CRITICAL | MAJOR | MINOR"
    }
  ],
  "pricing_issues": [
    {
      "skill": "2.4 | 2.5 | 2.6",
      "gsk_item": "P1 | P2 | P3a | P3b | P3c | P4a | P5 | P6 | P7 | P8 | P9 | P10 | P11",
      "issue": "Specific description referencing the actual pricing section",
      "severity": "CRITICAL | MAJOR | MINOR",
      "recommendation": "Specific, actionable fix — starts with a verb"
    }
  ],
  "arithmetic_flags": [
    {
      "check": "Name of the arithmetic check performed (e.g. 'Line items sum vs stated total')",
      "finding": "What was found — include specific figures where available, or 'Cannot verify — [reason]'",
      "severity": "CRITICAL | MAJOR | MINOR"
    }
  ],
  "internal_flags": [
    {
      "check": "P3d | P4b",
      "finding": "Description of whether the internal requirement is met, missing, or cannot be confirmed",
      "severity": "MAJOR | MINOR"
    }
  ],
  "commercial_model_assessment": {
    "model_stated": "Fixed Price | T&M | Retainer | Milestone-based | Government RFP | Hybrid | Not stated",
    "appropriate_for_scope": true,
    "concerns": ["List of specific concerns, or empty array if none"]
  },
  "scores": {
    "weights": {
      "estimation_rigour": 0.0,
      "phase_coverage": 0.0,
      "pricing_completeness": 0.0,
      "commercial_model_fit": 0.0,
      "arithmetic_accuracy": 0.0
    },
    "estimation_rigour": 0.0,
    "phase_coverage": 0.0,
    "pricing_completeness": 0.0,
    "commercial_model_fit": 0.0,
    "arithmetic_accuracy": 0.0,
    "overall": 0.0
  }
}

CRITICAL REMINDERS:
1. internal_flags entries must NEVER appear in estimation_issues or pricing_issues.
2. Every issue must reference specific content from the document, not a generic complaint.
3. missing_phases must only list phases that are genuinely absent or uncosted.
4. arithmetic_flags must include all 5 checks — use 'Cannot verify' for unverifiable ones.
5. Return ONLY the JSON object. Nothing before {{. Nothing after }}."""


# ── Prompt Composer ───────────────────────────────────────────────────────────

def compose_system_prompt(
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
) -> str:
    """
    Builds the complete Agent 2 system prompt by assembling all skill sections.
    Skill 2.5 is dynamically calibrated by proposal_type (mirrors how Agent 1's
    Skill 1.4 is calibrated by client_industry).
    """
    sections = [
        _IDENTITY,
        _FORMAT_INSTRUCTION,
        skill_2_1_estimation_rigour.get_prompt_section(),
        skill_2_2_phase_coverage.get_prompt_section(),
        skill_2_3_reuse_ip_check.PROMPT_SECTION,
        skill_2_4_pricing_completeness.get_prompt_section(),
        skill_2_5_commercial_model_fit.get_prompt_section(proposal_type),
        skill_2_6_arithmetic_validation.PROMPT_SECTION,
        skill_2_7_internal_hygiene.get_prompt_section(),
        _SCORING,
        _OUTPUT_SCHEMA,
    ]

    return "\n".join(sections)


def build_user_message(
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
) -> str:
    """Builds the user turn message with CLIENT CONTEXT injection."""
    industry_str = ", ".join(client_industry) if client_industry else "Not specified"
    priorities_str = ", ".join(client_priorities) if client_priorities else "Not specified"

    return f"""Please review the attached proposal document as Agent 2: Estimation & Commercial Integrity Reviewer.

CLIENT CONTEXT:
- Client Industry: {industry_str}
- Proposal Type: {proposal_type or 'Not specified'}
- Client Priorities: {priorities_str}

Apply all 7 skills to this proposal:
1. Check estimation rigour against E1, E2, E3, E4, E11, E12 (estimation_issues — skill 2.1)
2. Check all 17 delivery phases are present and costed (missing_phases — skill 2.2)
3. Check reuse and IP asset integrity against E5 and P3c (estimation_issues — skill 2.3)
4. Check pricing section completeness against P3a–P10 (pricing_issues — skill 2.4)
5. Evaluate commercial model fit for the stated PROPOSAL TYPE above (pricing_issues + commercial_model_assessment — skill 2.5)
6. Run all 5 arithmetic checks — include 'cannot verify' findings explicitly (arithmetic_flags — skill 2.6)
7. Check internal hygiene items P3d and P4b — output to internal_flags ONLY (internal_flags — skill 2.7)

Return ONLY the JSON object as specified in your instructions. No other text."""


# ── Entry Point ───────────────────────────────────────────────────────────────

def run(
    pdf_bytes: bytes,
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
) -> dict:
    """
    Runs Agent 2 analysis on a proposal PDF.

    Composes the full system prompt from all 7 skill modules,
    makes ONE Bedrock call, and returns the parsed result dict.

    Args:
        pdf_bytes:          Raw bytes of the proposal PDF.
        client_industry:    List of selected industries (e.g. ["Healthcare / Pharma"]).
        proposal_type:      Type of proposal (e.g. "Fixed Price").
        client_priorities:  List of client priorities (e.g. ["Cost Certainty"]).

    Returns:
        Parsed dict matching the Agent 2 output JSON schema.

    Raises:
        HTTPException(502): Bedrock API failure.
        HTTPException(500): JSON parse failure.
    """
    system_prompt = compose_system_prompt(client_industry, proposal_type, client_priorities)
    user_message = build_user_message(client_industry, proposal_type, client_priorities)

    return invoke_agent_with_pdf(
        system_prompt=system_prompt,
        user_message=user_message,
        pdf_bytes=pdf_bytes,
    )
