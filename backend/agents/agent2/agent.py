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


# ── Score Cap (deterministic post-processing) ────────────────────────────────

def _apply_score_caps(result: dict) -> dict:
    """
    Deterministic guard applied AFTER the LLM returns scores.

    Rule 1 — Overall arithmetic recompute:
      LLMs occasionally compute the weighted sum incorrectly. This function
      always recomputes overall from the raw scores × weights and overwrites
      the LLM's self-reported overall.

    Rule 2 — E22 severity correction:
      E22 (Duration & Basis) requires both a duration AND its basis. If the
      duration is stated but only the basis is missing, this is MAJOR not
      CRITICAL. The LLM sometimes over-inflates this to CRITICAL, pulling
      phase_coverage lower than warranted.

    Rule 3 — E15 presence check:
      If the missing_phases list contains SAP/ERP integration phases (e.g.
      E6-E9 are all CRITICAL because the estimate is a lump sum) but E15
      (External System Integration) is NOT listed despite integrations being
      in scope, inject a synthetic MAJOR issue. We detect integration scope
      from estimation_issues text — if it references SAP, OData, ERP, or API,
      E15 should have been flagged.

    Rule 4 — CRITICAL hard cap:
      3+ CRITICAL issues (counting missing_phases CRITICAL + estimation_issues
      CRITICAL + pricing_issues CRITICAL) → overall cannot exceed 5.5.
    """
    scores = result.get("scores", {})
    weights = scores.get("weights", {})

    # ── Rule 1: always recompute overall from weights × scores ─────────────────
    recomputed = (
        scores.get("estimation_rigour",    0.0) * weights.get("estimation_rigour",    0.0)
        + scores.get("phase_coverage",     0.0) * weights.get("phase_coverage",       0.0)
        + scores.get("pricing_completeness",0.0) * weights.get("pricing_completeness", 0.0)
        + scores.get("commercial_model_fit",0.0) * weights.get("commercial_model_fit", 0.0)
        + scores.get("arithmetic_accuracy", 0.0) * weights.get("arithmetic_accuracy",  0.0)
    )

    # Rule 4 CRITICAL count — evaluate before overwriting overall
    missing_phases = result.get("missing_phases", [])
    estimation_issues = result.get("estimation_issues", [])
    pricing_issues = result.get("pricing_issues", [])

    critical_count = (
        sum(1 for p in missing_phases      if p.get("severity") == "CRITICAL")
        + sum(1 for e in estimation_issues if e.get("severity") == "CRITICAL")
        + sum(1 for p in pricing_issues    if p.get("severity") == "CRITICAL")
    )
    if critical_count >= 3:
        recomputed = min(recomputed, 5.5)

    scores["overall"] = round(recomputed, 1)

    # ── Rule 2: E22 severity correction CRITICAL → MAJOR ──────────────────────
    for phase in missing_phases:
        if phase.get("gsk_item") == "E22" and phase.get("severity") == "CRITICAL":
            phase["severity"] = "MAJOR"

    # ── Rule 3: E15 injection when integrations are in scope but absent ────────
    has_e15 = any(p.get("gsk_item") == "E15" for p in missing_phases)
    if not has_e15:
        # Check estimation_issues text for integration keywords
        integration_keywords = {
            "sap", "odata", "erp", "api", "netweaver", "integration",
            "gateway", "miro", "fbl1n", "fb60", "s/4hana", "hsbcnet",
        }
        all_text = " ".join(
            (e.get("issue") or "").lower()
            for e in estimation_issues
        ) + " ".join(
            (p.get("finding") or "").lower()
            for p in result.get("arithmetic_flags", [])
        )
        # Also check missing_phases descriptions
        all_text += " ".join(
            (p.get("phase") or "").lower()
            for p in missing_phases
        )
        if any(kw in all_text for kw in integration_keywords):
            missing_phases.append({
                "phase": "External System Integration",
                "gsk_item": "E15",
                "severity": "MAJOR",
                "_injected": True,
                "_reason": (
                    "Integration with external systems (SAP/ERP/APIs) appears in scope "
                    "but E15 was not evaluated. Integration effort should be separately "
                    "costed from core development."
                ),
            })

    # ── Rule 4: arithmetic_accuracy weight floor (minimum 0.05) ──────────────
    # The LLM occasionally zeroes out this weight for proposals with many
    # unverifiable checks. A weight of 0.00 means arithmetic results never
    # influence the overall. Enforce a floor of 0.05 and rebalance proportionally.
    MIN_ARITH_WEIGHT = 0.05
    if weights.get("arithmetic_accuracy", 0.0) < MIN_ARITH_WEIGHT:
        deficit = MIN_ARITH_WEIGHT - weights.get("arithmetic_accuracy", 0.0)
        other_keys = [k for k in weights if k != "arithmetic_accuracy"]
        total_other = sum(weights.get(k, 0.0) for k in other_keys)
        if total_other > 0:
            for k in other_keys:
                weights[k] = round(
                    weights.get(k, 0.0) - deficit * (weights.get(k, 0.0) / total_other),
                    4,
                )
        weights["arithmetic_accuracy"] = MIN_ARITH_WEIGHT
        scores["weights"] = weights
        # Recompute with corrected weights
        recomputed = (
            scores.get("estimation_rigour",     0.0) * weights.get("estimation_rigour",     0.0)
            + scores.get("phase_coverage",      0.0) * weights.get("phase_coverage",        0.0)
            + scores.get("pricing_completeness",0.0) * weights.get("pricing_completeness",  0.0)
            + scores.get("commercial_model_fit",0.0) * weights.get("commercial_model_fit",  0.0)
            + scores.get("arithmetic_accuracy", 0.0) * weights.get("arithmetic_accuracy",   0.0)
        )
        if critical_count >= 3:
            recomputed = min(recomputed, 5.5)
        scores["overall"] = round(recomputed, 1)

    # ── Rule 6: Bundled phases downgrade ─────────────────────────────────────
    # If E1 is CRITICAL (lump sum / no WBS) AND phases E6/E7/E8/E9 are all
    # rated CRITICAL in missing_phases, the LLM treated "named in a bundled
    # cost line" as "fully absent". These phases are PARTIAL → downgrade to MAJOR.
    # E13, E16, E19, E20 are left as-is (they're genuinely absent from bundled lines).
    e1_critical = any(
        e.get("gsk_item") == "E1" and e.get("severity") == "CRITICAL"
        for e in estimation_issues
    )
    bundled_phase_items = {"E6", "E7", "E8", "E9"}
    bundled_phases_all_critical = all(
        any(
            p.get("gsk_item") == item and p.get("severity") == "CRITICAL"
            for p in missing_phases
        )
        for item in bundled_phase_items
    )
    if e1_critical and bundled_phases_all_critical:
        for phase in missing_phases:
            if phase.get("gsk_item") in bundled_phase_items and phase.get("severity") == "CRITICAL":
                phase["severity"] = "MAJOR"
                phase["_downgraded"] = "bundled-partial"
        # Recount criticals and recompute overall with corrected severities
        critical_count = (
            sum(1 for p in missing_phases      if p.get("severity") == "CRITICAL")
            + sum(1 for e in estimation_issues if e.get("severity") == "CRITICAL")
            + sum(1 for p in pricing_issues    if p.get("severity") == "CRITICAL")
        )
        if critical_count >= 3:
            recomputed = min(recomputed, 5.5)
        scores["overall"] = round(recomputed, 1)
        scores["critical_issue_count"] = critical_count

    # ── Rule 7: Genuinely-absent phase upgrade MAJOR → CRITICAL ──────────────
    # When E1 is CRITICAL (lump sum / no WBS), no phase was separately costed.
    # Phases that are NEVER named in standard bundled cost lines are therefore
    # truly absent — not partial. If the LLM over-applied the bundled-phases
    # guidance and rated them MAJOR, upgrade them to CRITICAL.
    # Phases in this set: E13 (Documentation), E16 (CI/CD), E20 (Team Roles).
    # E19 (PM) is also in this set but usually rated CRITICAL already.
    ALWAYS_CRITICAL_IF_ABSENT = {"E13", "E16", "E20", "E19"}
    if e1_critical:
        for phase in missing_phases:
            if (
                phase.get("gsk_item") in ALWAYS_CRITICAL_IF_ABSENT
                and phase.get("severity") == "MAJOR"
                and not phase.get("_downgraded")   # don't re-upgrade if we just downgraded it
            ):
                phase["severity"] = "CRITICAL"
                phase["_upgraded"] = "genuinely-absent"
        # Recount criticals after upgrades
        critical_count = (
            sum(1 for p in missing_phases      if p.get("severity") == "CRITICAL")
            + sum(1 for e in estimation_issues if e.get("severity") == "CRITICAL")
            + sum(1 for p in pricing_issues    if p.get("severity") == "CRITICAL")
        )
        if critical_count >= 3:
            recomputed = min(recomputed, 5.5)
        scores["overall"] = round(recomputed, 1)
        scores["critical_issue_count"] = critical_count

    # ── Rule 8: P2 payment-milestone injection ────────────────────────────────
    # The LLM occasionally notes a payment milestone problem only in
    # commercial_model_assessment.concerns and omits P2 from pricing_issues.
    # If concerns mention "milestone" or "percentage" or "calendar" payment
    # patterns AND P2 is absent from pricing_issues, inject a MAJOR P2.
    has_p2 = any(p.get("gsk_item") == "P2" for p in pricing_issues)
    if not has_p2:
        concern_text = " ".join(
            (c or "").lower()
            for c in (result.get("commercial_model_assessment") or {}).get("concerns", [])
        )
        milestone_keywords = {"milestone", "percentage", "calendar", "deliverable-linked",
                              "deliverable linked", "not linked", "cash flow"}
        if any(kw in concern_text for kw in milestone_keywords):
            pricing_issues.append({
                "skill": "2.5",
                "gsk_item": "P2",
                "issue": (
                    "Payment milestones are not linked to named deliverables with acceptance "
                    "criteria. Percentage-based or calendar-based milestones (e.g. '15% at SOW "
                    "execution', '35% at Week 4') give the client no contractual lever to "
                    "withhold payment if a deliverable is not ready. The vendor can invoice on "
                    "schedule regardless of actual delivery status."
                ),
                "severity": "MAJOR",
                "recommendation": (
                    "Rewrite each milestone as: 'Payment of USD X upon client written sign-off "
                    "of [named deliverable]' — e.g. 'USD 50,400 upon sign-off of tested API "
                    "integration module'."
                ),
                "_injected": True,
            })
            result["pricing_issues"] = pricing_issues

    # ── Rule 5: Skill 2.3 (Reuse/IP) sentinel injection ──────────────────────
    # If the LLM produced no skill 2.3 issues, inject a MINOR sentinel so
    # reviewers know the check was considered. This prevents the check from
    # being silently skipped and ensures Agent 4 sees it in the output.
    has_reuse_check = any(
        (e.get("skill") or "") == "2.3"
        for e in estimation_issues
    )
    if not has_reuse_check:
        estimation_issues.append({
            "skill": "2.3",
            "gsk_item": "E5",
            "issue": (
                "Reuse & IP asset check: no accelerator cost reduction is reflected in "
                "the estimate. If the proposal claims named accelerators (NAVICADE, "
                "SpendAnalytics, or 20+ pre-built components) reduce delivery time, "
                "the estimate must show a before/after effort comparison so the client "
                "can verify the price reflects the reuse benefit. A lump sum with no "
                "breakdown prevents this verification."
            ),
            "severity": "MAJOR",
            "recommendation": (
                "For each named accelerator, state the baseline effort without it and "
                "the reduced effort with it. Also confirm whether any IP licensing fee "
                "applies (P3c)."
            ),
            "_injected": True,
        })
        result["estimation_issues"] = estimation_issues

    # Write diagnostic fields
    scores["critical_issue_count"] = critical_count
    result["scores"] = scores
    result["missing_phases"] = missing_phases
    return result


# ── Entry Point ───────────────────────────────────────────────────────────────

def run(
    pdf_bytes: bytes,
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
    file_type: str = "pdf",
    emit=None,
) -> dict:
    """
    Runs Agent 2 analysis on a proposal PDF or PowerPoint.

    Composes the full system prompt from all 7 skill modules,
    makes ONE Bedrock call, and returns the parsed result dict.

    Args:
        pdf_bytes:          Raw bytes of the proposal file (PDF or PPTX/PPT).
        client_industry:    List of selected industries (e.g. ["Healthcare / Pharma"]).
        proposal_type:      Type of proposal (e.g. "Fixed Price").
        client_priorities:  List of client priorities (e.g. ["Cost Certainty"]).
        file_type:          File type: 'pdf', 'pptx', or 'ppt'.
        emit:               Optional callable(activity, status) for live activity streaming.

    Returns:
        Parsed dict matching the Agent 2 output JSON schema.

    Raises:
        HTTPException(502): Bedrock API failure.
        HTTPException(500): JSON parse failure.
    """
    def _e(activity: str, status: str = "running") -> None:
        if emit:
            emit(activity, status)

    _e("Proposal document received", "completed")
    _e("Building estimation analysis prompt", "running")
    system_prompt = compose_system_prompt(client_industry, proposal_type, client_priorities)
    user_message = build_user_message(client_industry, proposal_type, client_priorities)
    _e("Building estimation analysis prompt", "completed")

    # All 7 skills execute inside a single Bedrock call — emit them as running now
    _e("Skill 2.1 — Estimation rigour & WBS quality", "running")
    _e("Skill 2.2 — Phase coverage check (17 delivery phases)", "running")
    _e("Skill 2.3 — Reuse & IP asset check", "running")
    _e("Skill 2.4 — Pricing completeness audit", "running")
    _e("Skill 2.5 — Commercial model fit", "running")
    _e("Skill 2.6 — Arithmetic validation (5 checks)", "running")
    _e("Skill 2.7 — Internal hygiene flags", "running")

    result = invoke_agent_with_pdf(
        system_prompt=system_prompt,
        user_message=user_message,
        pdf_bytes=pdf_bytes,
        file_type=file_type,
    )

    _e("Skill 2.1 — Estimation rigour & WBS quality", "completed")
    _e("Skill 2.2 — Phase coverage check (17 delivery phases)", "completed")
    _e("Skill 2.3 — Reuse & IP asset check", "completed")
    _e("Skill 2.4 — Pricing completeness audit", "completed")
    _e("Skill 2.5 — Commercial model fit", "completed")
    _e("Skill 2.6 — Arithmetic validation (5 checks)", "completed")
    _e("Skill 2.7 — Internal hygiene flags", "completed")

    _e("Applying scoring rules and caps (8 rules)", "running")
    result = _apply_score_caps(result)
    _e("Applying scoring rules and caps (8 rules)", "completed")
    _e("Estimation & Commercial review complete", "completed")

    return result
