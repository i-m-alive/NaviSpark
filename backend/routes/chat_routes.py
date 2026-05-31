"""
NaviSpark AI Chat — Streaming SSE endpoint backed by Claude Sonnet on Bedrock.

=============================================================
SUPABASE TABLE — run once in SQL Editor before using this route:
=============================================================

  CREATE TABLE IF NOT EXISTS chat_conversations (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id    UUID        NOT NULL,
      user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      messages    JSONB       NOT NULL DEFAULT '[]'::jsonb,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (group_id, user_id)
  );

  ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users manage own conversations"
      ON chat_conversations FOR ALL
      USING (auth.uid() = user_id);

  CREATE INDEX IF NOT EXISTS idx_chat_group_user
      ON chat_conversations (group_id, user_id);

  CREATE OR REPLACE FUNCTION update_chat_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_chat_updated_at
      BEFORE UPDATE ON chat_conversations
      FOR EACH ROW EXECUTE FUNCTION update_chat_updated_at();

=============================================================
"""

import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from auth import get_current_user
from bedrock_client import get_bedrock_client
from config import settings
from database import get_supabase

router = APIRouter(prefix="/chat", tags=["chat"])
_executor = ThreadPoolExecutor(max_workers=8)

SESSIONS_TABLE = "review_sessions"
CHAT_TABLE     = "chat_conversations"
MAX_HISTORY    = 40   # messages kept in the DB (pairs)
API_WINDOW     = 20   # messages sent to the model per turn

# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt_list(items, indent=2) -> str:
    if not items:
        return "  (none)"
    pad = " " * indent
    return "\n".join(f"{pad}• {item}" for item in items)

def _fmt_actions(priority_actions: dict) -> str:
    if not priority_actions:
        return "  (none)"
    lines = []
    for bucket, label in [("must_fix", "MUST FIX"), ("should_improve", "SHOULD IMPROVE"), ("nice_to_have", "NICE TO HAVE")]:
        items = priority_actions.get(bucket) or []
        if items:
            lines.append(f"  [{label}]")
            for a in items:
                action = a.get("action") or str(a)
                reason = a.get("reason") or ""
                lines.append(f"    • {action}" + (f" — {reason}" if reason else ""))
    return "\n".join(lines) if lines else "  (none)"

def _fmt_agent1(o: dict) -> str:
    if not o:
        return "Not available."
    lines = [
        f"Completeness Score : {o.get('completeness_score', 'N/A')}",
        f"Clarity Score      : {o.get('clarity_score', 'N/A')}",
    ]
    sections = o.get("section_scores") or {}
    if sections:
        lines.append("Section Scores:")
        for k, v in sections.items():
            lines.append(f"  {k}: {v}")
    findings = o.get("findings") or []
    if findings:
        lines.append(f"Key Findings ({len(findings)}):")
        for f in findings[:15]:
            sev  = f.get("severity") or f.get("type") or ""
            desc = f.get("description") or f.get("finding") or str(f)
            lines.append(f"  [{sev}] {desc}")
    recs = o.get("recommendations") or []
    if recs:
        lines.append("Recommendations:")
        for r in recs[:10]:
            lines.append(f"  • {r}")
    missing = o.get("missing_sections") or []
    if missing:
        lines.append(f"Missing Sections: {', '.join(missing)}")
    return "\n".join(lines)

def _fmt_agent2(o: dict) -> str:
    if not o:
        return "Not available."
    lines = [
        f"Estimation Score          : {o.get('estimation_score', 'N/A')}",
        f"Commercial Integrity Score: {o.get('commercial_integrity_score', 'N/A')}",
    ]
    for key in ("findings", "issues", "risks"):
        items = o.get(key) or []
        if items:
            lines.append(f"{key.title()} ({len(items)}):")
            for item in items[:12]:
                if isinstance(item, dict):
                    desc = item.get("description") or item.get("issue") or item.get("finding") or str(item)
                    sev  = item.get("severity") or item.get("type") or ""
                    lines.append(f"  [{sev}] {desc}" if sev else f"  • {desc}")
                else:
                    lines.append(f"  • {item}")
    recs = o.get("recommendations") or []
    if recs:
        lines.append("Recommendations:")
        for r in recs[:8]:
            lines.append(f"  • {r}")
    return "\n".join(lines)

def _fmt_agent3(o: dict) -> str:
    if not o:
        return "Not available."
    lines = [f"Competitive Strength Score: {o.get('competitive_score', o.get('score', 'N/A'))}"]
    for key in ("strengths", "weaknesses", "findings", "gaps"):
        items = o.get(key) or []
        if items:
            lines.append(f"{key.title()} ({len(items)}):")
            for item in items[:10]:
                if isinstance(item, dict):
                    desc = item.get("description") or item.get("finding") or str(item)
                    lines.append(f"  • {desc}")
                else:
                    lines.append(f"  • {item}")
    recs = o.get("recommendations") or []
    if recs:
        lines.append("Recommendations:")
        for r in recs[:8]:
            lines.append(f"  • {r}")
    return "\n".join(lines)

def _fmt_agent4_full(o: dict) -> str:
    if not o:
        return "Not available."
    lines = [
        f"Overall Score  : {o.get('overall_score', 'N/A')}/10",
        f"Verdict        : {o.get('verdict', 'N/A')}",
        f"Agent 1 Score  : {o.get('agent1_score', 'N/A')}",
        f"Agent 2 Score  : {o.get('agent2_score', 'N/A')}",
        f"Agent 3 Score  : {o.get('agent3_score', 'N/A')}",
        f"Weight Label   : {o.get('weight_label', 'N/A')} — {o.get('weight_reason', '')}",
        "",
        "Plain English Summary:",
        f"  {o.get('plain_english_summary', 'N/A')}",
        "",
        "Top 3 Strengths:",
        _fmt_list(o.get("top_3_strengths") or []),
        "",
        "Double-Flagged Issues (flagged by 2+ agents):",
    ]
    dfi = o.get("double_flagged_issues") or []
    for item in dfi:
        if isinstance(item, dict):
            desc = item.get("description") or item.get("issue") or str(item)
            lines.append(f"  ⚠ {desc}")
        else:
            lines.append(f"  ⚠ {item}")
    lines += [
        "",
        "Priority Actions:",
        _fmt_actions(o.get("priority_actions") or {}),
        "",
        "Cross-Consistency Issues:",
    ]
    cci = o.get("cross_consistency_issues") or []
    for item in cci[:8]:
        if isinstance(item, dict):
            desc = item.get("description") or item.get("issue") or str(item)
            lines.append(f"  • {desc}")
        else:
            lines.append(f"  • {item}")
    rwrites = o.get("rewrite_suggestions") or []
    if rwrites:
        lines += ["", "Rewrite Suggestions:"]
        for rw in rwrites[:5]:
            if isinstance(rw, dict):
                section = rw.get("section") or ""
                issue   = rw.get("issue") or rw.get("problem") or ""
                sugg    = rw.get("suggestion") or rw.get("rewrite") or ""
                lines.append(f"  Section: {section}")
                if issue:
                    lines.append(f"    Issue: {issue}")
                if sugg:
                    lines.append(f"    Suggestion: {sugg}")
    return "\n".join(lines)

def _fmt_agent4_brief(o: dict) -> str:
    if not o:
        return "Not available."
    actions = o.get("priority_actions") or {}
    must_fix = [
        (a.get("action") or str(a)) for a in (actions.get("must_fix") or [])
    ][:3]
    return (
        f"Score: {o.get('overall_score', 'N/A')}/10 | "
        f"Verdict: {o.get('verdict', 'N/A')}\n"
        f"Summary: {o.get('plain_english_summary', '')[:400]}\n"
        + ("Must Fix:\n" + _fmt_list(must_fix) if must_fix else "")
    )


def build_system_prompt(sessions: list) -> str:
    """
    Builds the system prompt from all sessions in a document group.
    Current version gets full 4-agent detail; earlier versions get Agent 4 brief.
    """
    if not sessions:
        return "You are NaviSpark AI, a proposal review assistant. No document data is available."

    # Sort ascending by version — last entry is the most recent
    sessions = sorted(sessions, key=lambda s: s.get("version_number") or 1)
    current  = sessions[-1]
    older    = sessions[:-1]

    client_industry  = ", ".join(current.get("client_industry") or []) or "Not specified"
    proposal_type    = current.get("proposal_type") or "Not specified"
    client_priorities = _fmt_list(current.get("client_priorities") or [])
    filename         = current.get("original_filename") or "Untitled"
    total_versions   = len(sessions)

    lines = [
        "You are NaviSpark AI — an expert proposal intelligence assistant embedded inside the NaviSpark platform.",
        "You have been given complete AI-generated analysis of a proposal document and all its previous versions.",
        "Your job is to help the user understand weaknesses, gaps, risks, and improvements in their proposal.",
        "",
        "## Guidelines",
        "- Be direct, specific, and actionable. Reference exact findings from the reports.",
        "- When comparing versions, be precise about what changed and what did not.",
        "- For improvement plans, structure them as prioritised numbered steps.",
        "- When asked for rewrites, produce actual rewritten text, not vague advice.",
        "- Use markdown formatting — headers, bullet lists, bold — to make responses easy to scan.",
        "- Never hallucinate data. Only reference findings that appear in the reports below.",
        "",
        "════════════════════════════════════════════════════════",
        "## DOCUMENT CONTEXT",
        "════════════════════════════════════════════════════════",
        f"Filename         : {filename}",
        f"Total Versions   : {total_versions}",
        f"Client Industry  : {client_industry}",
        f"Proposal Type    : {proposal_type}",
        "Client Priorities:",
        client_priorities,
    ]

    # ── Current (latest) version — full detail ──
    a4 = current.get("agent4_output") or {}
    lines += [
        "",
        "════════════════════════════════════════════════════════",
        f"## CURRENT VERSION — v{current.get('version_number', total_versions)} (FULL ANALYSIS)",
        "════════════════════════════════════════════════════════",
        "",
        "### Agent 4 — Chief Review Officer (Overall Assessment)",
        _fmt_agent4_full(a4),
        "",
        "### Agent 1 — Completeness & Clarity",
        _fmt_agent1(current.get("agent1_output") or {}),
        "",
        "### Agent 2 — Estimation & Commercial Integrity",
        _fmt_agent2(current.get("agent2_output") or {}),
        "",
        "### Agent 3 — Competitive Strength",
        _fmt_agent3(current.get("agent3_output") or {}),
    ]

    # ── Older versions — Agent 4 brief only ──
    if older:
        lines += [
            "",
            "════════════════════════════════════════════════════════",
            "## VERSION HISTORY (Agent 4 summaries)",
            "════════════════════════════════════════════════════════",
        ]
        for s in older:
            lines += [
                "",
                f"### v{s.get('version_number', '?')} — {s.get('original_filename', 'Untitled')}",
                f"Created: {(s.get('created_at') or '')[:10]}",
                _fmt_agent4_brief(s.get("agent4_output") or {}),
            ]

    lines += [
        "",
        "════════════════════════════════════════════════════════",
        "Answer all questions based strictly on the data above.",
        "════════════════════════════════════════════════════════",
    ]

    return "\n".join(lines)


# ── Database helpers ──────────────────────────────────────────────────────────

def _get_or_create_conversation(group_id: str, user_id: str) -> dict:
    db = get_supabase()
    res = (
        db.table(CHAT_TABLE)
        .select("*")
        .eq("group_id", group_id)
        .eq("user_id", user_id)
        .execute()
    )
    if res.data:
        return res.data[0]
    new = (
        db.table(CHAT_TABLE)
        .insert({"group_id": group_id, "user_id": user_id, "messages": []})
        .execute()
    )
    return new.data[0]


def _save_messages(group_id: str, user_id: str, messages: list) -> None:
    # Keep a rolling window so the DB column never bloats
    trimmed = messages[-MAX_HISTORY:] if len(messages) > MAX_HISTORY else messages
    get_supabase().table(CHAT_TABLE).update({"messages": trimmed}).eq(
        "group_id", group_id
    ).eq("user_id", user_id).execute()


def _fetch_sessions(group_id: str, user_id: str) -> list:
    res = (
        get_supabase()
        .table(SESSIONS_TABLE)
        .select(
            "id, original_filename, version_number, created_at, status, "
            "page_count, client_industry, proposal_type, client_priorities, "
            "agent1_output, agent2_output, agent3_output, agent4_output"
        )
        .eq("proposal_group_id", group_id)
        .eq("user_id", user_id)
        .order("version_number", desc=False)
        .execute()
    )
    return res.data or []


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/{group_id}")
async def get_conversation(
    group_id: str,
    authorization: Optional[str] = Header(None),
):
    user = await get_current_user(authorization)
    conv = await asyncio.get_event_loop().run_in_executor(
        _executor, _get_or_create_conversation, group_id, user["id"]
    )
    return {"messages": conv.get("messages") or []}


@router.delete("/{group_id}")
async def clear_conversation(
    group_id: str,
    authorization: Optional[str] = Header(None),
):
    user = await get_current_user(authorization)
    get_supabase().table(CHAT_TABLE).update({"messages": []}).eq(
        "group_id", group_id
    ).eq("user_id", user["id"]).execute()
    return {"ok": True}


@router.post("/{group_id}/message")
async def send_message(
    group_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    user = await get_current_user(authorization)
    body = await request.json()
    user_text = (body.get("message") or "").strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="message is required")

    loop = asyncio.get_event_loop()

    # Load conversation + sessions in parallel
    conv_fut     = loop.run_in_executor(_executor, _get_or_create_conversation, group_id, user["id"])
    sessions_fut = loop.run_in_executor(_executor, _fetch_sessions, group_id, user["id"])
    conv, sessions = await asyncio.gather(conv_fut, sessions_fut)

    if not sessions:
        raise HTTPException(status_code=404, detail="Document group not found or no completed analyses yet.")

    messages: list = list(conv.get("messages") or [])
    messages.append({"role": "user", "content": user_text})

    system_prompt = await loop.run_in_executor(_executor, build_system_prompt, sessions)

    # Sliding window to keep token count manageable
    api_messages = messages[-API_WINDOW:]

    async def _stream():
        full_response = ""
        try:
            client = await loop.run_in_executor(_executor, get_bedrock_client)

            request_payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 16000,
                "system": system_prompt,
                "messages": api_messages,
            }

            def _invoke_stream():
                return client.invoke_model_with_response_stream(
                    modelId=settings.bedrock_model_id,
                    contentType="application/json",
                    accept="application/json",
                    body=json.dumps(request_payload),
                )

            response = await loop.run_in_executor(_executor, _invoke_stream)
            event_stream = response.get("body")

            for event in event_stream:
                chunk = event.get("chunk")
                if not chunk:
                    continue
                data = json.loads(chunk["bytes"].decode("utf-8"))
                ev_type = data.get("type")

                if ev_type == "content_block_delta":
                    delta = data.get("delta", {})
                    if delta.get("type") == "text_delta":
                        text = delta.get("text", "")
                        if text:
                            full_response += text
                            yield f"data: {json.dumps({'type': 'delta', 'text': text})}\n\n"

                elif ev_type == "message_stop":
                    break

            # Persist complete conversation
            messages.append({"role": "assistant", "content": full_response})
            await loop.run_in_executor(
                _executor, _save_messages, group_id, user["id"], messages
            )
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":       "keep-alive",
        },
    )
