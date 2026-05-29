from fastapi import HTTPException, Header
from typing import Optional
from database import get_supabase

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Validates the Supabase JWT Bearer token from the Authorization header.
    Returns the user dict: { id, email, ... }
    Raises HTTP 401 if token is missing or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.replace("Bearer ", "").strip()

    try:
        supabase = get_supabase()
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return {
            "id": response.user.id,
            "email": response.user.email,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")
