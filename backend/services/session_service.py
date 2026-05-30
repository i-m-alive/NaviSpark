from database import get_supabase
from fastapi import HTTPException
from typing import List, Optional

TABLE = "review_sessions"


def create_session(
    user_id: str,
    original_filename: str,
    file_type: str,
    page_count: int,
    client_industry: List[str],
    proposal_type: str,
    client_priorities: List[str],
    proposal_group_id: Optional[str] = None,
    version_number: int = 1,
    parent_session_id: Optional[str] = None,
) -> dict:
    """Inserts a new row in review_sessions and returns the full row dict."""
    supabase = get_supabase()
    data = {
        "user_id": user_id,
        "original_filename": original_filename,
        "file_type": file_type,
        "page_count": page_count,
        "client_industry": client_industry,
        "proposal_type": proposal_type,
        "client_priorities": client_priorities,
        "status": "uploading",
        "version_number": version_number,
    }
    if proposal_group_id:
        data["proposal_group_id"] = proposal_group_id
    if parent_session_id:
        data["parent_session_id"] = parent_session_id

    response = supabase.table(TABLE).insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create review session in database")

    row = response.data[0]

    # If no group id supplied (v1 / first upload), the session is its own group root
    if not proposal_group_id:
        supabase.table(TABLE).update({"proposal_group_id": row["id"]}).eq("id", row["id"]).execute()
        row["proposal_group_id"] = row["id"]

    return row


def update_session(session_id: str, user_id: str, updates: dict) -> dict:
    """Updates a session row. Verifies ownership via user_id."""
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .update(updates)
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Session not found or access denied")
    return response.data[0]


def get_session(session_id: str, user_id: str) -> dict:
    """Fetches a single session by ID. Raises 404 if not found or not owned by user."""
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Session not found or access denied")
    return response.data


def get_sessions_by_group(group_id: str, user_id: str) -> List[dict]:
    """Returns all versions that share a proposal_group_id, oldest first."""
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .select(
            "id, created_at, status, original_filename, file_type, page_count, "
            "version_number, proposal_group_id, parent_session_id, "
            "agent4_output, report_storage_path"
        )
        .eq("proposal_group_id", group_id)
        .eq("user_id", user_id)
        .order("version_number", desc=False)
        .execute()
    )
    return response.data or []


def delete_session(session_id: str, user_id: str) -> None:
    """Deletes a single session. Raises 404 if not found or not owned by user."""
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .delete()
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Session not found or access denied")


def delete_sessions(session_ids: List[str], user_id: str) -> int:
    """Bulk-deletes sessions by ID list. Only deletes rows owned by user_id. Returns count deleted."""
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .delete()
        .in_("id", session_ids)
        .eq("user_id", user_id)
        .execute()
    )
    return len(response.data or [])


def get_user_sessions(user_id: str) -> List[dict]:
    """Returns all sessions for a user, ordered by created_at descending."""
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .select(
            "id, created_at, updated_at, status, original_filename, file_type, "
            "page_count, client_industry, proposal_type, client_priorities, agent4_output, "
            "version_number, proposal_group_id, parent_session_id"
        )
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []
