"""
Agent 4 — Chief Proposal Review Officer (Aggregator)

Receives JSON outputs from Agents 1, 2, and 3.
Runs three pure-Python pre-computations (Tasks 4.1, 4.3, 4.5) then makes
ONE text-only Bedrock call for Tasks 4.2, 4.4, and 4.6.
Merges everything into the final Agent 4 JSON.
"""

import json

from bedrock_client import invoke_agent_text_only
from agents.agent4.tasks import task_4_1_weighted_score, task_4_3_double_flag, task_4_5_checklist_merge
from agents.agent4.resources.consistency_rules import CONSISTENCY_RULES

# ── Identity ──────────────────────────────────────────────────────────────────

_IDENTITY = """You are Agent 4: Chief Proposal Review Officer for NAVISPARK PS03, an AI-powered \
proposal review system used by professional services and IT consulting firms.

You are the most senior reviewer in the system. You receive the complete structured outputs of three \
specialist agents who have already analysed the proposal in depth:
  Agent 1 — Completeness & Clarity (6 skills, 22 GSK Proposal items)
  Agent 2 — Estimation & Commercial Integrity (7 skills, 24 GSK Estimation + 11 Pricing items)
  Agent 3 — Competitive Strength (6 skills, 10 GSK Proposal competitive items)

Your job is NOT to re-analyse the proposal — the three agents have already done that work. \
Your job is to:
  1. Detect cross-agent inconsistencies that none of the individual agents could see alone.
  2. Identify issues flagged by two or more agents (double-flagged = highest priority).
  3. Synthesise all findings into one prioritised, actionable verdict.
  4. Write a plain-English 4–5 sentence briefing for the proposal team lead.
  5. Identify the top 3 genuine strengths of this proposal.

You have 20+ years of experience as both a bid director and a procurement committee member. \
You know the difference between findings that will lose a deal and findings that can be fixed \
in 30 minutes. Your verdict must be honest, specific, and immediately actionable."""

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

# ── Task 4.2 — Cross-Agent Consistency ───────────────────────────────────────

def _build_consistency_prompt(rules: list) -> str:
    rules_text = ""
    for r in rules:
        rules_text += f"\n  {r['id']} — {r['check']}\n"
        rules_text += f"    {r['description']}\n"
        rules_text += f"    Severity if found: {r['severity_if_found']}\n"

    return f"""
═══════════════════════════════════════════════════
TASK 4.2 — CROSS-AGENT CONSISTENCY CHECK
═══════════════════════════════════════════════════

Compare the three agent outputs against each other using the following five rules.
For each rule, determine whether the inconsistency exists. If it does, output one entry
in "cross_consistency_issues". If no inconsistency is found for a rule, skip it.

Rules to evaluate:
{rules_text}

Output format per finding:
{{
  "rule_id": "CR-01",
  "check": "Assumptions alignment (A1 ↔ A2)",
  "finding": "Specific description of the inconsistency found, referencing actual content from the agent outputs.",
  "severity": "CRITICAL | MAJOR | MINOR",
  "agents_involved": ["Agent 1", "Agent 2"]
}}

If no cross-agent inconsistencies are found across all five rules, output cross_consistency_issues as [].
Never invent inconsistencies — only flag what is genuinely contradictory or misaligned."""


# ── Task 4.4 — Priority Action List ──────────────────────────────────────────

_PRIORITY_ACTIONS_PROMPT = """
═══════════════════════════════════════════════════
TASK 4.4 — PRIORITY ACTION LIST
═══════════════════════════════════════════════════

Synthesise all findings from Agents 1, 2, and 3 — plus any cross-consistency issues you identified
in Task 4.2 — into three tiers of action. This is the most practically useful output for the
proposal team. Write every action as if you are handing it directly to the proposal author.

MUST FIX BEFORE SENDING (max 5 items, ranked by deal impact):
  These are issues that will either cost the deal outright or create a post-contract dispute.
  Double-flagged issues (appearing in 2+ agents) MUST appear here if they exist.
  Cross-consistency issues rated CRITICAL must appear here.
  Each item must state: what to fix, exactly where in the proposal, and why it matters commercially.

SHOULD FIX IF TIME ALLOWS (max 5 items):
  These weaken the proposal but are unlikely to lose it. Good to fix; not critical.
  Prioritise findings that are MAJOR severity from any single agent.

NOTE FOR NEXT PROPOSAL (max 3 items):
  Structural or habitual issues that are not worth fixing NOW but the team should build as practice.
  Frame these as process improvements, not specific document edits.

INTERNAL SUBMISSION READINESS (separate, not client-facing):
  Internal hygiene flags from Agent 2 (margin targets, S&M margin calculations — items P3d, P4b).
  These go into the internal section of the report only. Max 3 items.
  Prefix each with "[INTERNAL]".

Rules:
- Each action item must be specific: reference the section or finding. Never generic.
- must_fix items must name the commercial consequence of not fixing.
- next_time items must be framed as team habits or process steps, not document edits.
- If you have fewer findings than the maximum, output fewer items — don't pad.

Output format per action item:
{{
  "action": "Specific, imperative instruction starting with a verb",
  "why": "Commercial or contractual consequence if not fixed",
  "source_agents": ["Agent 1", "Agent 2"],
  "severity": "CRITICAL | MAJOR | MINOR"
}}"""


# ── Task 4.6 — Summary and Strengths ─────────────────────────────────────────

_SUMMARY_PROMPT = """
═══════════════════════════════════════════════════
TASK 4.6 — PLAIN-ENGLISH SUMMARY & TOP STRENGTHS
═══════════════════════════════════════════════════

PLAIN-ENGLISH SUMMARY:
Write exactly 4–5 sentences for the proposal team lead. This is what they read first.
Tone: direct, honest, collegial. Not a bulleted list — flowing prose.
Sentence 1: State the overall verdict and score in plain English.
Sentence 2: Name the single biggest structural strength of this proposal.
Sentence 3: Name the single most urgent problem that must be fixed before sending.
Sentence 4: Give one concrete, specific action that would most improve the score.
Sentence 5 (optional): Any important context (e.g. double-flagged issues, cross-consistency issues) worth flagging.

TOP 3 STRENGTHS:
Identify the three things this proposal genuinely does well — things a procurement panel would notice
positively. Do not invent strengths. If fewer than 3 genuine strengths exist, output fewer.
Each strength must reference specific content from the agent outputs — not generic praise.

Output: plain_english_summary (string) and top_3_strengths (array of strings)."""


# ── Output Schema ─────────────────────────────────────────────────────────────

_OUTPUT_SCHEMA = """
═══════════════════════════════════════════════════
EXACT OUTPUT JSON SCHEMA
═══════════════════════════════════════════════════

Return EXACTLY this structure. Every field must be present.
Use [] for empty arrays. The pre_computed block is filled by the system — output it as-is from the
PRE-COMPUTED DATA block in the user message, then add your analysis fields.

{
  "agent": "aggregator",

  "cross_consistency_issues": [
    {
      "rule_id": "CR-01",
      "check": "string — name of the consistency check",
      "finding": "string — specific inconsistency found, referencing agent output content",
      "severity": "CRITICAL | MAJOR | MINOR",
      "agents_involved": ["Agent 1", "Agent 2"]
    }
  ],

  "priority_actions": {
    "must_fix": [
      {
        "action": "string — imperative, starts with a verb",
        "why": "string — commercial or contractual consequence",
        "source_agents": ["Agent 1"],
        "severity": "CRITICAL | MAJOR"
      }
    ],
    "should_fix": [
      {
        "action": "string",
        "why": "string",
        "source_agents": ["Agent 2"],
        "severity": "MAJOR | MINOR"
      }
    ],
    "next_time": [
      {
        "action": "string — process or habit, not a document edit",
        "why": "string",
        "source_agents": ["Agent 1"],
        "severity": "MINOR"
      }
    ],
    "internal": [
      {
        "action": "string — prefixed with [INTERNAL]",
        "why": "string",
        "source_agents": ["Agent 2"],
        "severity": "MAJOR | MINOR"
      }
    ]
  },

  "rewrite_suggestions": [
    {
      "section": "string — section name from Agent 1's rewrite",
      "original": "string",
      "improved": "string",
      "what_changed": "string — one sentence explanation"
    }
  ],

  "plain_english_summary": "string — 4–5 sentence prose paragraph for the proposal team lead",

  "top_3_strengths": [
    "string — specific strength referencing actual proposal content"
  ]
}

CRITICAL REMINDERS:
1. cross_consistency_issues: only flag genuine contradictions between agent outputs. Empty array if none.
2. priority_actions.must_fix: max 5. Double-flagged issues go here first.
3. priority_actions.should_fix: max 5.
4. priority_actions.next_time: max 3. Process habits — not document edits.
5. priority_actions.internal: max 3. Prefixed with [INTERNAL]. Not shown to client.
6. rewrite_suggestions: take the rewrite from Agent 1's output if it exists (best 1–2 rewrites).
7. top_3_strengths: reference specific content. No generic statements like "the proposal is well-structured."
8. plain_english_summary: exactly 4–5 sentences, flowing prose, not a list.
9. Return ONLY the JSON. Nothing before {. Nothing after }."""


# ── Prompt Composer ───────────────────────────────────────────────────────────

def compose_system_prompt() -> str:
    consistency_block = _build_consistency_prompt(CONSISTENCY_RULES)
    return "\n".join([
        _IDENTITY,
        _FORMAT_INSTRUCTION,
        consistency_block,
        _PRIORITY_ACTIONS_PROMPT,
        _SUMMARY_PROMPT,
        _OUTPUT_SCHEMA,
    ])


def build_user_message(
    agent1_output: dict,
    agent2_output: dict,
    agent3_output: dict,
    client_industry: list,
    proposal_type: str,
    client_priorities: list,
    pre_computed: dict,
    double_flagged: list,
) -> str:
    industry_str = ", ".join(client_industry) if client_industry else "Not specified"
    priorities_str = ", ".join(client_priorities) if client_priorities else "Not specified"

    # Serialise agent outputs compactly to control token usage
    a1_json = json.dumps(agent1_output, indent=2)
    a2_json = json.dumps(agent2_output, indent=2)
    a3_json = json.dumps(agent3_output, indent=2)
    df_json = json.dumps(double_flagged, indent=2)
    pc_json = json.dumps(pre_computed, indent=2)

    return f"""You are reviewing a proposal that has already been assessed by three specialist agents.
Synthesise their findings into the final verdict.

══════════════════════════════════════════════════════
CLIENT CONTEXT
══════════════════════════════════════════════════════
Client Industry: {industry_str}
Proposal Type:   {proposal_type or 'Not specified'}
Client Priorities: {priorities_str}

══════════════════════════════════════════════════════
PRE-COMPUTED DATA (Task 4.1 + 4.3 + 4.5 — already calculated by the system)
══════════════════════════════════════════════════════
{pc_json}

══════════════════════════════════════════════════════
DOUBLE-FLAGGED ISSUES (Task 4.3 — same root problem detected in 2+ agents)
══════════════════════════════════════════════════════
{df_json}

INSTRUCTION: Every double-flagged issue above MUST appear in priority_actions.must_fix unless
it is clearly a minor cosmetic issue. These have been pre-detected by a deterministic algorithm —
your job is to synthesise them into clear, actionable must_fix items, not to re-detect them.

══════════════════════════════════════════════════════
AGENT 1 OUTPUT — Completeness & Clarity
══════════════════════════════════════════════════════
{a1_json}

══════════════════════════════════════════════════════
AGENT 2 OUTPUT — Estimation & Commercial Integrity
══════════════════════════════════════════════════════
{a2_json}

══════════════════════════════════════════════════════
AGENT 3 OUTPUT — Competitive Strength
══════════════════════════════════════════════════════
{a3_json}

══════════════════════════════════════════════════════
YOUR TASKS
══════════════════════════════════════════════════════
1. Task 4.2: Run all five cross-agent consistency checks (CR-01 through CR-05) on the agent
   outputs above. Output findings in cross_consistency_issues.
2. Task 4.4: Produce the three-tier priority action list (must_fix, should_fix, next_time, internal).
   Incorporate double-flagged issues and cross-consistency issues into must_fix.
3. Task 4.6: Extract or adapt the best rewrite suggestion from Agent 1's output (rewrite_suggestions).
   Write the 4–5 sentence plain_english_summary. Identify top_3_strengths.

Return ONLY the JSON object as specified in your instructions. No other text."""


# ── Entry Point ───────────────────────────────────────────────────────────────

def run(
    agent1_output: dict,
    agent2_output: dict,
    agent3_output: dict,
    client_industry: list,
    proposal_type: str,
    client_priorities: list,
) -> dict:
    """
    Runs Agent 4 aggregation.

    Steps:
      1. Task 4.1 — weighted score (pure Python)
      2. Task 4.3 — double-flag detection (pure Python)
      3. Task 4.5 — 57-item checklist merge (pure Python)
      4. Single Bedrock text-only call — Tasks 4.2, 4.4, 4.6
      5. Merge everything into final output dict

    Args:
        agent1_output:      Parsed dict from Agent 1's Bedrock call.
        agent2_output:      Parsed dict from Agent 2's Bedrock call.
        agent3_output:      Parsed dict from Agent 3's Bedrock call.
        client_industry:    List of industries from session context.
        proposal_type:      Proposal type string from session context.
        client_priorities:  List of client priorities from session context.

    Returns:
        Complete Agent 4 output dict.

    Raises:
        HTTPException(400): Missing agent outputs (caller should guard before calling this).
        HTTPException(502): Bedrock API failure.
        HTTPException(500): JSON parse failure.
    """

    # ── Task 4.1: Weighted score ──────────────────────────────────────────────
    score_result = task_4_1_weighted_score.run(
        agent1_output=agent1_output,
        agent2_output=agent2_output,
        agent3_output=agent3_output,
        proposal_type=proposal_type,
        client_priorities=client_priorities,
    )

    # ── Task 4.3: Double-flag detection ───────────────────────────────────────
    double_flagged = task_4_3_double_flag.run(
        agent1_output=agent1_output,
        agent2_output=agent2_output,
        agent3_output=agent3_output,
    )

    # ── Task 4.5: Unified checklist grid ─────────────────────────────────────
    checklist_coverage = task_4_5_checklist_merge.run(
        agent1_output=agent1_output,
        agent2_output=agent2_output,
        agent3_output=agent3_output,
    )

    # ── Package pre-computed data for the prompt ──────────────────────────────
    pre_computed = {
        "overall_score": score_result["overall_score"],
        "verdict": score_result["verdict"],
        "agent1_score": score_result["agent1_score"],
        "agent2_score": score_result["agent2_score"],
        "agent3_score": score_result["agent3_score"],
        "weights": score_result["weights"],
        "weight_adjusted": score_result["weight_adjusted"],
        "weight_reason": score_result["weight_reason"],
        "weight_label": score_result["weight_label"],
        "section_scorecard": score_result["section_scorecard"],
        "double_flagged_count": len(double_flagged),
        "checklist_summary": {
            "covered": sum(1 for i in checklist_coverage if i["status"] == "COVERED"),
            "partial": sum(1 for i in checklist_coverage if i["status"] == "PARTIAL"),
            "missing": sum(1 for i in checklist_coverage if i["status"] == "MISSING"),
            "total": len(checklist_coverage),
        },
    }

    # ── Single Bedrock call (Tasks 4.2, 4.4, 4.6) ────────────────────────────
    system_prompt = compose_system_prompt()
    user_message = build_user_message(
        agent1_output=agent1_output,
        agent2_output=agent2_output,
        agent3_output=agent3_output,
        client_industry=client_industry,
        proposal_type=proposal_type,
        client_priorities=client_priorities,
        pre_computed=pre_computed,
        double_flagged=double_flagged,
    )

    llm_result = invoke_agent_text_only(
        system_prompt=system_prompt,
        user_message=user_message,
    )

    # ── Merge: Python-computed + LLM-computed ─────────────────────────────────
    final = {
        "agent": "aggregator",
        # Task 4.1 — pure Python
        "overall_score": score_result["overall_score"],
        "verdict": score_result["verdict"],
        "agent1_score": score_result["agent1_score"],
        "agent2_score": score_result["agent2_score"],
        "agent3_score": score_result["agent3_score"],
        "weights": score_result["weights"],
        "weight_adjusted": score_result["weight_adjusted"],
        "weight_reason": score_result["weight_reason"],
        "weight_label": score_result["weight_label"],
        "section_scorecard": score_result["section_scorecard"],
        # Task 4.3 — pure Python
        "double_flagged_issues": double_flagged,
        # Task 4.5 — pure Python
        "checklist_coverage": checklist_coverage,
        # Task 4.2 — LLM
        "cross_consistency_issues": llm_result.get("cross_consistency_issues", []),
        # Task 4.4 — LLM
        "priority_actions": llm_result.get("priority_actions", {
            "must_fix": [], "should_fix": [], "next_time": [], "internal": []
        }),
        # Task 4.6 — LLM
        "rewrite_suggestions": llm_result.get("rewrite_suggestions", []),
        "plain_english_summary": llm_result.get("plain_english_summary", ""),
        "top_3_strengths": llm_result.get("top_3_strengths", []),
    }

    return final
