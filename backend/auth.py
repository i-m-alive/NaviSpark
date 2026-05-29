from fastapi import HTTPException, Header
from typing import Optional
from database import get_supabase


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Validates the Supabase JWT Bearer token.
    Returns the user dict including display name and avatar from OAuth metadata.

    Metadata fields populated by Supabase per provider:
      Google  — full_name, name, given_name, avatar_url, picture
      GitHub  — full_name, name, user_name, avatar_url
      Email   — full_name (set during registration)
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.replace("Bearer ", "").strip()

    try:
        supabase = get_supabase()
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user = response.user
        meta = user.user_metadata or {}

        # Prefer full_name → name (both Google and GitHub set at least one of these)
        display_name = meta.get("full_name") or meta.get("name") or None

        # Prefer avatar_url → picture (Google uses "picture", GitHub uses "avatar_url")
        avatar_url = meta.get("avatar_url") or meta.get("picture") or None

        return {
            "id":         user.id,
            "email":      user.email,
            "full_name":  display_name,
            "avatar_url": avatar_url,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")
