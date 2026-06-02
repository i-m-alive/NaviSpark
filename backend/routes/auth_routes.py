from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from models import RegisterRequest, LoginRequest, LoginResponse, UserResponse, RefreshRequest, RefreshResponse
from database import get_supabase
from auth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(body: RegisterRequest):
    """Registers a new user via Supabase Auth."""
    supabase = get_supabase()
    try:
        response = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {"full_name": body.full_name}
            }
        })

        if not response.user:
            raise HTTPException(status_code=400, detail="Registration failed. The email may already be in use.")

        return {
            "user_id": response.user.id,
            "email": response.user.email,
            "message": "Account created successfully. You can now log in."
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg.lower() or "already been registered" in error_msg.lower():
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
        raise HTTPException(status_code=400, detail=f"Registration failed: {error_msg}")


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    """Logs in a user. Returns the Supabase access token (JWT)."""
    supabase = get_supabase()
    try:
        response = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password
        })

        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        return LoginResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=response.user.id,
            email=response.user.email,
        )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e).lower()
        if "invalid" in error_msg or "credentials" in error_msg or "password" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(body: RefreshRequest):
    """Exchanges a valid refresh token for a new access + refresh token pair."""
    supabase = get_supabase()
    try:
        response = supabase.auth.refresh_session(body.refresh_token)
        if not response.session:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")
        return RefreshResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token refresh failed: {str(e)}")


@router.get("/me", response_model=UserResponse)
async def get_me(authorization: Optional[str] = Header(None)):
    """Returns the currently logged-in user's info, including admin status."""
    user = await get_current_user(authorization)
    db = get_supabase()
    try:
        admin_res = db.table("admins").select("user_id").eq("user_id", user["id"]).execute()
        is_admin = bool(admin_res.data)
    except Exception:
        is_admin = False
    return UserResponse(
        user_id=user["id"],
        email=user["email"],
        full_name=user.get("full_name"),
        avatar_url=user.get("avatar_url"),
        is_admin=is_admin,
    )


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Invalidates the current session token via Supabase."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"message": "Logged out"}

    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
    except Exception:
        pass

    return {"message": "Logged out successfully"}
