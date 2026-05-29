from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from auth import get_current_user
from storage import download_file_from_storage
from agents.agent1 import run as run_agent1_analysis
from agents.agent2 import run as run_agent2_analysis
from agents.agent3 import run as run_agent3_analysis
from services.session_service import get_session, update_session

router = APIRouter(tags=["agents"])


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

    # Download the PDF from Supabase Storage
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
    client_industry = session.get("client_industry") or []
    proposal_type = session.get("proposal_type") or ""
    client_priorities = session.get("client_priorities") or []

    # Run Agent 1 — all skill orchestration is inside agents/agent1/agent.py
    try:
        agent1_result = run_agent1_analysis(
            pdf_bytes=pdf_bytes,
            client_industry=client_industry,
            proposal_type=proposal_type,
            client_priorities=client_priorities,
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

    # Download the PDF from Supabase Storage
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
    client_industry = session.get("client_industry") or []
    proposal_type = session.get("proposal_type") or ""
    client_priorities = session.get("client_priorities") or []

    # Run Agent 2 — all skill orchestration is inside agents/agent2/agent.py
    try:
        agent2_result = run_agent2_analysis(
            pdf_bytes=pdf_bytes,
            client_industry=client_industry,
            proposal_type=proposal_type,
            client_priorities=client_priorities,
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

    # Download the PDF from Supabase Storage
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
    client_industry = session.get("client_industry") or []
    proposal_type = session.get("proposal_type") or ""
    client_priorities = session.get("client_priorities") or []

    # Run Agent 3 — all skill orchestration is inside agents/agent3/agent.py
    try:
        agent3_result = run_agent3_analysis(
            pdf_bytes=pdf_bytes,
            client_industry=client_industry,
            proposal_type=proposal_type,
            client_priorities=client_priorities,
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
