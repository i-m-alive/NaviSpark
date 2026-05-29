"""
Full 4-agent pipeline orchestration.

Flow:
  1. Download PDF once from Supabase Storage
  2. Run Agents 1, 2, 3 in parallel via thread pool (each blocks on Bedrock)
  3. Save each output (JSON + Markdown) to Supabase Storage
  4. Update DB with all three outputs → status: agents_complete
  5. Run Agent 4 (sequential, depends on 1/2/3)
  6. Save Agent 4 output to Storage, set report_storage_path
  7. Update DB → status: complete
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from functools import partial

from agents.agent1 import run as _run_agent1
from agents.agent2 import run as _run_agent2
from agents.agent3 import run as _run_agent3
from agents.agent4 import run as _run_agent4
from agents.agent1.markdown_formatter import format_to_markdown as _a1_md
from agents.agent2.markdown_formatter import format_to_markdown as _a2_md
from agents.agent3.markdown_formatter import format_to_markdown as _a3_md
from agents.agent4.markdown_formatter import format_to_markdown as _a4_md
from storage import download_file_from_storage, save_agent_output_to_storage
from services.session_service import get_session, update_session

logger = logging.getLogger(__name__)

# Shared thread pool — 6 workers: 3 for parallel agents + spare capacity
_executor = ThreadPoolExecutor(max_workers=6)


async def _in_thread(fn):
    """Run a zero-argument callable in the shared thread pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, fn)


async def run_full_pipeline(session_id: str, user_id: str) -> None:
    """
    Orchestrates the complete pipeline as a FastAPI background task.
    All exceptions are caught and written to session status so the
    frontend polling can surface them cleanly.
    """
    try:
        session = get_session(session_id, user_id)
        pdf_bytes = download_file_from_storage(session["storage_path"])
        if not pdf_bytes:
            raise ValueError("Downloaded proposal file is empty.")

        client_industry = session.get("client_industry") or []
        proposal_type = session.get("proposal_type") or ""
        client_priorities = session.get("client_priorities") or []

        # ── Step 1: Agents 1, 2, 3 in parallel ───────────────────────────────
        update_session(session_id, user_id, {"status": "pipeline_running"})

        r1, r2, r3 = await asyncio.gather(
            _in_thread(partial(
                _run_agent1,
                pdf_bytes=pdf_bytes,
                client_industry=client_industry,
                proposal_type=proposal_type,
                client_priorities=client_priorities,
            )),
            _in_thread(partial(
                _run_agent2,
                pdf_bytes=pdf_bytes,
                client_industry=client_industry,
                proposal_type=proposal_type,
                client_priorities=client_priorities,
            )),
            _in_thread(partial(
                _run_agent3,
                pdf_bytes=pdf_bytes,
                client_industry=client_industry,
                proposal_type=proposal_type,
                client_priorities=client_priorities,
            )),
            return_exceptions=True,
        )

        # Surface any per-agent failures
        errors = []
        if isinstance(r1, BaseException):
            errors.append(f"Agent 1: {r1}")
            logger.error("Agent 1 failed: %s", r1, exc_info=r1)
        if isinstance(r2, BaseException):
            errors.append(f"Agent 2: {r2}")
            logger.error("Agent 2 failed: %s", r2, exc_info=r2)
        if isinstance(r3, BaseException):
            errors.append(f"Agent 3: {r3}")
            logger.error("Agent 3 failed: %s", r3, exc_info=r3)

        if errors:
            update_session(session_id, user_id, {"status": "pipeline_failed"})
            return

        # ── Step 2: Save agent 1/2/3 outputs to Storage ───────────────────────
        await asyncio.gather(
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "agent1", r1, _a1_md(r1))),
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "agent2", r2, _a2_md(r2))),
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "agent3", r3, _a3_md(r3))),
        )

        # ── Step 3: Persist to DB, mark specialists done ──────────────────────
        update_session(session_id, user_id, {
            "agent1_output": r1,
            "agent2_output": r2,
            "agent3_output": r3,
            "status": "agents_complete",
        })

        # ── Step 4: Agent 4 (sequential) ──────────────────────────────────────
        r4 = await _in_thread(partial(
            _run_agent4,
            agent1_output=r1,
            agent2_output=r2,
            agent3_output=r3,
            client_industry=client_industry,
            proposal_type=proposal_type,
            client_priorities=client_priorities,
        ))

        # ── Step 5: Save Agent 4 output to Storage ────────────────────────────
        await _in_thread(partial(
            save_agent_output_to_storage, user_id, session_id, "agent4", r4, _a4_md(r4)
        ))

        # ── Step 6: Mark pipeline complete ────────────────────────────────────
        report_path = f"uploads/{user_id}/{session_id}/agent4/output.md"
        update_session(session_id, user_id, {
            "agent4_output": r4,
            "report_storage_path": report_path,
            "status": "complete",
        })

    except Exception as exc:
        logger.error("Pipeline failed for session %s: %s", session_id, exc, exc_info=True)
        try:
            update_session(session_id, user_id, {"status": "pipeline_failed"})
        except Exception:
            pass
