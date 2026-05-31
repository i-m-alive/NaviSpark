"""
Agent 5 — PPT Auto-Modifier

Takes the original PPTX content (as extracted slide map) and all four agent outputs,
then generates structured modification instructions that pptx_modifier.py applies
to produce a corrected PPTX file.

Makes ONE Bedrock text-only call (no document block — slide map is in the user message).
"""

import json
from bedrock_client import invoke_agent_text_only, invoke_agent_with_pdf
from fastapi import HTTPException

from agents.agent5.skills import (
    skill_5_1_slide_mapper,
    skill_5_2_writing_fixer,
    skill_5_3_scope_rewriter,
    skill_5_4_commercial_patcher,
    skill_5_5_narrative_strengthener,
    skill_5_6_credibility_enhancer,
    skill_5_7_priority_executor,
)
from services.pptx_extractor import extract_slide_map, slide_map_to_prompt_text


# ── Identity ──────────────────────────────────────────────────────────────────

_IDENTITY = """You are Agent 5: PPT Auto-Modifier for NAVISPARK PS03.

You receive:
  1. A SLIDE MAP — the full text content of every shape in a PowerPoint proposal,
     extracted slide by slide with exact shape names.
  2. The complete outputs of Agents 1, 2, 3, and 4 — which have identified every
     writing issue, scope gap, commercial problem, and competitive weakness in the proposal.

Your job is to generate PRECISE, ACTIONABLE modification instructions that fix as many
of those findings as possible by rewriting or appending text in specific slide shapes.

You are the bridge between analysis and action. You do not analyse — you fix."""


# ── Output format ─────────────────────────────────────────────────────────────

_FORMAT_INSTRUCTION = """
═══════════════════════════════════════════════════
CRITICAL — OUTPUT FORMAT
═══════════════════════════════════════════════════

You MUST return ONLY a single valid JSON object. No preamble, no explanation,
no markdown code fences, no text before or after the JSON.
The response must start with { and end with }.

The JSON schema is:

{
  "modifications": [
    {
      "slide_index":    <integer — 0-based, MUST exist in the SLIDE MAP>,
      "shape_name":     <string — EXACT shape name from SLIDE MAP>,
      "action":         <"replace_text" | "append_bullets" | "append_text">,
      "original_text":  <string — for replace_text only; the text to find; omit for append actions>,
      "new_text":       <string — replacement text (replace_text, append_text); omit for append_bullets>,
      "bullets":        <array of strings — for append_bullets only; omit for other actions>,
      "source_skill":   <"5.1" | "5.2" | "5.3" | "5.4" | "5.5" | "5.6" | "5.7">,
      "source_finding": <string — which agent finding this addresses, e.g. "Agent 1 writing_issue: filler_phrase">,
      "priority":       <"must_fix" | "should_fix" | "nice_to_have">,
      "severity":       <"CRITICAL" | "MAJOR" | "MINOR">
    }
  ],
  "skipped": [
    {
      "finding":               <string — what the finding said>,
      "reason":                <string — why auto-modification is not possible>,
      "source_agent":          <"Agent 1" | "Agent 2" | "Agent 3" | "Agent 4">,
      "manual_action_required": <string — exact action the human must take manually>
    }
  ],
  "modification_summary": {
    "total_modifications":  <integer>,
    "must_fix_count":       <integer>,
    "should_fix_count":     <integer>,
    "nice_to_have_count":   <integer>,
    "skipped_count":        <integer>,
    "slides_modified":      <array of unique slide_index integers>,
    "must_fix_coverage":    <string — e.g. "3 of 4 must_fix actions from Agent 4 addressed">
  }
}

HARD RULES:
1. HOW TO READ THE SLIDE MAP — each shape line looks like:
     [SHAPE_NAME] (role, font): text content
   • "shape_name" in your JSON must be ONLY the text inside the square brackets [ ].
   • Do NOT include the parenthetical (role, font) or anything after the colon.
   • Example line:  [Title 1] (title, inherited): Executive Summary
     → correct shape_name: "Title 1"
     → WRONG:  "Title 1] (title, inherited)"  or  "Title 1 (title, inherited)"

2. slide_index is 0-based (Slide 0, Slide 1, …). Use integer values, not strings.

3. original_text for replace_text must be a substring of the shape's actual text
   (case-insensitive). It does NOT need to be character-perfect — fuzzy matching
   is used — but it must be at least 20 characters long and distinctive enough to
   identify the right paragraph. Short phrases risk matching the wrong shape.

4. For append_bullets, bullets must be a JSON array of strings (not a single string).

5. Every must_fix action from agent4_output.priority_actions.must_fix[] must appear
   either in modifications[] or in skipped[]. Missing coverage is not acceptable.

6. modifications[] must be sorted: must_fix first, then should_fix, then nice_to_have.
   Within the same priority, sort by slide_index ascending.
"""


# ── Compose system prompt ─────────────────────────────────────────────────────

def compose_system_prompt() -> str:
    return "\n\n".join([
        _IDENTITY,
        skill_5_1_slide_mapper.get_skill_prompt(),
        skill_5_2_writing_fixer.get_skill_prompt(),
        skill_5_3_scope_rewriter.get_skill_prompt(),
        skill_5_4_commercial_patcher.get_skill_prompt(),
        skill_5_5_narrative_strengthener.get_skill_prompt(),
        skill_5_6_credibility_enhancer.get_skill_prompt(),
        skill_5_7_priority_executor.get_skill_prompt(),
        _FORMAT_INSTRUCTION,
    ])


# ── Build user message ────────────────────────────────────────────────────────

def build_user_message(
    slide_map: list,
    agent1_output: dict,
    agent2_output: dict,
    agent3_output: dict,
    agent4_output: dict,
    client_industry: list,
    proposal_type: str,
    client_priorities: list,
) -> str:
    slide_text = slide_map_to_prompt_text(slide_map)

    return f"""PROPOSAL CONTEXT:
  Client Industry:    {', '.join(client_industry) if client_industry else 'Not specified'}
  Proposal Type:      {proposal_type or 'Not specified'}
  Client Priorities:  {', '.join(client_priorities) if client_priorities else 'Not specified'}

────────────────────────────────────────────────
SLIDE MAP (extracted from the uploaded PowerPoint)
────────────────────────────────────────────────
{slide_text}

────────────────────────────────────────────────
AGENT 1 OUTPUT — Completeness & Clarity
────────────────────────────────────────────────
{json.dumps(agent1_output, indent=2)}

────────────────────────────────────────────────
AGENT 2 OUTPUT — Estimation & Commercial Integrity
────────────────────────────────────────────────
{json.dumps(agent2_output, indent=2)}

────────────────────────────────────────────────
AGENT 3 OUTPUT — Competitive Strength
────────────────────────────────────────────────
{json.dumps(agent3_output, indent=2)}

────────────────────────────────────────────────
AGENT 4 OUTPUT — Aggregated Review & Priority Actions
────────────────────────────────────────────────
{json.dumps(agent4_output, indent=2)}

────────────────────────────────────────────────
INSTRUCTIONS
────────────────────────────────────────────────
Using the SLIDE MAP above, generate the complete modification instructions JSON.
Apply all 7 skills in order (5.1 through 5.7).
Return ONLY the JSON object — no other text."""


# ── Post-processing ───────────────────────────────────────────────────────────

def _resolve_shape_name(raw_name: str, valid_names: set) -> str | None:
    """
    Returns the canonical shape name from valid_names that best matches raw_name.

    Matching order (most-to-least strict):
      1. Exact match
      2. Case-insensitive + stripped match
      3. raw_name is a prefix of a valid name (handles LLM truncation)
      4. A valid name is fully contained in raw_name (handles extra metadata in raw_name)

    Returns None if no match is found.
    """
    if raw_name in valid_names:
        return raw_name

    needle = raw_name.strip().lower()

    # Case-insensitive exact match
    for name in valid_names:
        if name.strip().lower() == needle:
            return name

    # raw_name is a stripped prefix of a valid name (LLM cut it short)
    for name in valid_names:
        if name.strip().lower().startswith(needle) or needle.startswith(name.strip().lower()):
            return name

    # raw_name contains a valid name as a substring (LLM included extra metadata)
    for name in valid_names:
        if name.strip().lower() in needle:
            return name

    return None


def _validate_and_clean(result: dict, slide_map: list) -> dict:
    """
    Validates modification instructions against the actual slide map.
    Removes modifications referencing non-existent slides or shapes.
    Moves invalid ones to skipped[].

    Shape name matching is tolerant: exact → case-insensitive → prefix → substring.
    This recovers from the LLM producing slightly wrong casing or extra metadata.
    """
    # Build lookup: {slide_index: set_of_shape_names}
    valid = {}
    for slide in slide_map:
        idx = slide["slide_index"]
        valid[idx] = {s["shape_name"] for s in slide["shapes"]}

    cleaned = []
    skipped = list(result.get("skipped", []))

    for mod in result.get("modifications", []):
        si = mod.get("slide_index")
        sn = mod.get("shape_name", "").strip()
        action = mod.get("action", "")

        # ── Slide index validation ────────────────────────────────────────────
        # Tolerate string slide_index from the LLM ("0" → 0)
        if isinstance(si, str) and si.isdigit():
            si = int(si)
            mod["slide_index"] = si

        if si not in valid:
            skipped.append({
                "finding": mod.get("source_finding", ""),
                "reason": f"slide_index {si} does not exist in slide map",
                "source_agent": f"Skill {mod.get('source_skill', '?')}",
                "manual_action_required": "Locate the correct slide manually and apply the change.",
            })
            continue

        # ── Shape name validation (tolerant) ──────────────────────────────────
        canonical = _resolve_shape_name(sn, valid[si])
        if canonical is None:
            skipped.append({
                "finding": mod.get("source_finding", ""),
                "reason": f"Shape '{sn}' not found on slide {si}",
                "source_agent": f"Skill {mod.get('source_skill', '?')}",
                "manual_action_required": "Locate the correct shape manually and apply the change.",
            })
            continue

        # Normalise to canonical name so apply_modifications finds it exactly
        mod["shape_name"] = canonical

        # ── Action-specific field validation ──────────────────────────────────
        if action == "replace_text" and not mod.get("original_text"):
            skipped.append({
                "finding": mod.get("source_finding", ""),
                "reason": "replace_text modification missing original_text",
                "source_agent": f"Skill {mod.get('source_skill', '?')}",
                "manual_action_required": "Apply the replacement manually.",
            })
            continue

        if action == "append_bullets" and not mod.get("bullets"):
            skipped.append({
                "finding": mod.get("source_finding", ""),
                "reason": "append_bullets modification has empty bullets list",
                "source_agent": f"Skill {mod.get('source_skill', '?')}",
                "manual_action_required": "Apply the bullets manually.",
            })
            continue

        cleaned.append(mod)

    # Recompute summary
    priority_order = {"must_fix": 0, "should_fix": 1, "nice_to_have": 2}
    cleaned.sort(key=lambda m: (
        priority_order.get(m.get("priority", "nice_to_have"), 2),
        m.get("slide_index", 999),
    ))

    must_fix_count = sum(1 for m in cleaned if m.get("priority") == "must_fix")
    should_fix_count = sum(1 for m in cleaned if m.get("priority") == "should_fix")
    nice_count = sum(1 for m in cleaned if m.get("priority") == "nice_to_have")
    slides_modified = sorted({m.get("slide_index") for m in cleaned if m.get("slide_index") is not None})

    result["modifications"] = cleaned
    result["skipped"] = skipped
    result["modification_summary"] = {
        "total_modifications": len(cleaned),
        "must_fix_count": must_fix_count,
        "should_fix_count": should_fix_count,
        "nice_to_have_count": nice_count,
        "skipped_count": len(skipped),
        "slides_modified": slides_modified,
        "must_fix_coverage": result.get("modification_summary", {}).get(
            "must_fix_coverage", f"{must_fix_count} actions addressed"
        ),
    }
    return result


# ── Entry point ───────────────────────────────────────────────────────────────

def run(
    pptx_bytes: bytes,
    agent1_output: dict,
    agent2_output: dict,
    agent3_output: dict,
    agent4_output: dict,
    client_industry: list,
    proposal_type: str,
    client_priorities: list,
    emit=None,
) -> dict:
    """
    Runs Agent 5 on a PPTX proposal.

    1. Extracts slide map from pptx_bytes.
    2. Composes system prompt (all 7 skills).
    3. Makes ONE Bedrock text-only call with slide map + all 4 agent outputs.
    4. Validates returned modification instructions against slide map.
    5. Returns cleaned modification dict ready for pptx_modifier.apply_modifications().
    """
    _e = emit if emit else (lambda a, s="running": None)

    # Step 1: Extract slide content
    _e("PPTX received — extracting slide map")
    slide_map = extract_slide_map(pptx_bytes)
    if not slide_map:
        raise HTTPException(
            status_code=400,
            detail="Could not extract any text content from the uploaded PowerPoint file.",
        )
    _e(f"Slide map extracted — {len(slide_map)} slides identified", "completed")

    # Step 2: Build prompts
    _e("Loading all agent findings (completeness, commercial, competitive, chief review)")
    _e("Mapping findings to specific slides & shapes")
    _e("Planning text fixes via 7 modification skills")
    _e("Prioritizing must-fix changes")
    system_prompt = compose_system_prompt()
    user_message = build_user_message(
        slide_map=slide_map,
        agent1_output=agent1_output,
        agent2_output=agent2_output,
        agent3_output=agent3_output,
        agent4_output=agent4_output,
        client_industry=client_industry,
        proposal_type=proposal_type,
        client_priorities=client_priorities,
    )

    # Step 3: Call Bedrock (text-only — slide map replaces document block)
    _e("Generating modification instructions")
    result = invoke_agent_text_only(
        system_prompt=system_prompt,
        user_message=user_message,
        max_tokens=16000,
    )

    # Step 4: Validate and clean against actual slide map
    _e("Validating modifications against actual slide structure")
    final = _validate_and_clean(result, slide_map)
    total = final.get("modification_summary", {}).get("total_modifications", "?")
    must = final.get("modification_summary", {}).get("must_fix_count", "?")
    _e(f"Modification plan ready — {total} changes ({must} must-fix)", "completed")
    return final


# ── PDF mode ──────────────────────────────────────────────────────────────────

_PDF_IDENTITY = """You are Agent 5: Edit Recommendations Generator for NAVISPARK PS03.

You receive:
  1. A PDF proposal document (attached).
  2. Complete outputs from Agents 1, 2, 3, and 4 — which have already identified
     every writing issue, scope gap, commercial problem, and competitive weakness.

Your job is to generate PRECISE, ACTIONABLE text edit recommendations that fix as many
of those findings as possible. For each recommendation:
  - Name the section of the document where the change belongs.
  - Quote enough of the CURRENT text that a human editor can locate it with Ctrl+F.
    The quote must be at least 15 words and be verbatim from the document.
  - Provide the full REPLACEMENT text.
  - Explain in one sentence what changed and why it matters.

Focus ONLY on text changes. Do not recommend visual, structural, or layout changes —
add those to skipped[] instead.

Every must_fix action from agent4_output.priority_actions.must_fix[] must appear
in either edit_recommendations[] or skipped[]. Missing coverage is not acceptable."""

_PDF_FORMAT = """
═══════════════════════════════════════════════════
CRITICAL — OUTPUT FORMAT
═══════════════════════════════════════════════════

Return ONLY a single valid JSON object. No preamble, no markdown fences, no text outside.
The response must start with { and end with }.

{
  "edit_recommendations": [
    {
      "section":        "<section heading as it appears in the document>",
      "page_hint":      "<Page N, or 'Throughout' if it recurs>",
      "priority":       "<must_fix | should_fix | nice_to_have>",
      "severity":       "<CRITICAL | MAJOR | MINOR>",
      "source_finding": "<which agent finding this addresses, e.g. 'Agent 1 writing_issue: filler_phrase'>",
      "current_text":   "<exact verbatim quote from document — at least 15 words, distinctive enough to Ctrl+F>",
      "suggested_text": "<full replacement text — same length or shorter, active voice, specific>",
      "what_changed":   "<one sentence explaining what was changed and why>"
    }
  ],
  "skipped": [
    {
      "finding":                "<the finding that could not be auto-addressed>",
      "reason":                 "<why a text replacement cannot fix this>",
      "source_agent":           "<Agent 1 | Agent 2 | Agent 3 | Agent 4>",
      "manual_action_required": "<exact action the human must take>"
    }
  ],
  "edit_summary": {
    "total_recommendations": <integer>,
    "must_fix_count":        <integer>,
    "should_fix_count":      <integer>,
    "nice_to_have_count":    <integer>,
    "skipped_count":         <integer>,
    "must_fix_coverage":     "<e.g. '4 of 5 must_fix actions addressed'>"
  }
}

Sort edit_recommendations: must_fix first, then should_fix, then nice_to_have.
FINAL REMINDER: Return ONLY the JSON. Nothing before {. Nothing after }."""


def _build_pdf_user_message(
    agent1_output: dict,
    agent2_output: dict,
    agent3_output: dict,
    agent4_output: dict,
    client_industry: list,
    proposal_type: str,
    client_priorities: list,
) -> str:
    return f"""Please review the attached PDF proposal and generate edit recommendations.

PROPOSAL CONTEXT:
  Client Industry:   {', '.join(client_industry) if client_industry else 'Not specified'}
  Proposal Type:     {proposal_type or 'Not specified'}
  Client Priorities: {', '.join(client_priorities) if client_priorities else 'Not specified'}

────────────────────────────────────────────────
AGENT 1 OUTPUT — Completeness & Clarity
────────────────────────────────────────────────
{json.dumps(agent1_output, indent=2)}

────────────────────────────────────────────────
AGENT 2 OUTPUT — Estimation & Commercial Integrity
────────────────────────────────────────────────
{json.dumps(agent2_output, indent=2)}

────────────────────────────────────────────────
AGENT 3 OUTPUT — Competitive Strength
────────────────────────────────────────────────
{json.dumps(agent3_output, indent=2)}

────────────────────────────────────────────────
AGENT 4 OUTPUT — Aggregated Review & Priority Actions
────────────────────────────────────────────────
{json.dumps(agent4_output, indent=2)}

────────────────────────────────────────────────
INSTRUCTIONS
────────────────────────────────────────────────
Using the attached PDF and all four agent outputs, generate the complete
edit_recommendations JSON. Address every must_fix action from Agent 4.
Return ONLY the JSON object — no other text."""


def _normalize_pdf_result(raw: dict) -> dict:
    """
    Converts the PDF LLM output into the same guide-item shape that
    ModificationReportPanel.jsx already understands.
    """
    recs = raw.get("edit_recommendations", [])
    skipped = raw.get("skipped", [])
    summary_raw = raw.get("edit_summary", {})

    guide = []
    for i, rec in enumerate(recs):
        guide.append({
            "change_number":     i + 1,
            # For PDF we store page_hint in slide_title / shape_name fields
            # so the existing ChangeCard renders meaningful text.
            "slide_number":      0,                            # unused in PDF mode
            "slide_title":       rec.get("section", ""),
            "shape_name":        rec.get("page_hint", ""),
            "action":            "replace_text",
            "priority":          rec.get("priority", "nice_to_have"),
            "severity":          rec.get("severity", "MINOR"),
            "source_skill":      "pdf",
            "addresses_finding": rec.get("source_finding", ""),
            # rename fields to match existing component expectations
            "find_text":         rec.get("current_text", ""),
            "replace_with":      rec.get("suggested_text", ""),
            "what_changed":      rec.get("what_changed", ""),
            "bullets_to_add":    [],
        })

    must  = sum(1 for g in guide if g["priority"] == "must_fix")
    shld  = sum(1 for g in guide if g["priority"] == "should_fix")
    nice  = sum(1 for g in guide if g["priority"] == "nice_to_have")

    return {
        "mode":    "pdf",
        "guide":   guide,
        "skipped": skipped,
        "summary": {
            "total":             len(guide),
            "must_fix":          must,
            "should_fix":        shld,
            "nice_to_have":      nice,
            "skipped":           len(skipped),
            "must_fix_coverage": summary_raw.get("must_fix_coverage", ""),
        },
    }


def run_pdf(
    pdf_bytes: bytes,
    file_type: str,
    agent1_output: dict,
    agent2_output: dict,
    agent3_output: dict,
    agent4_output: dict,
    client_industry: list,
    proposal_type: str,
    client_priorities: list,
    emit=None,
) -> dict:
    """
    Runs Agent 5 on a PDF proposal.

    Sends the PDF directly to Bedrock alongside all four agent outputs.
    Returns a normalized guide dict compatible with ModificationReportPanel.
    """
    _e = emit if emit else (lambda a, s="running": None)

    _e("PDF received — preparing edit recommendations prompt")
    _e("Loading all agent findings (completeness, commercial, competitive, chief review)")
    _e("Planning section-level text improvements")

    system_prompt = f"{_PDF_IDENTITY}\n\n{_PDF_FORMAT}"
    user_message = _build_pdf_user_message(
        agent1_output=agent1_output,
        agent2_output=agent2_output,
        agent3_output=agent3_output,
        agent4_output=agent4_output,
        client_industry=client_industry,
        proposal_type=proposal_type,
        client_priorities=client_priorities,
    )

    _e("Generating edit recommendations via AI")
    raw = invoke_agent_with_pdf(
        system_prompt=system_prompt,
        user_message=user_message,
        pdf_bytes=pdf_bytes,
        file_type=file_type,
    )

    _e("Normalizing recommendations")
    result = _normalize_pdf_result(raw)
    total = result["summary"]["total"]
    must  = result["summary"]["must_fix"]
    _e(f"Edit guide ready — {total} recommendations ({must} must-fix)", "completed")
    return result
