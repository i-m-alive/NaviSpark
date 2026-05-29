import json
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from typing import Optional
from models import UploadResponse, ReportUrlResponse
from auth import get_current_user
from storage import upload_file_to_storage, get_signed_url
from services.file_service import validate_and_detect, convert_pptx_to_pdf, count_pdf_pages
from pydantic import BaseModel
from typing import List as TypingList
from services.session_service import (
    create_session, update_session, get_session, get_user_sessions,
    delete_session, delete_sessions,
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

    # Step 5: Convert PPTX/PPT → PDF via CloudConvert; PDFs pass through as-is
    if detected_type in ("pptx", "ppt"):
        pdf_bytes = await convert_pptx_to_pdf(file_bytes, filename=original_filename)
        file_type_label = "pptx"
    else:
        pdf_bytes = file_bytes
        file_type_label = "pdf"

    # Step 6: Count pages in the final PDF
    page_count = count_pdf_pages(pdf_bytes)

    # Step 7: Create session row in DB
    session = create_session(
        user_id=user_id,
        original_filename=original_filename,
        file_type=file_type_label,
        page_count=page_count,
        client_industry=industry_list,
        proposal_type=proposal_type.strip(),
        client_priorities=priorities_list,
    )
    session_id = session["id"]

    # Step 8: Upload the PDF to Supabase Storage
    storage_path = f"uploads/{user_id}/{session_id}/document.pdf"
    upload_file_to_storage(storage_path, pdf_bytes, content_type="application/pdf")

    # Step 9: Update session
    update_session(session_id, user_id, {
        "storage_path": storage_path,
        "status": "ready"
    })

    return UploadResponse(
        session_id=session_id,
        page_count=page_count,
        file_type=file_type_label,
        status="ready",
        message=f"File uploaded successfully. {page_count} pages detected."
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
