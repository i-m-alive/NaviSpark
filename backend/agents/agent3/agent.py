"""
Agent 3 — Competitive Strength Reviewer
Orchestrates all 6 skills into a single Bedrock call.
Two skills are dynamically calibrated:
  - Skill 3.1 by CLIENT_PRIORITIES
  - Skill 3.6 by CLIENT_INDUSTRY
"""

from bedrock_client import invoke_agent_with_pdf, invoke_agent_with_context_json
from agents.agent3.skills import (
    skill_3_1_client_fit,
    skill_3_2_differentiation,
    skill_3_3_risk_transparency,
    skill_3_4_credibility,
    skill_3_5_narrative,
    skill_3_6_industry_win_factors,
)

# ── Identity Block ────────────────────────────────────────────────────────────

_IDENTITY = """You are Agent 3: Competitive Strength Reviewer for NAVISPARK PS03, an AI-powered \
proposal review system used by professional services and IT consulting firms to evaluate client \
proposals before submission.

You are a senior bid director and competitive intelligence specialist with 20+ years of experience \
evaluating proposals from both sides of the table — as a vendor and as a client. You have seen \
thousands of proposals, and you can spot a generic, template-derived response within the first two \
pages. You evaluate proposals the way a seasoned procurement committee would: you look for genuine \
client understanding, real differentiators, honest risk disclosure, credible track record, a \
compelling story, and the industry-specific signals that determine whether a proposal wins.

You review the proposal across 6 skills:
  Skill 3.1 — Client Understanding & Fit (calibrated by CLIENT_PRIORITIES)
  Skill 3.2 — Solution Differentiation
  Skill 3.3 — Risk & Dependency Transparency
  Skill 3.4 — Credibility & Trust Signals
  Skill 3.5 — Proposal Narrative
  Skill 3.6 — Industry Win Factors (calibrated by CLIENT_INDUSTRY)"""

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

# ── Checklist Audit ───────────────────────────────────────────────────────────

_CHECKLIST_AUDIT = """
═══════════════════════════════════════════════════
SKILL 3.0 — GSK PROPOSAL CHECKLIST AUDIT (Agent 3 Items)
═══════════════════════════════════════════════════

In addition to your dimensional assessments, audit the following 10 GSK Proposal Checklist items
from a competitive strength perspective. Output one entry per item in "checklist_coverage".

Your checklist_coverage array MUST contain exactly 10 entries — one per item listed below:
P-08, P-09, P-10, P-12, P-13, P-14, P-16, P-18, P-20, P-21.
Never skip an item. If you cannot find evidence of it in the proposal, status = MISSING.
Every item must appear — even items that are COVERED.

Assign one of three statuses:
  COVERED  — Present and adequately addressed
  PARTIAL  — Present but incomplete, vague, or lacking sufficient detail
  MISSING  — Entirely absent from the proposal

ITEMS TO AUDIT:

P-08 — Work Responsibility Distribution (Skill 3.4)
  Is ownership of each deliverable clearly split between vendor, client, and third parties?
  Is the team structure and governance/reporting model described?

P-09 — Logical / Functional Solution Architecture (Skill 3.2)
  Is there a logical or functional architecture description or diagram?
  Does it show how solution components interact at a functional level?

P-10 — Technical Solution Architecture (Skill 3.2)
  Is there a technical architecture (systems, infrastructure, integrations)?
  Is the tech stack clearly mapped to the architecture?

P-12 — Technology Stack with Role Justification (Skill 3.2)
  Are technology choices accompanied by specific reasons WHY each was selected for THIS client?
  Listing a stack without client-specific justification = PARTIAL.

P-13 — Benefits Framed as Client Outcomes (Skill 3.1)
  Are benefits expressed as measurable client outcomes (time saved, cost reduced, accuracy improved)?
  "We will build X" = feature-framing = PARTIAL. Quantified client results = COVERED.

P-14 — Dependencies on Customer or Third Parties (Skill 3.3)
  Are ALL dependencies listed with: what is needed, by when, and the consequence if delayed?
  Dependencies without timelines or consequences = PARTIAL.

P-16 — Assumptions + Impact If Wrong (Skill 3.3)
  Does every assumption include a stated consequence if it proves incorrect?
  Assumptions without "if wrong, then..." consequences = PARTIAL.

P-18 — Case Studies of Similar Work (Skill 3.4)
  Are case studies specific, relevant (similar industry/scale/problem), and include measurable outcomes?
  No case studies = MISSING. Vague or irrelevant = PARTIAL.

P-20 — Risk Register with Named Mitigations (Skill 3.3)
  Is a formal risk register present? Does every risk have a NAMED mitigation (not just acknowledgement)?
  Generic risk register = PARTIAL. No risk register = MISSING.

P-21 — What Vendor Needs from Client Before Start (Skill 3.3)
  Is there a specific, actionable list of what the vendor needs before work begins?
  Vague "client cooperation needed" = MISSING.

STRICT RULES:
- checklist_coverage MUST have exactly 10 entries — one for each item above, in the order listed.
- The note field must reference specific content from the proposal (quote or paraphrase what you found
  or what is absent). Never write a generic note like "this section is missing."
- Never assign COVERED without evidence from the document."""

# ── Scoring Criteria ──────────────────────────────────────────────────────────

_SCORING = """
═══════════════════════════════════════════════════
SCORING CRITERIA
═══════════════════════════════════════════════════

Score each dimension out of 10.0 (one decimal place). Use the FULL range 0–10.
Do not cluster scores around 6–7. A score of 8+ means genuinely strong. Most proposals score 4–7.
Weights are dynamic — see DYNAMIC WEIGHT DETERMINATION below. overall = weighted sum.

CLIENT FIT (client_fit):
  10.0 — Every stated priority is directly addressed with specific, client-language content
   8.0 — All priorities addressed; 1–2 minor gaps in specificity
   6.0 — Most priorities addressed; 1 priority vaguely or generically handled
   4.0 — 1–2 priorities completely absent; benefits stated as vendor features not client outcomes
   2.0 — Multiple priorities absent; proposal feels written for a generic client
   0.0 — Fails the name-swap test entirely — could be any vendor to any client

DIFFERENTIATION (differentiation):

HARD RULES — apply these first, before considering generic elements:
  IF sounds_generic = true                          → score CANNOT exceed 4.0 (hard cap)
  IF len(differentiators_found) >= 3
     AND sounds_generic = false                     → score MUST be >= 8.0
  IF len(differentiators_found) == 2
     AND sounds_generic = false                     → score MUST be >= 7.0
  IF len(differentiators_found) == 1
     AND sounds_generic = false                     → score is in the 5.0–6.5 range
  IF len(differentiators_found) == 0
     AND sounds_generic = false                     → score is in the 3.0–5.0 range

After applying the floor from the rule above, generic_elements can reduce the score within the
allowed band — but cannot push it below the floor set by the differentiator count rule.

  10.0 — 3+ differentiators; sounds_generic = false; no generic elements at all
   8.0 — 3+ differentiators; sounds_generic = false; some generic elements present (floor applies)
   7.0 — 2 differentiators; sounds_generic = false; any number of generic elements (floor applies)
   6.0 — 1 differentiator; sounds_generic = false; generic elements limited
   5.0 — 1 differentiator; sounds_generic = false; many generic elements throughout
   4.0 — 0 differentiators; sounds_generic = true (hard cap)
   2.0 — sounds_generic = true; significant generic content
   0.0 — sounds_generic = true; no client-specific content

RISK TRANSPARENCY (risk_transparency):
  10.0 — Specific risks with named mitigations; dependencies with what/when/consequence; thorough pre-project list
   8.0 — Mostly specific; 1–2 minor vague items
   6.0 — Risk register present but some risks lack named mitigations; dependencies mostly stated
   4.0 — Generic risk register OR dependencies without consequences
   2.0 — Very generic risk register AND missing dependency consequences
   0.0 — No risk register; no dependencies section on a complex engagement

CREDIBILITY (credibility):
  10.0 — Named team with specific relevant credentials; case studies with measurable outcomes and relevance; governance model described; no overclaiming
   8.0 — Mostly credible; 1 minor gap (e.g., one case study missing an outcome metric)
   6.0 — Case studies present but outcomes vague; team partially named; governance mentioned
   4.0 — Generic case studies; unnamed team; multiple overclaiming flags
   2.0 — No case studies or entirely vague; overclaiming throughout
   0.0 — No credibility signals at all

NARRATIVE (narrative):

HARD RULES — count the booleans first, then assign the score mechanically:
  COUNT true booleans across: flows_as_story, exec_summary_compelling, clear_why_us, clear_next_step

  4 true  → score MUST be 10.0
  3 true  → score MUST be 8.0  (no exceptions — do not reduce for "quality" of the missing element)
  2 true  → score MUST be 6.0, EXCEPT if clear_why_us = false → reduce to 5.0
  1 true  → score MUST be 3.0
  0 true  → score MUST be 0.0

Do NOT adjust these scores based on how "significant" the missing element seems.
The boolean count determines the score. That is the rule.

INDUSTRY FACTORS (industry_factors):
  10.0 — All industry win factors addressed with specific, conviction-level content
   8.0 — Most win factors addressed; 1 minor gap
   6.0 — Some win factors addressed; 1–2 significant gaps
   4.0 — Key industry win factor absent (e.g., no compliance for fintech)
   2.0 — Almost no industry-specific content
   0.0 — No industry awareness demonstrated
   N/A — Industry not in known list (set industry_factors to 5.0 as neutral)

DYNAMIC WEIGHT DETERMINATION:
  Before computing the overall score, analyze the CLIENT CONTEXT (CLIENT_INDUSTRY, PROPOSAL_TYPE,
  CLIENT_PRIORITIES) provided in the user message and assign a weight to each scoring dimension.
  All six weights must sum to exactly 1.0. Output the chosen weights in "scores.weights".

  Baseline defaults (equal weighting): all six dimensions = 0.167 (rounded to sum to 1.0)

  Weight adjustment guidance (use professional judgement — these are directional signals):
  - client_fit: Raise (toward 0.20–0.25) when CLIENT_PRIORITIES are specific and numerous — the
    proposal must map directly to stated needs. Priorities "Cost Certainty", "Speed to Market",
    "Innovation" signal a client who will notice if their priorities go unaddressed.
  - differentiation: Raise (toward 0.20–0.25) for competitive bid contexts — "Consulting",
    "SaaS / Product", or "Staff Augmentation" types where multiple vendors are likely evaluated.
    Priorities "Innovation", "Speed to Market" signal that generic responses lose bids.
  - risk_transparency: Raise (toward 0.20–0.25) for Government, Healthcare, Insurance, Energy
    industries (regulated = scrutinised risk); "Fixed Price" type (risks become contractual);
    priorities "Risk Mitigation", "Compliance". These clients penalise proposals that hide risk.
  - credibility: Raise (toward 0.20–0.25) for large enterprise or regulated industries (Government,
    Healthcare, Financial / Fintech); "Managed Services" or "Consulting" types where vendor
    track record determines selection; priority "Proven Track Record" (if mapped to client priority).
  - narrative: Raise (toward 0.20) for "Consulting" or "SaaS / Product" types where the story
    sells the engagement; priorities "Innovation". Lower slightly for highly technical or
    commodity types like "Staff Augmentation".
  - industry_factors: Raise (toward 0.20–0.25) for specialised industries (Fintech, Healthcare,
    Government, Insurance, Energy, Telecom) where industry-specific signals determine shortlisting.
    If the industry is not in the known list, set industry_factors weight to 0.0 and redistribute
    proportionally to the other five dimensions.

  After determining weights, compute:
    overall = (client_fit × weights.client_fit)
            + (differentiation × weights.differentiation)
            + (risk_transparency × weights.risk_transparency)
            + (credibility × weights.credibility)
            + (narrative × weights.narrative)
            + (industry_factors × weights.industry_factors)
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
Use [] for empty arrays. Use {} for differentiation and narrative_assessment even if mostly empty.
Note: differentiation and narrative_assessment are OBJECTS, not arrays.

{
  "agent": "competitive_strength",
  "client_fit_issues": [
    {
      "priority": "Cost Certainty | Speed to Market | Regulatory Compliance | Risk Minimisation | Innovation | Proven Track Record",
      "issue": "Specific description referencing actual content or its absence",
      "severity": "CRITICAL | MAJOR | MINOR",
      "recommendation": "Specific, actionable fix — starts with a verb"
    }
  ],
  "differentiation": {
    "differentiators_found": ["list of genuine, specific differentiators — empty list if none"],
    "sounds_generic": false,
    "generic_elements": ["list of exact phrases or section descriptions that are generic — empty list if none"]
  },
  "risk_transparency_issues": [
    {
      "gsk_item": "P-14 | P-16 | P-20 | P-21 | null",
      "issue": "Specific description of the risk transparency problem",
      "severity": "CRITICAL | MAJOR | MINOR"
    }
  ],
  "credibility_gaps": [
    {
      "gsk_item": "P-08 | P-18 | null",
      "issue": "Specific credibility gap referencing the proposal",
      "severity": "CRITICAL | MAJOR | MINOR"
    }
  ],
  "overclaiming_flags": [
    {
      "claim": "Exact phrase from the proposal, max 20 words",
      "location": "Section name",
      "severity": "MAJOR | MINOR"
    }
  ],
  "narrative_assessment": {
    "flows_as_story": true,
    "exec_summary_compelling": true,
    "clear_why_us": true,
    "clear_next_step": true,
    "narrative_gaps": ["list of specific missing or underdeveloped narrative elements — empty list if none"]
  },
  "industry_findings": [
    {
      "factor": "The specific industry win factor assessed",
      "finding": "present | absent | weak | not_applicable",
      "severity": "CRITICAL | MAJOR | MINOR | null"
    }
  ],
  "checklist_coverage": [
    {
      "id": "P-08",
      "topic": "string — topic name from the checklist above",
      "skill": "3.1 | 3.2 | 3.3 | 3.4",
      "status": "COVERED | PARTIAL | MISSING",
      "note": "string — specific note quoting or referencing actual content from the proposal. Never generic."
    }
  ],
  "scores": {
    "weights": {
      "client_fit": 0.0,
      "differentiation": 0.0,
      "risk_transparency": 0.0,
      "credibility": 0.0,
      "narrative": 0.0,
      "industry_factors": 0.0
    },
    "client_fit": 0.0,
    "differentiation": 0.0,
    "risk_transparency": 0.0,
    "credibility": 0.0,
    "narrative": 0.0,
    "industry_factors": 0.0,
    "overall": 0.0
  }
}

CRITICAL REMINDERS:
1. differentiation is an OBJECT — not an array. It always has all three fields.
2. narrative_assessment is an OBJECT — not an array. All four booleans must be present.
3. If sounds_generic = true, differentiation score CANNOT exceed 4.0.
4. Every finding must reference specific content from the document — no generic feedback.
5. risk_transparency_issues: set gsk_item to "P-20" (risk register), "P-14" (dependencies), "P-16" (assumptions), "P-21" (pre-project requirements), or null for cross-cutting issues.
6. credibility_gaps: set gsk_item to "P-18" (case studies), "P-08" (team/work distribution), or null for governance gaps.
7. checklist_coverage MUST have exactly 10 entries in this exact order: P-08, P-09, P-10, P-12, P-13, P-14, P-16, P-18, P-20, P-21. Follow the single template row shown above — fill in real topic, skill, status, and note for each. Never skip an item even if it is COVERED. Never write a generic note.
8. Return ONLY the JSON object. Nothing before {{. Nothing after }}."""


# ── Prompt Composer ───────────────────────────────────────────────────────────

def compose_system_prompt(
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
) -> str:
    """
    Builds the complete Agent 3 system prompt by assembling all skill sections.
    Two skills are dynamically calibrated:
      - Skill 3.1 by client_priorities (mirrors Agent 1 Skill 1.4 / industry)
      - Skill 3.6 by client_industry (mirrors Agent 2 Skill 2.5 / proposal_type)
    """
    sections = [
        _IDENTITY,
        _FORMAT_INSTRUCTION,
        skill_3_1_client_fit.get_prompt_section(client_priorities),
        skill_3_2_differentiation.PROMPT_SECTION,
        skill_3_3_risk_transparency.PROMPT_SECTION,
        skill_3_4_credibility.get_prompt_section(),
        skill_3_5_narrative.PROMPT_SECTION,
    ]

    # Skill 3.6 is conditionally enriched but always included
    sections.append(skill_3_6_industry_win_factors.get_prompt_section(client_industry))

    sections.extend([_CHECKLIST_AUDIT, _SCORING, _OUTPUT_SCHEMA])

    return "\n".join(sections)


def build_user_message(
    client_industry: list[str],
    proposal_type: str,
    client_priorities: list[str],
) -> str:
    """Builds the user turn message with CLIENT CONTEXT injection."""
    industry_str = ", ".join(client_industry) if client_industry else "Not specified"
    priorities_str = ", ".join(client_priorities) if client_priorities else "Not specified"

    return f"""Please review the attached proposal document as Agent 3: Competitive Strength Reviewer.

CLIENT CONTEXT:
- Client Industry: {industry_str}
- Proposal Type: {proposal_type or 'Not specified'}
- Client Priorities: {priorities_str}

Apply all 6 skills plus the checklist audit to this proposal:
1. Evaluate client fit against each stated CLIENT PRIORITY above (client_fit_issues — skill 3.1)
2. Assess solution differentiation — apply the competitor name-swap test (differentiation — skill 3.2)
3. Check risk and dependency transparency across P-14, P-16, P-20, P-21 (risk_transparency_issues — skill 3.3)
4. Evaluate credibility signals and flag overclaiming (credibility_gaps, overclaiming_flags — skill 3.4)
5. Assess narrative arc across all 7 story elements (narrative_assessment — skill 3.5)
6. Check industry-specific win factors for CLIENT INDUSTRY above (industry_findings — skill 3.6)
7. Audit all 10 GSK Proposal Checklist items assigned to Agent 3 and output COVERED/PARTIAL/MISSING for each (checklist_coverage — skill 3.0)

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


def _apply_score_caps(result: dict, client_priorities: list[str], client_industry: list[str]) -> dict:
    """
    Deterministic guard applied AFTER the LLM returns scores.

    Rule 1 — Differentiation floor/ceiling:
      ≥3 differentiators + sounds_generic=false → differentiation MUST be ≥ 8.0
      2 differentiators  + sounds_generic=false → differentiation MUST be ≥ 7.0
      sounds_generic=true                       → differentiation CANNOT exceed 4.0

    Rule 2 — Narrative mechanical score (boolean count → fixed score):
      4 true → 10.0 | 3 true → 8.0 | 2 true → 6.0 (5.0 if clear_why_us=false)
      1 true → 3.0  | 0 true → 0.0

    Rule 3 — P-20 missing forces risk_transparency cap:
      If the checklist shows P-20 MISSING but risk_transparency_issues is empty,
      inject a synthetic CRITICAL issue so downstream agents see it. Also cap
      risk_transparency at 4.0 — a proposal with no risk register at all cannot
      score higher, per rubric ("0.0 — No risk register; no dependencies section").

    Rule 4 — Uncovered client priority caps client_fit:
      If any priority from client_priorities has no corresponding entry in
      client_fit_issues, the LLM silently skipped it. Cap client_fit at 7.0.
      A score of 8.0+ requires all priorities addressed with minor gaps only.

    Rule 5 — Overall recompute + graduated CRITICAL penalty:
      Recompute overall using the LLM's own weights whenever any rule fires.
      Each CRITICAL issue reduces overall by a graduated amount, avoiding the
      sharp cliff-edge of the old hard cap at count=3.
    """
    scores = result.get("scores") or {}
    weights = scores.get("weights", {})
    cap_applied = False

    # Ensure all expected sub-score keys exist (LLM sometimes omits them entirely)
    for _k in ("client_fit", "differentiation", "risk_transparency",
               "credibility", "narrative", "industry_factors"):
        scores.setdefault(_k, 0.0)

    # ── Rule 1: differentiation floor/ceiling ─────────────────────────────────
    diff = result.get("differentiation", {})
    n_diff = len(diff.get("differentiators_found") or [])
    sounds_generic = diff.get("sounds_generic", False)
    current_diff = scores.get("differentiation", 0.0)

    if sounds_generic:
        if current_diff > 4.0:
            scores["differentiation"] = 4.0
            cap_applied = True
    else:
        if n_diff >= 3 and current_diff < 8.0:
            scores["differentiation"] = 8.0
            cap_applied = True
        elif n_diff == 2 and current_diff < 7.0:
            scores["differentiation"] = 7.0
            cap_applied = True

    # ── Rule 2: narrative mechanical mapping ──────────────────────────────────
    narr = result.get("narrative_assessment", {})
    true_count = sum([
        bool(narr.get("flows_as_story")),
        bool(narr.get("exec_summary_compelling")),
        bool(narr.get("clear_why_us")),
        bool(narr.get("clear_next_step")),
    ])
    narrative_map = {4: 10.0, 3: 8.0, 2: 6.0, 1: 3.0, 0: 0.0}
    expected_narrative = narrative_map.get(true_count, 0.0)
    if true_count == 2 and not narr.get("clear_why_us", True):
        expected_narrative = 5.0

    if scores.get("narrative", 0.0) != expected_narrative:
        scores["narrative"] = expected_narrative
        cap_applied = True

    # ── Rule 3: P-20 missing → inject CRITICAL + cap risk_transparency ─────────
    checklist = result.get("checklist_coverage", [])
    p20_status = next(
        (item.get("status") for item in checklist if item.get("id") == "P-20"),
        None,
    )
    p20_missing = p20_status == "MISSING"

    if p20_missing:
        # Inject synthetic CRITICAL issue if the LLM left risk_transparency_issues empty
        rt_issues = result.get("risk_transparency_issues") or []
        has_p20_issue = any(i.get("gsk_item") == "P-20" for i in rt_issues)
        if not has_p20_issue:
            rt_issues.append({
                "gsk_item": "P-20",
                "issue": (
                    "No formal risk register present — a complex SAP-integrated AI "
                    "engagement with multiple client dependencies has no identified risks "
                    "or named mitigations."
                ),
                "severity": "CRITICAL",
            })
            result["risk_transparency_issues"] = rt_issues

        # Cap risk_transparency at 4.0 (no risk register = cannot score ≥ 6.0)
        if scores.get("risk_transparency", 0.0) > 4.0:
            scores["risk_transparency"] = 4.0
            cap_applied = True

    # ── Rule 4a: industry_factors weight floor for known industries ──────────
    # If the industry IS in our known list but the LLM assigned a negligible weight
    # (< 0.10), raise it to 0.10 and reduce the other weights proportionally so
    # the overall still sums to 1.0.  This prevents the LLM from silently
    # neutralising industry-specific findings by assigning 0.05 weight.
    from agents.agent3.resources.industry_win_factors import INDUSTRY_WIN_FACTORS
    industry_is_known = any(ind in INDUSTRY_WIN_FACTORS for ind in (client_industry or []))
    if industry_is_known:
        current_if_weight = weights.get("industry_factors", 0.0)
        MIN_IF_WEIGHT = 0.10
        if current_if_weight < MIN_IF_WEIGHT:
            deficit = MIN_IF_WEIGHT - current_if_weight
            other_keys = [k for k in weights if k != "industry_factors"]
            total_other = sum(weights.get(k, 0.0) for k in other_keys)
            if total_other > 0:
                for k in other_keys:
                    weights[k] = round(
                        weights.get(k, 0.0) - deficit * (weights.get(k, 0.0) / total_other),
                        4,
                    )
            weights["industry_factors"] = MIN_IF_WEIGHT
            scores["weights"] = weights
            cap_applied = True

    # ── Rule 4b: uncovered priority → cap client_fit at 7.0 ──────────────────
    if client_priorities:
        covered_priorities = {
            (i.get("priority") or "").strip().lower()
            for i in result.get("client_fit_issues", [])
        }
        uncovered = [
            p for p in client_priorities
            if p.strip().lower() not in covered_priorities
        ]
        if uncovered:
            if scores.get("client_fit", 0.0) > 7.0:
                scores["client_fit"] = 7.0
                cap_applied = True
            scores["uncovered_priorities"] = uncovered  # diagnostic

    # ── Rule 5: recompute overall + CRITICAL hard cap ─────────────────────────
    if cap_applied:
        recomputed = (
            scores.get("client_fit",         0.0) * weights.get("client_fit",        0.0)
            + scores.get("differentiation",  0.0) * weights.get("differentiation",   0.0)
            + scores.get("risk_transparency",0.0) * weights.get("risk_transparency", 0.0)
            + scores.get("credibility",      0.0) * weights.get("credibility",        0.0)
            + scores.get("narrative",        0.0) * weights.get("narrative",          0.0)
            + scores.get("industry_factors", 0.0) * weights.get("industry_factors",   0.0)
        )
        critical_count = sum(
            1 for issue in (
                result.get("risk_transparency_issues", [])
                + result.get("client_fit_issues", [])
                + result.get("credibility_gaps", [])
            )
            if issue.get("severity") == "CRITICAL"
        )
        recomputed = max(0.0, recomputed - _critical_deduction(critical_count))
        scores["overall"] = round(recomputed, 1)

    # Guarantee overall is always present — LLM occasionally omits it
    if "overall" not in scores:
        w = scores.get("weights", {})
        default = 1.0 / 6.0
        scores["overall"] = round(
            scores.get("client_fit",          0.0) * w.get("client_fit",          default)
            + scores.get("differentiation",   0.0) * w.get("differentiation",     default)
            + scores.get("risk_transparency", 0.0) * w.get("risk_transparency",   default)
            + scores.get("credibility",       0.0) * w.get("credibility",         default)
            + scores.get("narrative",         0.0) * w.get("narrative",           default)
            + scores.get("industry_factors",  0.0) * w.get("industry_factors",    default),
            1,
        )

    # Diagnostic fields for Agent 4
    scores["differentiator_count"] = n_diff
    scores["sounds_generic"] = sounds_generic
    scores["narrative_true_count"] = true_count
    scores["p20_missing"] = p20_missing
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
    Runs Agent 3 analysis on a proposal.

    For documents within the page threshold (<=30 pages), pdf_bytes is sent
    directly to Bedrock as a document block (existing behaviour).

    For large documents (>30 pages), the chunking pipeline pre-processes the
    file into a unified context JSON and passes it here as pre_processed_context.
    In that case pdf_bytes is ignored and the context JSON is sent as text.

    Args:
        pdf_bytes:              Raw bytes of the proposal file (PDF or PPTX/PPT).
        client_industry:        List of selected industries.
        proposal_type:          Type of proposal (e.g. "Fixed Price").
        client_priorities:      List of client priorities.
        file_type:              'pdf', 'pptx', or 'ppt'.
        pre_processed_context:  Merged chunk-summary JSON string from chunking_service.
                                When set, overrides the raw-file path.
        emit:                   Optional callable emit(activity, status) for the live feed.

    Returns:
        Parsed dict matching the Agent 3 output JSON schema.
    """
    _e = emit if emit else (lambda a, s="running": None)

    _e("Document received", "completed")
    doc_label = "pre-processed context" if pre_processed_context else file_type.upper()
    _e(f"Loaded {doc_label} for competitive analysis")
    _e("Analyzing client fit & alignment")
    _e("Identifying differentiators & unique value")
    _e("Evaluating risk transparency")
    _e("Checking credibility signals & track record")
    _e("Assessing narrative strength")
    _e("Reviewing industry win factors")

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

    final = _apply_score_caps(result, client_priorities, client_industry)
    score = final.get("scores", {}).get("overall", "?")
    _e(f"Competitive analysis done — score: {score}/10", "completed")
    return final
