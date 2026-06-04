"""
Custom Checklist Review Pipeline — API routes.

==========================================================================
REQUIRED DATABASE MIGRATION (run once in Supabase SQL Editor):
==========================================================================

  ALTER TABLE review_sessions
    ADD COLUMN IF NOT EXISTS review_mode TEXT DEFAULT 'standard';

  ALTER TABLE review_sessions
    ADD COLUMN IF NOT EXISTS checklist_storage_path TEXT;

  ALTER TABLE review_sessions
    ADD COLUMN IF NOT EXISTS nc1_user_overrides JSONB;

==========================================================================

Endpoints:
  POST /custom-upload
      Uploads proposal + checklist, creates session (review_mode='custom'),
      fires NC1+NC2 preflight as a background task.

  POST /sessions/{id}/run-custom-analysis
      Triggers NC3 fan-out + NC4 synthesis after user confirms context.

  POST /sessions/{id}/cancel-custom-analysis
      Sets status='cancelled' (pipeline checks this flag and stops).

  PATCH /sessions/{id}/nc1-context
      Lets the frontend save user-edited NC1 fields before triggering NC3.

  GET  /sessions/{id}/preflight-status
      Lightweight poll endpoint — returns status + NC1/NC2 summary.
"""

import json
import logging
import os

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, UploadFile, File, Form
from typing import Optional

from auth import get_current_user
from storage import upload_file_to_storage
from services.file_service import validate_and_detect, count_file_pages, CONTENT_TYPES, FILE_EXTENSIONS
from services.checklist_parser_service import checklist_ext_from_filename
from services.session_service import create_session, update_session, get_session
from services.custom_pipeline_service import run_preflight, run_custom_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(tags=["custom-checklist"])

# Reuses existing valid status values from the DB CHECK constraint.
# 'uploading'      = files stored, NC1+NC2 preflight running in background
# 'ready'          = preflight done, waiting for user to confirm context
# 'pipeline_running' = NC3+NC4 evaluation running
_PREFLIGHT_STATUSES = ("uploading",)
_RUNNING_STATUSES = ("pipeline_running",)
_TERMINAL_STATUSES = ("complete", "pipeline_failed", "cancelled")

CHECKLIST_CONTENT_TYPES = {
    ".xlsx":  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xlsm":  "application/vnd.ms-excel.sheet.macroEnabled.12",
    ".csv":   "text/csv",
    ".docx":  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pdf":   "application/pdf",
}


# ── POST /custom-upload ───────────────────────────────────────────────────────

@router.post("/custom-upload")
async def custom_upload(
    background_tasks: BackgroundTasks,
    proposal: UploadFile = File(..., description="Proposal file — PDF or PPTX"),
    checklist: UploadFile = File(..., description="Evaluation checklist — Excel, CSV, DOCX, or PDF"),
    authorization: Optional[str] = Header(None),
):
    """
    Upload a proposal + a custom evaluation checklist.

    Creates a session with review_mode='custom' and fires NC1+NC2 preflight
    as a background task. The frontend should poll GET /sessions/{id} until
    status = 'ready', then show the context confirmation panel.

    Returns: { session_id, status, message }
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    # ── Read both files ───────────────────────────────────────────────────────
    proposal_bytes = await proposal.read()
    checklist_bytes = await checklist.read()
    proposal_filename = proposal.filename or "proposal"
    checklist_filename = checklist.filename or "checklist"

    if not proposal_bytes:
        raise HTTPException(status_code=400, detail="Proposal file is empty.")
    if not checklist_bytes:
        raise HTTPException(status_code=400, detail="Checklist file is empty.")

    # ── Validate proposal ─────────────────────────────────────────────────────
    detected_type = validate_and_detect(proposal_bytes, proposal_filename)
    page_count = count_file_pages(proposal_bytes, detected_type)

    # ── Validate checklist format ─────────────────────────────────────────────
    try:
        checklist_ext = checklist_ext_from_filename(checklist_filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    checklist_size_kb = len(checklist_bytes) / 1024
    if checklist_size_kb > 5_120:  # 5 MB limit
        raise HTTPException(
            status_code=413,
            detail="Checklist file exceeds the 5 MB size limit. Please reduce the file size.",
        )

    # ── Create session ────────────────────────────────────────────────────────
    session = create_session(
        user_id=user_id,
        original_filename=proposal_filename,
        file_type=detected_type,
        page_count=page_count,
        client_industry=["Unknown"],      # NC1 will auto-detect; placeholder for schema compat
        proposal_type="Unknown",
        client_priorities=["Unknown"],
    )
    session_id = session["id"]

    # ── Upload proposal to Supabase Storage ───────────────────────────────────
    proposal_ext = FILE_EXTENSIONS[detected_type]
    proposal_storage_path = f"uploads/{user_id}/{session_id}/document.{proposal_ext}"
    upload_file_to_storage(
        proposal_storage_path, proposal_bytes, content_type=CONTENT_TYPES[detected_type]
    )

    # ── Upload checklist to Supabase Storage ──────────────────────────────────
    checklist_storage_path = f"uploads/{user_id}/{session_id}/checklist{checklist_ext}"
    checklist_ct = CHECKLIST_CONTENT_TYPES.get(checklist_ext, "application/octet-stream")
    upload_file_to_storage(checklist_storage_path, checklist_bytes, content_type=checklist_ct)

    # ── Update session with paths + review_mode ───────────────────────────────
    update_session(session_id, user_id, {
        "storage_path": proposal_storage_path,
        "review_mode": "custom",
        "checklist_storage_path": checklist_storage_path,
        "status": "uploading",
    })

    # ── Fire NC1+NC2 preflight as background task ─────────────────────────────
    background_tasks.add_task(run_preflight, session_id, user_id)

    logger.info(
        "[CUSTOM-UPLOAD] session=%s user=%s proposal=%s checklist=%s",
        session_id[:8], user_id[:8], proposal_filename, checklist_filename,
    )

    return {
        "session_id": session_id,
        "status": "uploading",
        "proposal_filename": proposal_filename,
        "checklist_filename": checklist_filename,
        "page_count": page_count,
        "message": (
            "Files uploaded. NC1 + NC2 pre-flight running in background. "
            "Poll GET /sessions/{id} until status='ready'."
        ),
    }


# ── GET /sessions/{id}/preflight-status ──────────────────────────────────────

@router.get("/sessions/{session_id}/preflight-status")
async def get_preflight_status(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Lightweight poll endpoint for the custom upload page.
    Returns status + a summary of NC1/NC2 outputs (no full JSON to keep payload small).
    """
    user = await get_current_user(authorization)
    user_id = user["id"]
    session = get_session(session_id, user_id)

    nc1 = session.get("agent1_output") or {}
    nc2 = session.get("agent2_output") or {}

    nc1_summary = None
    if nc1:
        ad = nc1.get("auto_detected", {})
        nc1_summary = {
            "client_industry": ad.get("client_industry", []),
            "proposal_type": ad.get("proposal_type"),
            "client_priorities": ad.get("client_priorities", []),
            "client_name": ad.get("client_name"),
            "vendor_name": ad.get("vendor_name"),
            "project_name": ad.get("project_name"),
            "proposed_timeline": ad.get("proposed_timeline"),
            "budget_range": ad.get("budget_range"),
            "team_size": ad.get("team_size"),
            "delivery_methodology": ad.get("delivery_methodology"),
            "confidence": nc1.get("confidence", 0),
            "structure_sections": nc1.get("structure_map", {}).get("sections", []),
            "quality_scan": nc1.get("quality_scan", {}),
        }

    nc2_summary = None
    if nc2:
        nc2_summary = {
            "total_items": nc2.get("total_items", 0),
            "scoring_type": nc2.get("scoring_type"),
            "weights_source": nc2.get("weights_source"),
            "format": nc2.get("format"),
            "parse_warnings": nc2.get("parse_warnings", []),
            "categories": [
                {
                    "id": c.get("id"),
                    "name": c.get("name"),
                    "item_count": c.get("item_count", 0),
                    "weight": c.get("weight", 0),
                }
                for c in nc2.get("categories", [])
            ],
        }

    return {
        "session_id": session_id,
        "status": session.get("status"),
        "review_mode": session.get("review_mode", "custom"),
        "nc1_summary": nc1_summary,
        "nc2_summary": nc2_summary,
    }


# ── POST /sessions/{id}/confirm-nc1-context ──────────────────────────────────

@router.post("/sessions/{session_id}/confirm-nc1-context")
async def confirm_nc1_context(
    session_id: str,
    body: dict,
    authorization: Optional[str] = Header(None),
):
    """
    Merge the user-confirmed/edited NC1 context directly into agent1_output
    BEFORE the evaluation starts.  No extra DB columns required.

    Body: { "client_industry": [...], "proposal_type": "...", "client_name": "...", ... }

    Only non-empty values override the auto-detected ones.
    Sets confidence = 1.0 and user_confirmed = True so the results page
    shows that the context was manually verified.
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)

    nc1_output: dict = session.get("agent1_output") or {}

    # Merge confirmed values into auto_detected — only non-empty values
    auto = nc1_output.get("auto_detected", {})
    for key, value in body.items():
        # Accept any truthy value OR explicit empty-list reset
        if value is not None and value != "":
            auto[key] = value

    nc1_output["auto_detected"]        = auto
    nc1_output["user_confirmed"]        = True
    nc1_output["original_confidence"]   = nc1_output.get("confidence", 0.0)
    nc1_output["confidence"]            = 1.0   # user-confirmed = 100% reliable

    update_session(session_id, user_id, {"agent1_output": nc1_output})

    logger.info(
        "[CONFIRM-NC1] session=%s user_id=%s updated fields=%s",
        session_id[:8], user_id[:8], list(body.keys()),
    )
    return {"session_id": session_id, "status": "confirmed", "fields_updated": list(body.keys())}


# ── PATCH /sessions/{id}/nc1-context (legacy — kept for compatibility) ────────

@router.patch("/sessions/{session_id}/nc1-context")
async def patch_nc1_context_legacy(
    session_id: str,
    body: dict,
    authorization: Optional[str] = Header(None),
):
    """Deprecated — redirects to confirm-nc1-context."""
    return await confirm_nc1_context(session_id, body, authorization)


# ── POST /sessions/{id}/run-custom-analysis ───────────────────────────────────

@router.post("/sessions/{session_id}/run-custom-analysis")
async def run_custom_analysis(
    session_id: str,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
):
    """
    Trigger NC3 fan-out + NC4 synthesis (Stage 2 of the custom pipeline).
    Prerequisite: status must be 'ready' (preflight complete).

    Returns immediately; poll GET /sessions/{id} for status updates.
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)
    status = session.get("status", "")

    if status == "complete":
        return {
            "session_id": session_id,
            "status": "complete",
            "nc4_output": session.get("agent4_output"),
            "message": "Analysis already complete.",
        }

    if status in _RUNNING_STATUSES:
        return {
            "session_id": session_id,
            "status": status,
            "message": "Pipeline already running. Poll GET /sessions/{id} for updates.",
        }

    if status in _PREFLIGHT_STATUSES:
        return {
            "session_id": session_id,
            "status": status,
            "message": "Pre-flight still running. Wait for status='ready' first.",
        }

    if status == "pipeline_failed":
        # Allow restart after failure — re-fire preflight if NC1/NC2 missing
        nc1 = session.get("agent1_output")
        nc2 = session.get("agent2_output")
        if not nc1 or not nc2:
            update_session(session_id, user_id, {"status": "uploading"})
            background_tasks.add_task(run_preflight, session_id, user_id)
            return {
                "session_id": session_id,
                "status": "uploading",
                "message": "Re-running pre-flight after failure.",
            }

    if status not in ("ready", "pipeline_failed"):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot start evaluation. Session status is '{status}'. "
                "Wait for pre-flight to complete (status='ready') first."
            ),
        )

    if not session.get("agent1_output") or not session.get("agent2_output"):
        raise HTTPException(
            status_code=400,
            detail="NC1 and NC2 outputs are missing. Re-run the pre-flight step.",
        )

    background_tasks.add_task(run_custom_pipeline, session_id, user_id)

    return {
        "session_id": session_id,
        "status": "pipeline_started",
        "message": (
            "Custom evaluation pipeline started. "
            "Poll GET /sessions/{id} for updates."
        ),
    }


# ── POST /sessions/{id}/cancel-custom-analysis ───────────────────────────────

@router.post("/sessions/{session_id}/cancel-custom-analysis")
async def cancel_custom_analysis(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Request cancellation of a running custom pipeline.
    The pipeline checks this flag at each checkpoint and stops early.
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)
    current_status = session.get("status", "")

    if current_status == "cancelled":
        return {"session_id": session_id, "status": "cancelled", "message": "Already cancelled."}
    if current_status in _TERMINAL_STATUSES:
        return {"session_id": session_id, "status": current_status, "message": "Pipeline already finished."}
    if current_status not in ("pipeline_running", "uploading"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel: session status is '{current_status}'.",
        )

    update_session(session_id, user_id, {"status": "cancelled"})
    return {
        "session_id": session_id,
        "status": "cancelled",
        "message": "Cancellation requested. The pipeline will stop at the next checkpoint.",
    }


# ── POST /sessions/{id}/re-run-custom ────────────────────────────────────────

@router.post("/sessions/{session_id}/re-run-custom")
async def re_run_custom(
    session_id: str,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
):
    """
    Reset a completed/failed custom session and re-run the full pipeline
    (NC1+NC2 preflight → NC3+NC4).
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)
    status = session.get("status", "")

    if status in ("uploading", "pipeline_running"):
        return {
            "session_id": session_id,
            "status": status,
            "message": "Pipeline already running.",
        }

    update_session(session_id, user_id, {
        "status": "uploading",
        "agent1_output": None,
        "agent2_output": None,
        "agent3_output": None,
        "agent4_output": None,
        "nc1_user_overrides": None,
    })

    background_tasks.add_task(run_preflight, session_id, user_id)
    return {
        "session_id": session_id,
        "status": "uploading",
        "message": "Custom pipeline re-started. NC1+NC2 pre-flight running in background.",
    }
