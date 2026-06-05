"""
Admin API — all endpoints require the caller to be in the `admins` table.
Uses the service_role client which bypasses RLS on all tables.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Header

from auth import get_current_user
from database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Auth helper ───────────────────────────────────────────────────────────────

async def require_admin(authorization: Optional[str]) -> dict:
    """Verify caller is authenticated AND is an admin. Raises 403 otherwise."""
    user = await get_current_user(authorization)
    db = get_supabase()
    result = db.table("admins").select("user_id").eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


def _to_iso(dt) -> Optional[str]:
    """Safely convert a datetime (aware or naive) or None to ISO string."""
    if dt is None:
        return None
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)


def _is_banned(banned_until) -> bool:
    """Return True if banned_until is set and in the future."""
    if banned_until is None:
        return False
    now = datetime.now(timezone.utc)
    if hasattr(banned_until, "tzinfo") and banned_until.tzinfo:
        return banned_until > now
    return banned_until > datetime.utcnow()


def _fetch_all_user_emails(db) -> dict:
    """
    Batch-fetch all user emails from Supabase auth in a single API call.
    Handles both list (older gotrue-py) and UserListResponse (newer gotrue-py).
    Returns {user_id: email} map. Empty dict on any failure.
    """
    try:
        raw = db.auth.admin.list_users(per_page=1000)
        if isinstance(raw, list):
            users = raw
        elif hasattr(raw, "users"):
            users = raw.users or []
        else:
            users = []
        return {str(u.id): (getattr(u, "email", None) or "") for u in users}
    except Exception as exc:
        logger.warning("[ADMIN] list_users() failed — emails will show as Unknown: %s", exc)
        return {}


# ── Check endpoint (used by frontend to detect admin status) ──────────────────

@router.get("/check")
async def admin_check(authorization: Optional[str] = Header(None)):
    """Returns {is_admin: true/false} for the current user. Never raises 403."""
    try:
        user = await get_current_user(authorization)
        db = get_supabase()
        result = db.table("admins").select("user_id").eq("user_id", user["id"]).execute()
        return {"is_admin": bool(result.data)}
    except Exception:
        return {"is_admin": False}


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(authorization: Optional[str] = Header(None)):
    """System-wide KPIs: users, sessions, tokens."""
    await require_admin(authorization)
    db = get_supabase()

    # User count — distinct user_ids across sessions + admins table
    try:
        sess_uids   = {r["user_id"] for r in (db.table("review_sessions").select("user_id").execute().data or []) if r.get("user_id")}
        admin_uids  = {r["user_id"] for r in (db.table("admins").select("user_id").execute().data or [])}
        total_users = len(sess_uids | admin_uids)
    except Exception:
        total_users = 0

    # Session stats
    sessions_res = db.table("review_sessions").select("id,status,created_at,updated_at").execute()
    sessions = sessions_res.data or []

    # Token stats
    tokens_res = db.table("token_usage").select("input_tokens,output_tokens,total_tokens,agent_name").execute()
    tokens = tokens_res.data or []

    total_input  = sum(t["input_tokens"]  for t in tokens)
    total_output = sum(t["output_tokens"] for t in tokens)

    by_agent = {}
    for t in tokens:
        a = t["agent_name"]
        if a not in by_agent:
            by_agent[a] = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
        by_agent[a]["input_tokens"]  += t["input_tokens"]
        by_agent[a]["output_tokens"] += t["output_tokens"]
        by_agent[a]["total_tokens"]  += t["total_tokens"]

    return {
        "total_users":        total_users,
        "total_sessions":     len(sessions),
        "complete_sessions":  sum(1 for s in sessions if s["status"] == "complete"),
        "running_sessions":   sum(1 for s in sessions if "running" in s.get("status", "")),
        "failed_sessions":    sum(1 for s in sessions if "failed" in s.get("status", "")),
        "total_input_tokens":  total_input,
        "total_output_tokens": total_output,
        "total_tokens":        total_input + total_output,
        "tokens_by_agent":     by_agent,
    }


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(authorization: Optional[str] = Header(None)):
    """All users with aggregated session + token counts."""
    await require_admin(authorization)
    db = get_supabase()

    # ── Collect user IDs from DB tables (always reliable) ─────────────────────
    sessions_res = db.table("review_sessions") \
        .select("id,user_id,status,created_at") \
        .execute()
    sessions_data = sessions_res.data or []

    tokens_res = db.table("token_usage") \
        .select("user_id,input_tokens,output_tokens,total_tokens") \
        .execute()
    tokens_data = tokens_res.data or []

    admins_res = db.table("admins").select("user_id").execute()
    admin_ids  = {a["user_id"] for a in (admins_res.data or [])}

    # All unique user IDs across sessions + token records + admins
    all_user_ids: set = set()
    all_user_ids.update(s["user_id"] for s in sessions_data if s.get("user_id"))
    all_user_ids.update(t["user_id"] for t in tokens_data  if t.get("user_id"))
    all_user_ids.update(admin_ids)

    # ── Aggregate sessions per user ────────────────────────────────────────────
    sess_by_user: dict = {}
    for s in sessions_data:
        uid = s["user_id"]
        if uid not in sess_by_user:
            sess_by_user[uid] = {"count": 0, "complete": 0, "latest": None}
        sess_by_user[uid]["count"] += 1
        if s["status"] == "complete":
            sess_by_user[uid]["complete"] += 1
        if not sess_by_user[uid]["latest"] or s["created_at"] > sess_by_user[uid]["latest"]:
            sess_by_user[uid]["latest"] = s["created_at"]

    # ── Aggregate tokens per user ──────────────────────────────────────────────
    tok_by_user: dict = {}
    for t in tokens_data:
        uid = t.get("user_id")
        if uid:
            if uid not in tok_by_user:
                tok_by_user[uid] = {"input": 0, "output": 0, "total": 0}
            tok_by_user[uid]["input"]  += t["input_tokens"]
            tok_by_user[uid]["output"] += t["output_tokens"]
            tok_by_user[uid]["total"]  += t["total_tokens"]

    # ── Batch-fetch user details in ONE call ──────────────────────────────────
    _EMPTY_AUTH = {
        "email": None, "name": None, "avatar_url": None,
        "created_at": None, "last_sign_in_at": None,
        "email_confirmed": False, "is_banned": False, "banned_until": None,
    }

    def _extract_auth_user(u) -> dict:
        """Safely pull fields from a gotrue User object regardless of version."""
        meta = {}
        try:
            meta = u.user_metadata or {}
        except Exception:
            pass
        return {
            "email":           getattr(u, "email", None),
            "name":            meta.get("full_name") or meta.get("name"),
            "avatar_url":      meta.get("avatar_url") or meta.get("picture"),
            "created_at":      _to_iso(getattr(u, "created_at", None)),
            "last_sign_in_at": _to_iso(getattr(u, "last_sign_in_at", None)),
            "email_confirmed": getattr(u, "email_confirmed_at", None) is not None
                               or getattr(u, "confirmed_at", None) is not None,
            "is_banned":       _is_banned(getattr(u, "banned_until", None)),
            "banned_until":    _to_iso(getattr(u, "banned_until", None)),
        }

    # Build a full user-object map in one list_users() call
    try:
        raw_all = db.auth.admin.list_users(per_page=1000)
        if isinstance(raw_all, list):
            _all_users = raw_all
        elif hasattr(raw_all, "users"):
            _all_users = raw_all.users or []
        else:
            _all_users = []
        auth_user_map = {str(u.id): u for u in _all_users}
    except Exception as exc:
        logger.warning("[ADMIN] list_users() failed: %s — falling back to per-user lookup", exc)
        auth_user_map = {}

    users = []
    for uid in all_user_ids:
        sess = sess_by_user.get(uid, {"count": 0, "complete": 0, "latest": None})
        tok  = tok_by_user.get(uid, {"input": 0, "output": 0, "total": 0})
        base = {
            "id":                  uid,
            "is_admin":            uid in admin_ids,
            "sessions_count":      sess["count"],
            "complete_sessions":   sess["complete"],
            "last_session_at":     sess["latest"],
            "total_input_tokens":  tok["input"],
            "total_output_tokens": tok["output"],
            "total_tokens":        tok["total"],
        }
        u = auth_user_map.get(uid)
        if u is None:
            # Fall back to per-user lookup for any user not in the bulk list
            try:
                res = db.auth.admin.get_user_by_id(uid)
                u = getattr(res, "user", None) or res
                if not hasattr(u, "email"):
                    u = None
            except Exception:
                u = None
        if u and hasattr(u, "email"):
            base.update(_extract_auth_user(u))
            logger.debug("[ADMIN] user %s → email=%s", uid[:8], base.get("email"))
        else:
            logger.warning("[ADMIN] Could not resolve email for user %s", uid[:8])
            base.update(_EMPTY_AUTH)
        users.append(base)

    users.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {"users": users, "count": len(users)}


@router.get("/users/{user_id}")
async def get_user(user_id: str, authorization: Optional[str] = Header(None)):
    """Single user detail with their sessions and token usage."""
    await require_admin(authorization)
    db = get_supabase()

    try:
        res = db.auth.admin.get_user_by_id(user_id)
        auth_user = getattr(res, "user", res)
        if not auth_user or not hasattr(auth_user, "email"):
            raise HTTPException(status_code=404, detail="User not found.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"User not found: {exc}")

    meta = getattr(auth_user, "user_metadata", None) or {}

    sessions_res = db.table("review_sessions") \
        .select("id,status,created_at,updated_at,original_filename,file_type,page_count,proposal_type,client_industry,agent4_output") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .execute()

    sessions = sessions_res.data or []
    session_ids = [s["id"] for s in sessions]

    tokens = []
    if session_ids:
        tokens_res = db.table("token_usage") \
            .select("*") \
            .in_("session_id", session_ids) \
            .order("created_at", desc=True) \
            .execute()
        tokens = tokens_res.data or []

    total_tokens = sum(t["total_tokens"] for t in tokens)

    return {
        "id":              user_id,
        "email":           getattr(auth_user, "email", None),
        "name":            meta.get("full_name") or meta.get("name"),
        "avatar_url":      meta.get("avatar_url") or meta.get("picture"),
        "created_at":      _to_iso(getattr(auth_user, "created_at", None)),
        "last_sign_in_at": _to_iso(getattr(auth_user, "last_sign_in_at", None)),
        "is_banned":       _is_banned(getattr(auth_user, "banned_until", None)),
        "sessions":        sessions,
        "token_records":   tokens,
        "total_tokens":    total_tokens,
    }


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, authorization: Optional[str] = Header(None)):
    """Permanently delete a user account and all their data."""
    admin = await require_admin(authorization)
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot delete their own account here.")
    db = get_supabase()
    try:
        db.auth.admin.delete_user(user_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {exc}")
    return {"message": "User deleted successfully.", "user_id": user_id}


@router.patch("/users/{user_id}/ban")
async def ban_user(user_id: str, authorization: Optional[str] = Header(None)):
    """Ban a user account (100-year duration)."""
    admin = await require_admin(authorization)
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot ban themselves.")
    db = get_supabase()
    try:
        db.auth.admin.update_user_by_id(user_id, {"ban_duration": "876600h"})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to ban user: {exc}")
    return {"message": "User banned successfully.", "user_id": user_id}


@router.patch("/users/{user_id}/unban")
async def unban_user(user_id: str, authorization: Optional[str] = Header(None)):
    """Lift a ban from a user account."""
    await require_admin(authorization)
    db = get_supabase()
    try:
        db.auth.admin.update_user_by_id(user_id, {"ban_duration": "none"})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to unban user: {exc}")
    return {"message": "User unbanned successfully.", "user_id": user_id}


@router.patch("/users/{user_id}/make-admin")
async def make_admin(user_id: str, authorization: Optional[str] = Header(None)):
    """Grant admin privileges to a user."""
    await require_admin(authorization)
    db = get_supabase()
    try:
        db.table("admins").upsert({"user_id": user_id}).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to grant admin: {exc}")
    return {"message": "Admin privileges granted.", "user_id": user_id}


@router.patch("/users/{user_id}/revoke-admin")
async def revoke_admin(user_id: str, authorization: Optional[str] = Header(None)):
    """Revoke admin privileges from a user."""
    admin = await require_admin(authorization)
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot revoke their own privileges.")
    db = get_supabase()
    try:
        db.table("admins").delete().eq("user_id", user_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to revoke admin: {exc}")
    return {"message": "Admin privileges revoked.", "user_id": user_id}


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_all_sessions(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """All sessions across all users, paginated."""
    await require_admin(authorization)
    db = get_supabase()

    query = db.table("review_sessions") \
        .select("id,user_id,status,created_at,updated_at,original_filename,file_type,page_count,proposal_type,client_industry,agent4_output") \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1)

    if status:
        query = query.eq("status", status)

    sessions_res = query.execute()
    sessions = sessions_res.data or []

    # Enrich sessions with user emails via batch lookup
    email_map = _fetch_all_user_emails(db)
    for s in sessions:
        uid = s.get("user_id", "")
        s["user_email"] = email_map.get(uid) or "Unknown"
        s["user_name"]  = None

    return {"sessions": sessions, "count": len(sessions), "offset": offset, "limit": limit}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, authorization: Optional[str] = Header(None)):
    """Admin: delete any session regardless of owner."""
    await require_admin(authorization)
    db = get_supabase()
    result = db.table("review_sessions").delete().eq("id", session_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"message": "Session deleted.", "session_id": session_id}


# ── Token Usage ───────────────────────────────────────────────────────────────

@router.get("/token-usage")
async def list_token_usage(
    limit: int = 100,
    offset: int = 0,
    authorization: Optional[str] = Header(None),
):
    """All token usage records across all sessions, enriched with user info."""
    await require_admin(authorization)
    db = get_supabase()

    tokens_res = db.table("token_usage") \
        .select("*") \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
    tokens = tokens_res.data or []

    # Collect unique session IDs and user IDs from token records
    session_ids = list({t["session_id"] for t in tokens})
    user_ids    = list({t["user_id"] for t in tokens if t.get("user_id")})

    # Fetch session filenames
    sessions_map: dict = {}
    if session_ids:
        s_res = db.table("review_sessions") \
            .select("id,original_filename") \
            .in_("id", session_ids) \
            .execute()
        for s in (s_res.data or []):
            sessions_map[s["id"]] = s

    # Fetch user emails via single batch call
    user_email_map = _fetch_all_user_emails(db)

    for t in tokens:
        uid  = t.get("user_id", "")
        sess = sessions_map.get(t["session_id"], {})
        t["user_email"]       = user_email_map.get(uid) or "Unknown"
        t["user_name"]        = ""
        t["session_filename"] = sess.get("original_filename", "—")

    # Overall totals
    all_tokens_res = db.table("token_usage").select("input_tokens,output_tokens,total_tokens").execute()
    all_tokens = all_tokens_res.data or []
    grand_input  = sum(t["input_tokens"]  for t in all_tokens)
    grand_output = sum(t["output_tokens"] for t in all_tokens)

    return {
        "records": tokens,
        "count": len(tokens),
        "grand_total_input_tokens":  grand_input,
        "grand_total_output_tokens": grand_output,
        "grand_total_tokens":        grand_input + grand_output,
    }


# ── Activity log (derived from sessions) ─────────────────────────────────────

@router.get("/activity")
async def get_activity(
    limit: int = 50,
    authorization: Optional[str] = Header(None),
):
    """Recent system activity derived from session events."""
    await require_admin(authorization)
    db = get_supabase()

    sessions_res = db.table("review_sessions") \
        .select("id,user_id,status,created_at,updated_at,original_filename,file_type,proposal_type") \
        .order("updated_at", desc=True) \
        .limit(limit) \
        .execute()
    sessions = sessions_res.data or []

    user_email_map = _fetch_all_user_emails(db)

    def _action_label(status: str) -> str:
        labels = {
            "uploading":        "Uploaded file",
            "ready":            "File ready for analysis",
            "pipeline_running": "Started analysis",
            "chunking":         "Processing large document",
            "analyzing_proposal": "Analysing proposal",
            "agents_complete":  "Specialist review done",
            "complete":         "Analysis completed",
            "pipeline_failed":  "Analysis failed",
            "cancelled":        "Analysis cancelled",
        }
        return labels.get(status, status.replace("_", " ").title())

    activities = []
    for s in sessions:
        uid = s.get("user_id", "")
        activities.append({
            "session_id":  s["id"],
            "user_id":     uid,
            "user_email":  user_email_map.get(uid, "Unknown"),
            "action":      _action_label(s.get("status", "")),
            "status":      s.get("status"),
            "filename":    s.get("original_filename"),
            "file_type":   s.get("file_type"),
            "proposal_type": s.get("proposal_type"),
            "timestamp":   s.get("updated_at") or s.get("created_at"),
        })

    return {"activities": activities, "count": len(activities)}
