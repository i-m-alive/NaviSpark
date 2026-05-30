from supabase import create_client, Client
from config import settings

_client: Client | None = None

def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client

def reset_supabase() -> None:
    """Discard the cached client so the next get_supabase() creates a fresh one.
    Call this after a network-level failure to avoid reusing a broken HTTP/2 connection."""
    global _client
    _client = None
