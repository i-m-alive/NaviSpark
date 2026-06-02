"""
Token usage persistence — save and retrieve per-agent Bedrock token counts.

Each agent's run() accumulates tokens via bedrock_client's thread-local
accumulator, then calls save_token_usage() once at the end of the pipeline.
"""

import logging
from database import get_supabase

logger = logging.getLogger(__name__)


def save_token_usage(
    session_id: str,
    agent_name: str,
    input_tokens: int,
    output_tokens: int,
) -> None:
    """
    Persists a single agent's token counts to the token_usage table.
    Non-fatal: logs a warning on failure so a DB hiccup never breaks the pipeline.
    """
    try:
        db = get_supabase()
        db.table("token_usage").insert({
            "session_id": session_id,
            "agent_name": agent_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
        }).execute()
        logger.info(
            "[TOKENS] saved — session: %s  agent: %-8s  in: %6d  out: %6d  total: %7d",
            session_id[:8], agent_name, input_tokens, output_tokens, input_tokens + output_tokens,
        )
    except Exception as exc:
        logger.warning("[TOKENS] Failed to save token usage (non-fatal): %s", exc)


def get_token_usage(session_id: str) -> list:
    """
    Returns all token usage records for a session, ordered by creation time.
    Returns [] on any DB error.
    """
    try:
        db = get_supabase()
        result = (
            db.table("token_usage")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        return result.data or []
    except Exception as exc:
        logger.warning("[TOKENS] Failed to fetch token usage: %s", exc)
        return []
