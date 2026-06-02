import json
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from typing import Optional
from models import UploadResponse, ReportUrlResponse, SessionTokenUsage
from auth import get_current_user
from storage import upload_file_to_storage, get_signed_url
from services.file_service import validate_and_detect, count_file_pages, CONTENT_TYPES, FILE_EXTENSIONS
from pydantic import BaseModel
from typing import List as TypingList
from services.session_service import (
    create_session, update_session, get_session, get_user_sessions,
    get_sessions_by_group, delete_session, delete_sessions,
)

router = APIRouter(tags=["sessions"])


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(..., description="PDF or PPTX/PPT file to review"),
    client_industry: str = Form(..., description='JSON array string, e.g. ["Fintech", "Healthcare"]'),
    proposal_type: str = Form(..., description='E.g. "Fixed Price"'),
    client_priorities: str = Form(..., description='JSON array string, e.g. ["Cost Certainty", "Innovation"]'),
    authorization: Optional[str] = Header(None),
):
    """
    Accepts a PDF or PowerPoint file and three context fields.
    Stores the original file as-is in Supabase Storage (PDF conversion deferred to Phase 2).
    """
    # Step 1: Auth
    user = await get_current_user(authorization)
    user_id = user["id"]

    # Step 2: Read file
    file_bytes = await file.read()
    original_filename = file.filename or "uploaded_file"

    # Step 3: Parse context fields
    try:
        industry_list = json.loads(client_industry)
        if not isinstance(industry_list, list) or len(industry_list) == 0:
            raise ValueError("client_industry must be a non-empty JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid client_industry: {str(e)}")

    try:
        priorities_list = json.loads(client_priorities)
        if not isinstance(priorities_list, list) or len(priorities_list) == 0:
            raise ValueError("client_priorities must be a non-empty JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid client_priorities: {str(e)}")

    if not proposal_type or len(proposal_type.strip()) == 0:
        raise HTTPException(status_code=400, detail="proposal_type is required")

    # Step 4: Detect MIME type and validate
    detected_type = validate_and_detect(file_bytes, original_filename)

    # Step 5: Count pages/slides (no conversion — store the original file as-is)
    page_count = count_file_pages(file_bytes, detected_type)

    # Step 6: Create session row in DB
    session = create_session(
        user_id=user_id,
        original_filename=original_filename,
        file_type=detected_type,
        page_count=page_count,
        client_industry=industry_list,
        proposal_type=proposal_type.strip(),
        client_priorities=priorities_list,
    )
    session_id = session["id"]

    # Step 7: Upload the original file to Supabase Storage (preserving its format)
    ext = FILE_EXTENSIONS[detected_type]
    storage_path = f"uploads/{user_id}/{session_id}/document.{ext}"
    upload_file_to_storage(storage_path, file_bytes, content_type=CONTENT_TYPES[detected_type])

    # Step 8: Update session
    update_session(session_id, user_id, {
        "storage_path": storage_path,
        "status": "ready"
    })

    label = "slides" if detected_type in ("pptx", "ppt") else "pages"
    return UploadResponse(
        session_id=session_id,
        page_count=page_count,
        file_type=detected_type,
        status="ready",
        message=f"File uploaded successfully. {page_count} {label} detected."
    )


@router.get("/sessions")
async def list_sessions(authorization: Optional[str] = Header(None)):
    """Returns all review sessions for the logged-in user, newest first."""
    user = await get_current_user(authorization)
    sessions = get_user_sessions(user["id"])
    return {"sessions": sessions, "count": len(sessions)}


@router.get("/sessions/{session_id}")
async def get_session_detail(
    session_id: str,
    authorization: Optional[str] = Header(None)
):
    """Returns full detail of a single session including all agent outputs."""
    user = await get_current_user(authorization)
    session = get_session(session_id, user["id"])
    return session


class BulkDeleteRequest(BaseModel):
    session_ids: TypingList[str]


@router.delete("/sessions/{session_id}", status_code=200)
async def delete_session_route(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """Permanently deletes a single proposal review. Ownership verified via JWT."""
    user = await get_current_user(authorization)
    delete_session(session_id, user["id"])
    return {"message": "Proposal deleted successfully.", "session_id": session_id}


@router.delete("/sessions", status_code=200)
async def bulk_delete_sessions(
    body: BulkDeleteRequest,
    authorization: Optional[str] = Header(None),
):
    """Bulk-deletes proposal reviews by ID list. Only the caller's own sessions are deleted."""
    if not body.session_ids:
        raise HTTPException(status_code=400, detail="session_ids must not be empty")
    user = await get_current_user(authorization)
    count = delete_sessions(body.session_ids, user["id"])
    return {"message": f"{count} proposal(s) deleted.", "deleted_count": count}


@router.post("/sessions/{session_id}/upload-revision")
async def upload_revision(
    session_id: str,
    file: UploadFile = File(..., description="Revised PDF or PPTX proposal"),
    authorization: Optional[str] = Header(None),
):
    """
    Uploads a revised version of an existing proposal.
    - Inherits client_industry, proposal_type, client_priorities from the parent.
    - Creates a new session linked to the same proposal_group_id.
    - Increments version_number automatically.
    - Returns the new session_id immediately (run /run-analysis separately).
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    # Parent session must exist and be complete
    parent = get_session(session_id, user_id)
    if parent.get("status") != "complete":
        raise HTTPException(
            status_code=400,
            detail="The original session must be complete before uploading a revision."
        )

    # Determine group and version
    group_id     = parent.get("proposal_group_id") or session_id
    all_versions = get_sessions_by_group(group_id, user_id)
    next_version = len(all_versions) + 1

    # Read + validate file
    file_bytes        = await file.read()
    original_filename = file.filename or "revised_proposal"
    detected_type     = validate_and_detect(file_bytes, original_filename)

    page_count = count_file_pages(file_bytes, detected_type)

    # Create new session row inheriting context from parent
    new_session = create_session(
        user_id           = user_id,
        original_filename = original_filename,
        file_type         = detected_type,
        page_count        = page_count,
        client_industry   = parent.get("client_industry") or [],
        proposal_type     = parent.get("proposal_type") or "",
        client_priorities = parent.get("client_priorities") or [],
        proposal_group_id = group_id,
        version_number    = next_version,
        parent_session_id = session_id,
    )
    new_session_id = new_session["id"]

    # Upload revised file to storage (preserving its original format)
    ext = FILE_EXTENSIONS[detected_type]
    storage_path = f"uploads/{user_id}/{new_session_id}/document.{ext}"
    upload_file_to_storage(storage_path, file_bytes, content_type=CONTENT_TYPES[detected_type])

    update_session(new_session_id, user_id, {
        "storage_path": storage_path,
        "status": "ready",
    })

    return {
        "session_id":     new_session_id,
        "version_number": next_version,
        "group_id":       group_id,
        "page_count":     page_count,
        "message":        f"Revision v{next_version} uploaded. Call /run-analysis to start.",
    }


@router.get("/sessions/{session_id}/history")
async def get_session_history(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Returns all versions of a proposal that share the same proposal_group_id,
    ordered oldest first. Includes agent4_output for each completed version
    so the frontend can render comparison views without extra round-trips.
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session  = get_session(session_id, user_id)
    group_id = session.get("proposal_group_id") or session_id
    versions = get_sessions_by_group(group_id, user_id)

    return {
        "group_id": group_id,
        "current_session_id": session_id,
        "versions": versions,
    }


@router.get("/sessions/{session_id}/source-file-url")
async def get_source_file_url(
    session_id: str,
    authorization: Optional[str] = Header(None)
):
    """Returns a 1-hour signed download URL for the original uploaded file (PDF or PPTX)."""
    user = await get_current_user(authorization)
    session = get_session(session_id, user["id"])

    if not session.get("storage_path"):
        raise HTTPException(
            status_code=404,
            detail="No source file found for this session."
        )

    download_url = get_signed_url(session["storage_path"], expires_in=3600)
    return {
        "download_url": download_url,
        "filename": session.get("original_filename", "document"),
        "file_type": session.get("file_type", "pdf"),
    }


@router.get("/sessions/{session_id}/token-usage", response_model=SessionTokenUsage)
async def get_session_token_usage(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Returns the token usage breakdown for a proposal analysis session.
    Includes per-agent counts (agent1–4) and session totals.
    """
    user = await get_current_user(authorization)
    get_session(session_id, user["id"])  # Verify session ownership

    from services.token_service import get_token_usage
    records = get_token_usage(session_id)

    total_input = sum(r["input_tokens"] for r in records)
    total_output = sum(r["output_tokens"] for r in records)

    return SessionTokenUsage(
        session_id=session_id,
        agents=records,
        total_input_tokens=total_input,
        total_output_tokens=total_output,
        total_tokens=total_input + total_output,
    )


@router.get("/sessions/{session_id}/report-url", response_model=ReportUrlResponse)
async def get_report_download_url(
    session_id: str,
    authorization: Optional[str] = Header(None)
):
    """Generates a 1-hour signed download URL for the session's PDF report."""
    user = await get_current_user(authorization)
    session = get_session(session_id, user["id"])

    if not session.get("report_storage_path"):
        raise HTTPException(
            status_code=404,
            detail="No report available for this session yet. Run the analysis first."
        )

    download_url = get_signed_url(session["report_storage_path"], expires_in=3600)
    return ReportUrlResponse(download_url=download_url)
