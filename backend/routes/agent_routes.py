from fastapi import APIRouter, BackgroundTasks, HTTPException, Header
from typing import Optional

from auth import get_current_user
from storage import download_file_from_storage, upload_file_to_storage, get_signed_url, save_agent_output_to_storage
from agents.agent1 import run as run_agent1_analysis
from agents.agent2 import run as run_agent2_analysis
from agents.agent3 import run as run_agent3_analysis
from agents.agent4 import run as run_agent4_analysis
from agents.agent5 import run as run_agent5_analysis
from agents.agent5.markdown_formatter import format_to_markdown as _a5_md
from services.session_service import get_session, update_session, create_session, get_sessions_by_group
from services.pipeline_service import run_full_pipeline
from services.pptx_modifier import apply_modifications
from services.pptx_extractor import extract_slide_map
from services.file_service import count_file_pages
from services.chunking_service import prepare_document_context
from services import event_emitter

router = APIRouter(tags=["agents"])

# ── Automated Pipeline ────────────────────────────────────────────────────────

_PIPELINE_STATUSES = ("pipeline_running", "agents_complete", "complete")
_READY_STATUSES = ("ready", "pipeline_failed", "cancelled")


@router.post("/sessions/{session_id}/run-analysis")
async def run_analysis(
    session_id: str,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
):
    """
    Starts the full automated pipeline:
      Agents 1, 2, 3 run in parallel → Agent 4 runs after all three complete.
    Returns immediately; the pipeline runs as a background task.
    Poll GET /sessions/{id} for status updates.

    Idempotent: returns current status if pipeline is already running or done.
    Status: pipeline_failed allows restart.
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)
    status = session.get("status", "")

    # Already complete — return Agent 4 output immediately
    if status == "complete":
        return {
            "session_id": session_id,
            "status": "complete",
            "agent4_output": session.get("agent4_output"),
            "message": "Analysis already complete.",
        }

    # In progress — tell the frontend to keep polling
    if status in _PIPELINE_STATUSES:
        return {
            "session_id": session_id,
            "status": status,
            "message": "Pipeline already running. Poll GET /sessions/{id} for updates.",
        }

    # Must be 'ready' or 'pipeline_failed' to start/restart
    if status not in _READY_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start analysis. Session status is '{status}'. "
                   "Upload a document first.",
        )

    if not session.get("storage_path"):
        raise HTTPException(
            status_code=400,
            detail="No file found for this session. Please re-upload the document.",
        )

    # Fire pipeline as a background task and return immediately
    background_tasks.add_task(run_full_pipeline, session_id, user_id)

    return {
        "session_id": session_id,
        "status": "pipeline_started",
        "message": "Analysis pipeline started. Poll GET /sessions/{id} for updates.",
    }


@router.post("/sessions/{session_id}/cancel-analysis")
async def cancel_analysis(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Requests cancellation of a running analysis pipeline.

    Sets the session status to 'cancelled'. The pipeline checks this flag at
    each checkpoint (after specialist agents, before Agent 4) and stops early.
    In-flight Bedrock calls cannot be interrupted but no new work will start.

    Only valid when status is 'pipeline_running' or 'agents_complete'.
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)
    current_status = session.get("status", "")

    # Already cancelled — idempotent
    if current_status == "cancelled":
        return {"session_id": session_id, "status": "cancelled", "message": "Already cancelled."}

    # Already finished — race condition: pipeline completed before request arrived
    if current_status in ("complete", "pipeline_failed"):
        return {"session_id": session_id, "status": current_status, "message": "Pipeline already finished."}

    if current_status not in ("pipeline_running", "agents_complete"):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot cancel: session status is '{current_status}'. "
                "Upload a document and start analysis first."
            ),
        )

    update_session(session_id, user_id, {"status": "cancelled"})

    return {
        "session_id": session_id,
        "status": "cancelled",
        "message": "Cancellation requested. The pipeline will stop at the next checkpoint.",
    }


@router.post("/sessions/{session_id}/re-analyse")
async def re_analyse(
    session_id: str,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
):
    """
    Resets a completed (or failed/cancelled) session back to 'ready' and
    re-fires the full analysis pipeline, overwriting previous agent outputs.
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)
    status = session.get("status", "")

    if status in ("pipeline_running", "agents_complete"):
        return {
            "session_id": session_id,
            "status": status,
            "message": "Pipeline already running. Poll GET /sessions/{id} for updates.",
        }

    if not session.get("storage_path"):
        raise HTTPException(
            status_code=400,
            detail="No file found for this session. Please re-upload the document.",
        )

    # Clear previous outputs and reset to ready
    update_session(session_id, user_id, {
        "status": "ready",
        "agent1_output": None,
        "agent2_output": None,
        "agent3_output": None,
        "agent4_output": None,
    })

    background_tasks.add_task(run_full_pipeline, session_id, user_id)

    return {
        "session_id": session_id,
        "status": "pipeline_started",
        "message": "Re-analysis started. Poll GET /sessions/{id} for updates.",
    }


@router.post("/sessions/{session_id}/run-agent1")
async def run_agent1(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Triggers Agent 1 (Completeness & Clarity) on the uploaded proposal.
    Returns cached result immediately if already run (idempotent).
    Typical duration: 10–20 seconds depending on PDF size.
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)

    if session.get("status") not in ("ready", "agent1_complete", "agent2_complete", "agent3_complete", "agents_complete", "complete"):
        raise HTTPException(
            status_code=400,
            detail=f"Session not ready for analysis. Current status: {session.get('status')}.",
        )

    if not session.get("storage_path"):
        raise HTTPException(
            status_code=400,
            detail="No file found for this session. Please re-upload the document.",
        )

    # Idempotent — return cached result if already exists
    if session.get("agent1_output"):
        return {
            "session_id": session_id,
            "agent1_output": session["agent1_output"],
            "cached": True,
            "message": "Returning cached Agent 1 result.",
        }

    # Download the file from Supabase Storage
    try:
        pdf_bytes = download_file_from_storage(session["storage_path"])
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download proposal from storage: {str(e)}",
        )

    if not pdf_bytes or len(pdf_bytes) == 0:
        raise HTTPException(status_code=500, detail="Downloaded file is empty. Please re-upload.")

    # Extract context from session
    file_type = session.get("file_type") or "pdf"
    client_industry = session.get("client_industry") or []
    proposal_type = session.get("proposal_type") or ""
    client_priorities = session.get("client_priorities") or []

    # Chunking gate — large documents are pre-summarised before the agent call
    page_count = session.get("page_count") or count_file_pages(pdf_bytes, file_type)
    pre_processed_context = prepare_document_context(
        pdf_bytes, file_type, page_count,
        client_industry, proposal_type, client_priorities,
        session_id[:8],
    )

    # Run Agent 1 — all skill orchestration is inside agents/agent1/agent.py
    try:
        agent1_result = run_agent1_analysis(
            pdf_bytes=pdf_bytes,
            file_type=file_type,
            client_industry=client_industry,
            proposal_type=proposal_type,
            client_priorities=client_priorities,
            pre_processed_context=pre_processed_context,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Unexpected error during analysis: {str(e)}")

    # Store result and update status
    update_session(session_id, user_id, {
        "agent1_output": agent1_result,
        "status": "agent1_complete",
    })

    return {
        "session_id": session_id,
        "agent1_output": agent1_result,
        "cached": False,
        "message": "Agent 1 analysis complete.",
    }


@router.post("/sessions/{session_id}/run-agent2")
async def run_agent2(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Triggers Agent 2 (Estimation & Commercial Integrity) on the uploaded proposal.
    Returns cached result immediately if already run (idempotent).
    Typical duration: 10–20 seconds depending on PDF size.
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)

    if session.get("status") not in ("ready", "agent1_complete", "agent2_complete", "agent3_complete", "agents_complete", "complete"):
        raise HTTPException(
            status_code=400,
            detail=f"Session not ready for analysis. Current status: {session.get('status')}.",
        )

    if not session.get("storage_path"):
        raise HTTPException(
            status_code=400,
            detail="No file found for this session. Please re-upload the document.",
        )

    # Idempotent — return cached result if already exists
    if session.get("agent2_output"):
        return {
            "session_id": session_id,
            "agent2_output": session["agent2_output"],
            "cached": True,
            "message": "Returning cached Agent 2 result.",
        }

    # Download the file from Supabase Storage
    try:
        pdf_bytes = download_file_from_storage(session["storage_path"])
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download proposal from storage: {str(e)}",
        )

    if not pdf_bytes or len(pdf_bytes) == 0:
        raise HTTPException(status_code=500, detail="Downloaded file is empty. Please re-upload.")

    # Extract context from session
    file_type = session.get("file_type") or "pdf"
    client_industry = session.get("client_industry") or []
    proposal_type = session.get("proposal_type") or ""
    client_priorities = session.get("client_priorities") or []

    # Chunking gate — large documents are pre-summarised before the agent call
    page_count = session.get("page_count") or count_file_pages(pdf_bytes, file_type)
    pre_processed_context = prepare_document_context(
        pdf_bytes, file_type, page_count,
        client_industry, proposal_type, client_priorities,
        session_id[:8],
    )

    # Run Agent 2 — all skill orchestration is inside agents/agent2/agent.py
    try:
        agent2_result = run_agent2_analysis(
            pdf_bytes=pdf_bytes,
            file_type=file_type,
            client_industry=client_industry,
            proposal_type=proposal_type,
            client_priorities=client_priorities,
            pre_processed_context=pre_processed_context,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Unexpected error during analysis: {str(e)}")

    # Store result and update status
    update_session(session_id, user_id, {
        "agent2_output": agent2_result,
        "status": "agent2_complete",
    })

    return {
        "session_id": session_id,
        "agent2_output": agent2_result,
        "cached": False,
        "message": "Agent 2 analysis complete.",
    }


@router.post("/sessions/{session_id}/run-agent3")
async def run_agent3(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Triggers Agent 3 (Competitive Strength) on the uploaded proposal.
    Returns cached result immediately if already run (idempotent).
    Typical duration: 10–20 seconds depending on PDF size.
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)

    if session.get("status") not in ("ready", "agent1_complete", "agent2_complete", "agent3_complete", "agents_complete", "complete"):
        raise HTTPException(
            status_code=400,
            detail=f"Session not ready for analysis. Current status: {session.get('status')}.",
        )

    if not session.get("storage_path"):
        raise HTTPException(
            status_code=400,
            detail="No file found for this session. Please re-upload the document.",
        )

    # Idempotent — return cached result if already exists
    if session.get("agent3_output"):
        return {
            "session_id": session_id,
            "agent3_output": session["agent3_output"],
            "cached": True,
            "message": "Returning cached Agent 3 result.",
        }

    # Download the file from Supabase Storage
    try:
        pdf_bytes = download_file_from_storage(session["storage_path"])
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download proposal from storage: {str(e)}",
        )

    if not pdf_bytes or len(pdf_bytes) == 0:
        raise HTTPException(status_code=500, detail="Downloaded file is empty. Please re-upload.")

    # Extract context from session
    file_type = session.get("file_type") or "pdf"
    client_industry = session.get("client_industry") or []
    proposal_type = session.get("proposal_type") or ""
    client_priorities = session.get("client_priorities") or []

    # Chunking gate — large documents are pre-summarised before the agent call
    page_count = session.get("page_count") or count_file_pages(pdf_bytes, file_type)
    pre_processed_context = prepare_document_context(
        pdf_bytes, file_type, page_count,
        client_industry, proposal_type, client_priorities,
        session_id[:8],
    )

    # Run Agent 3 — all skill orchestration is inside agents/agent3/agent.py
    try:
        agent3_result = run_agent3_analysis(
            pdf_bytes=pdf_bytes,
            file_type=file_type,
            client_industry=client_industry,
            proposal_type=proposal_type,
            client_priorities=client_priorities,
            pre_processed_context=pre_processed_context,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Unexpected error during analysis: {str(e)}")

    # Store result and update status
    update_session(session_id, user_id, {
        "agent3_output": agent3_result,
        "status": "agent3_complete",
    })

    return {
        "session_id": session_id,
        "agent3_output": agent3_result,
        "cached": False,
        "message": "Agent 3 analysis complete.",
    }


@router.post("/sessions/{session_id}/run-agent4")
async def run_agent4(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Triggers Agent 4 (Chief Proposal Review Officer / Aggregator).

    Prerequisites: Agent 1, Agent 2, and Agent 3 must all be complete.
    Returns cached result immediately if already run (idempotent).

    Agent 4 does NOT receive the PDF — it works purely from the three
    stored JSON outputs. Makes one text-only Bedrock call for synthesis
    (Tasks 4.2, 4.4, 4.6) after running pure-Python pre-computations
    (Tasks 4.1, 4.3, 4.5).

    Typical duration: 10–20 seconds.
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)

    # ── Idempotent: return cached result if already exists ────────────────────
    if session.get("agent4_output"):
        return {
            "session_id": session_id,
            "agent4_output": session["agent4_output"],
            "cached": True,
            "message": "Returning cached Agent 4 result.",
        }

    # ── Prerequisite guard: all three agents must be complete ─────────────────
    missing_agents = []
    if not session.get("agent1_output"):
        missing_agents.append("Agent 1")
    if not session.get("agent2_output"):
        missing_agents.append("Agent 2")
    if not session.get("agent3_output"):
        missing_agents.append("Agent 3")

    if missing_agents:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Agent 4 requires all three specialist agents to complete first. "
                f"Missing: {', '.join(missing_agents)}. "
                f"Please run the missing agents before running Agent 4."
            ),
        )

    # ── Extract agent outputs and context from session ────────────────────────
    agent1_output = session["agent1_output"]
    agent2_output = session["agent2_output"]
    agent3_output = session["agent3_output"]

    client_industry = session.get("client_industry") or []
    proposal_type = session.get("proposal_type") or ""
    client_priorities = session.get("client_priorities") or []

    # ── Run Agent 4 ───────────────────────────────────────────────────────────
    try:
        agent4_result = run_agent4_analysis(
            agent1_output=agent1_output,
            agent2_output=agent2_output,
            agent3_output=agent3_output,
            client_industry=client_industry,
            proposal_type=proposal_type,
            client_priorities=client_priorities,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Unexpected error during Agent 4 aggregation: {str(e)}",
        )

    # ── Store result and mark session complete ────────────────────────────────
    update_session(session_id, user_id, {
        "agent4_output": agent4_result,
        "status": "complete",
    })

    return {
        "session_id": session_id,
        "agent4_output": agent4_result,
        "cached": False,
        "message": "Agent 4 aggregation complete. Proposal review is ready.",
    }


# ── Modification report builder ───────────────────────────────────────────────

def _build_modification_report(applied: list, slide_map: list) -> list:
    """
    Converts the raw `applied` list from pptx_modifier into a rich report.
    Each entry says WHERE the change was made, WHAT changed, and WHY (which finding).
    """
    slide_titles = {s["slide_index"]: s["slide_title"] for s in slide_map}

    report = []
    for i, mod in enumerate(applied, 1):
        slide_idx = mod.get("slide_index", 0)
        action = mod.get("action", "")

        entry = {
            "change_number":    i,
            "slide_number":     slide_idx + 1,
            "slide_title":      slide_titles.get(slide_idx, f"Slide {slide_idx + 1}"),
            "shape_name":       mod.get("shape_name", ""),
            "action":           action,
            "priority":         mod.get("priority", ""),
            "severity":         mod.get("severity", ""),
            "source_skill":     mod.get("source_skill", ""),
            "addresses_finding": mod.get("source_finding", ""),
        }

        if action == "replace_text":
            entry["before"] = mod.get("original_text", "")
            entry["after"]  = mod.get("new_text", "")
        elif action == "append_bullets":
            entry["bullets_added"] = mod.get("bullets", [])
        elif action == "append_text":
            entry["text_added"] = mod.get("new_text", "")

        report.append(entry)

    return report


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/generate-modified-ppt")
async def generate_modified_ppt(
    session_id: str,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
):
    """
    Agent 5: auto-modifies the uploaded PowerPoint based on all agent findings.

    What it does:
      1. Runs Agent 5 → generates structured modification instructions.
      2. Applies those modifications to the original PPTX.
      3. Builds a detailed modification report (where/what/why for every change).
      4. Creates a new session for the modified PPTX and kicks off the full
         pipeline in the background so the new scores appear in the sidebar.
      5. Returns download URL, modification report, and the new session ID.

    Prerequisites:
      - Session status must be "complete" (all 4 agents done).
      - Original upload must be PPTX or PPT (not available for PDFs).
    """
    user = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)

    # ── Guards ────────────────────────────────────────────────────────────────
    if session.get("status") != "complete":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Session status is '{session.get('status')}'. "
                "All 4 agents must complete before generating a modified PPT."
            ),
        )

    file_type = session.get("file_type", "pdf")
    if file_type not in ("pptx", "ppt"):
        raise HTTPException(
            status_code=400,
            detail=(
                "Modified PPT generation is only available for PowerPoint uploads "
                f"(file_type='{file_type}'). PDF files cannot be auto-modified."
            ),
        )

    if not session.get("storage_path"):
        raise HTTPException(
            status_code=400,
            detail="No original file found for this session. Please re-upload.",
        )

    # ── Download original PPTX ────────────────────────────────────────────────
    try:
        pptx_bytes = download_file_from_storage(session["storage_path"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download original presentation: {str(e)}")

    if not pptx_bytes:
        raise HTTPException(status_code=500, detail="Downloaded presentation file is empty.")

    # ── Session context ───────────────────────────────────────────────────────
    agent1_output    = session.get("agent1_output") or {}
    agent2_output    = session.get("agent2_output") or {}
    agent3_output    = session.get("agent3_output") or {}
    agent4_output    = session.get("agent4_output") or {}
    client_industry  = session.get("client_industry") or []
    proposal_type    = session.get("proposal_type") or ""
    client_priorities = session.get("client_priorities") or []

    # ── Extract slide map (used by Agent 5 + report builder) ─────────────────
    slide_map = extract_slide_map(pptx_bytes)

    # ── Run Agent 5 ───────────────────────────────────────────────────────────
    event_emitter.ensure_session(session_id)
    try:
        agent5_result = run_agent5_analysis(
            pptx_bytes=pptx_bytes,
            agent1_output=agent1_output,
            agent2_output=agent2_output,
            agent3_output=agent3_output,
            agent4_output=agent4_output,
            client_industry=client_industry,
            proposal_type=proposal_type,
            client_priorities=client_priorities,
            emit=event_emitter.make_emitter(session_id, "agent5"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agent 5 analysis failed: {str(e)}")

    # ── Apply modifications to the PPTX ──────────────────────────────────────
    modifications = agent5_result.get("modifications", [])
    try:
        modified_pptx_bytes, applied, failed = apply_modifications(pptx_bytes, modifications)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply modifications: {str(e)}")

    # ── Build human-readable modification report ──────────────────────────────
    modification_report = _build_modification_report(applied, slide_map)

    # ── Upload modified PPTX (under original session path) ────────────────────
    pptx_content_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    modified_storage_path = f"uploads/{user_id}/{session_id}/modified_proposal.pptx"
    try:
        upload_file_to_storage(modified_storage_path, modified_pptx_bytes, content_type=pptx_content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload modified PPTX: {str(e)}")

    # ── Save Agent 5 JSON + Markdown report ───────────────────────────────────
    try:
        save_agent_output_to_storage(user_id, session_id, "agent5", agent5_result, _a5_md(agent5_result))
    except Exception:
        pass  # Non-fatal

    # ── Create new session for the modified PPT (same proposal group) ─────────
    group_id     = session.get("proposal_group_id") or session_id
    all_versions = get_sessions_by_group(group_id, user_id)
    next_version = len(all_versions) + 1

    modified_filename = f"[AI-Modified] {session.get('original_filename', 'proposal.pptx')}"

    try:
        page_count = count_file_pages(modified_pptx_bytes, file_type)
    except Exception:
        page_count = session.get("page_count") or 1

    new_session = create_session(
        user_id           = user_id,
        original_filename = modified_filename,
        file_type         = file_type,
        page_count        = page_count,
        client_industry   = client_industry,
        proposal_type     = proposal_type,
        client_priorities = client_priorities,
        proposal_group_id = group_id,
        version_number    = next_version,
        parent_session_id = session_id,
    )
    modified_session_id = new_session["id"]

    # Upload modified PPTX under the new session's storage path too
    new_storage_path = f"uploads/{user_id}/{modified_session_id}/document.{file_type}"
    try:
        upload_file_to_storage(new_storage_path, modified_pptx_bytes, content_type=pptx_content_type)
        update_session(modified_session_id, user_id, {
            "storage_path": new_storage_path,
            "status": "ready",
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set up re-analysis session: {str(e)}")

    # ── Fire the pipeline on the modified session in the background ───────────
    background_tasks.add_task(run_full_pipeline, modified_session_id, user_id)

    # ── Signed download URL for the modified PPTX ─────────────────────────────
    try:
        download_url = get_signed_url(modified_storage_path, expires_in=3600)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {str(e)}")

    report_path = f"uploads/{user_id}/{session_id}/agent5/output.md"
    try:
        report_url = get_signed_url(report_path, expires_in=3600)
    except Exception:
        report_url = None

    # ── Build response ────────────────────────────────────────────────────────
    summary        = agent5_result.get("modification_summary", {})
    applied_count  = len(applied)
    failed_count   = len(failed)

    return {
        "session_id":          session_id,
        "modified_session_id": modified_session_id,
        "download_url":        download_url,
        "report_url":          report_url,

        # Full per-change report: WHERE + WHAT + WHY for every applied change
        "modification_report": modification_report,
        "skipped":             agent5_result.get("skipped", []),

        "modification_summary": {
            **summary,
            "actually_applied": applied_count,
            "actually_failed":  failed_count,
        },
        "message": (
            f"Modified PPTX generated with {applied_count} changes applied. "
            f"Re-analysis pipeline started (session: {modified_session_id})."
        ),
    }


# ── Modification Guide (copy-paste edit guide, no PPTX generation) ───────────

@router.post("/sessions/{session_id}/modification-guide")
async def get_modification_guide(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Runs Agent 5 and returns a structured copy-paste edit guide.
    Works for both PDF and PPTX uploads. Does NOT modify any file.

    PDF:  section-based find-and-replace recommendations.
    PPTX: slide+shape-targeted find-and-replace recommendations.

    Both return the same guide-item schema so the frontend panel works
    identically — only the labels differ (Section vs Slide).
    """
    user    = await get_current_user(authorization)
    user_id = user["id"]

    session = get_session(session_id, user_id)

    if session.get("status") != "complete":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Session status is '{session.get('status')}'. "
                "All 4 agents must complete before generating the edit guide."
            ),
        )

    if not session.get("storage_path"):
        raise HTTPException(status_code=400, detail="No original file found for this session.")

    # ── Download the proposal file ────────────────────────────────────────────
    try:
        file_bytes = download_file_from_storage(session["storage_path"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")

    if not file_bytes:
        raise HTTPException(status_code=500, detail="Downloaded file is empty.")

    file_type         = session.get("file_type") or "pdf"
    agent1_output     = session.get("agent1_output")     or {}
    agent2_output     = session.get("agent2_output")     or {}
    agent3_output     = session.get("agent3_output")     or {}
    agent4_output     = session.get("agent4_output")     or {}
    client_industry   = session.get("client_industry")   or []
    proposal_type     = session.get("proposal_type")     or ""
    client_priorities = session.get("client_priorities") or []

    event_emitter.ensure_session(session_id)
    emit = event_emitter.make_emitter(session_id, "agent5")

    # ── PDF path ──────────────────────────────────────────────────────────────
    if file_type == "pdf":
        from agents.agent5 import run_pdf as run_agent5_pdf
        try:
            return run_agent5_pdf(
                pdf_bytes         = file_bytes,
                file_type         = file_type,
                agent1_output     = agent1_output,
                agent2_output     = agent2_output,
                agent3_output     = agent3_output,
                agent4_output     = agent4_output,
                client_industry   = client_industry,
                proposal_type     = proposal_type,
                client_priorities = client_priorities,
                emit              = emit,
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Agent 5 PDF analysis failed: {str(e)}")

    # ── PPTX path ─────────────────────────────────────────────────────────────
    slide_map    = extract_slide_map(file_bytes)
    slide_titles = {s["slide_index"]: s["slide_title"] for s in slide_map}

    try:
        agent5_result = run_agent5_analysis(
            pptx_bytes        = file_bytes,
            agent1_output     = agent1_output,
            agent2_output     = agent2_output,
            agent3_output     = agent3_output,
            agent4_output     = agent4_output,
            client_industry   = client_industry,
            proposal_type     = proposal_type,
            client_priorities = client_priorities,
            emit              = emit,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agent 5 analysis failed: {str(e)}")

    modifications = agent5_result.get("modifications", [])
    guide = []
    for i, mod in enumerate(modifications, 1):
        si     = mod.get("slide_index", 0)
        action = mod.get("action", "replace_text")
        guide.append({
            "change_number":     i,
            "slide_number":      si + 1,
            "slide_title":       slide_titles.get(si, f"Slide {si + 1}"),
            "shape_name":        mod.get("shape_name", ""),
            "action":            action,
            "priority":          mod.get("priority", "nice_to_have"),
            "severity":          mod.get("severity", "MINOR"),
            "source_skill":      mod.get("source_skill", ""),
            "addresses_finding": mod.get("source_finding", ""),
            "find_text":         mod.get("original_text", "") if action == "replace_text" else "",
            "replace_with":      mod.get("new_text", "")      if action in ("replace_text", "append_text") else "",
            "bullets_to_add":    mod.get("bullets", [])       if action == "append_bullets" else [],
        })

    skipped = agent5_result.get("skipped", [])
    a5_sum  = agent5_result.get("modification_summary", {})

    return {
        "mode":    "pptx",
        "guide":   guide,
        "skipped": skipped,
        "summary": {
            "total":             len(guide),
            "must_fix":          sum(1 for m in guide if m["priority"] == "must_fix"),
            "should_fix":        sum(1 for m in guide if m["priority"] == "should_fix"),
            "nice_to_have":      sum(1 for m in guide if m["priority"] == "nice_to_have"),
            "skipped":           len(skipped),
            "must_fix_coverage": a5_sum.get("must_fix_coverage", ""),
        },
    }
