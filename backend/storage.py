from database import get_supabase

BUCKET_NAME = "navispark-uploads"

def upload_file_to_storage(storage_path: str, file_bytes: bytes, content_type: str = "application/pdf") -> str:
    """
    Uploads file_bytes to Supabase Storage at the given path.
    Returns the storage path on success.
    """
    supabase = get_supabase()

    try:
        supabase.storage.from_(BUCKET_NAME).remove([storage_path])
    except Exception:
        pass  # File doesn't exist yet, that's fine

    supabase.storage.from_(BUCKET_NAME).upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": content_type, "upsert": "true"}
    )

    return storage_path


def download_file_from_storage(storage_path: str) -> bytes:
    """Downloads a file from Supabase Storage. Returns raw bytes."""
    supabase = get_supabase()
    return supabase.storage.from_(BUCKET_NAME).download(storage_path)


def get_signed_url(storage_path: str, expires_in: int = 3600) -> str:
    """Generates a signed URL for downloading a private file."""
    supabase = get_supabase()
    response = supabase.storage.from_(BUCKET_NAME).create_signed_url(
        path=storage_path,
        expires_in=expires_in
    )
    return response["signedURL"]


def save_agent_output_to_storage(
    user_id: str,
    session_id: str,
    agent_name: str,
    json_data: dict,
    markdown_text: str,
) -> str:
    """
    Saves an agent's output as both JSON and Markdown to Supabase Storage.
    Path pattern: uploads/{user_id}/{session_id}/{agent_name}/output.{json|md}
    Returns the base folder path.
    """
    import json as _json

    base = f"uploads/{user_id}/{session_id}/{agent_name}"
    json_bytes = _json.dumps(json_data, indent=2).encode("utf-8")
    md_bytes = markdown_text.encode("utf-8")

    upload_file_to_storage(f"{base}/output.json", json_bytes, "application/json")
    upload_file_to_storage(f"{base}/output.md", md_bytes, "text/markdown")

    return base
