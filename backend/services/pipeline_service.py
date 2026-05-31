"""
Full 4-agent pipeline orchestration.

Flow:
  1. Download file once from Supabase Storage
  2. Run Agents 1, 2, 3 in parallel via thread pool (each blocks on Bedrock)
  3. Save each output (JSON + Markdown) to Supabase Storage
  4. Update DB with all three outputs → status: agents_complete
  5. Run Agent 4 (sequential, depends on 1/2/3)
  6. Save Agent 4 output to Storage, set report_storage_path
  7. Update DB → status: complete

Each agent receives an `emit` callable so it can push granular ActivityEvents
into the per-session SessionBus, which delivers them live to the WebSocket client.
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
from services.activity_stream import stream_manager

logger = logging.getLogger(__name__)

# Shared thread pool — 6 workers: 3 for parallel agents + spare capacity
_executor = ThreadPoolExecutor(max_workers=6)


def _is_cancelled(session_id: str, user_id: str) -> bool:
    try:
        s = get_session(session_id, user_id)
        return s.get("status") == "cancelled"
    except Exception:
        return False


async def _in_thread(fn):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, fn)


async def _run_agent_in_thread(fn, session_id: str, agent_id: str):
    """
    Runs agent fn in the thread pool.
    Emits pipeline-level start/done/error events around the call.
    The fn itself emits granular skill-level events.
    """
    bus = stream_manager.get_or_create(session_id)
    try:
        result = await asyncio.get_running_loop().run_in_executor(_executor, fn)
        return result
    except Exception as exc:
        bus.emit(agent_id, f"Agent failed: {exc}", "error")
        raise


async def run_full_pipeline(session_id: str, user_id: str) -> None:
    """
    Orchestrates the complete pipeline as a FastAPI background task.
    Exceptions are caught and written to session status.
    """
    bus = stream_manager.get_or_create(session_id)
    # Store the running event loop so agent threads can deliver events via
    # call_soon_threadsafe(). Must use get_running_loop() — get_event_loop() is
    # deprecated in Python 3.10+ and may return the wrong loop.
    bus.set_loop(asyncio.get_running_loop())
    logger.info("[Pipeline] bus initialised  session=%s", session_id)

    # Per-agent emitter callables — passed into each agent's run()
    emit_pipe  = bus.make_emitter("pipeline")
    emit_a1    = bus.make_emitter("agent_1")
    emit_a2    = bus.make_emitter("agent_2")
    emit_a3    = bus.make_emitter("agent_3")
    emit_a4    = bus.make_emitter("agent_4")

    try:
        emit_pipe("Starting analysis pipeline", "running")

        session = get_session(session_id, user_id)

        emit_pipe("Downloading proposal from storage", "running")
        file_bytes = download_file_from_storage(session["storage_path"])
        if not file_bytes:
            raise ValueError("Downloaded proposal file is empty.")
        emit_pipe("Downloading proposal from storage", "completed")

        file_type         = session.get("file_type") or "pdf"
        client_industry   = session.get("client_industry") or []
        proposal_type     = session.get("proposal_type") or ""
        client_priorities = session.get("client_priorities") or []

        # ── Step 1: Agents 1, 2, 3 in parallel ───────────────────────────────
        update_session(session_id, user_id, {"status": "pipeline_running"})
        emit_pipe("Launching specialist agents in parallel", "running")

        r1, r2, r3 = await asyncio.gather(
            _run_agent_in_thread(
                partial(
                    _run_agent1,
                    pdf_bytes=file_bytes,
                    file_type=file_type,
                    client_industry=client_industry,
                    proposal_type=proposal_type,
                    client_priorities=client_priorities,
                    emit=emit_a1,
                ),
                session_id, "agent_1",
            ),
            _run_agent_in_thread(
                partial(
                    _run_agent2,
                    pdf_bytes=file_bytes,
                    file_type=file_type,
                    client_industry=client_industry,
                    proposal_type=proposal_type,
                    client_priorities=client_priorities,
                    emit=emit_a2,
                ),
                session_id, "agent_2",
            ),
            _run_agent_in_thread(
                partial(
                    _run_agent3,
                    pdf_bytes=file_bytes,
                    file_type=file_type,
                    client_industry=client_industry,
                    proposal_type=proposal_type,
                    client_priorities=client_priorities,
                    emit=emit_a3,
                ),
                session_id, "agent_3",
            ),
            return_exceptions=True,
        )

        # Surface per-agent failures
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
            emit_pipe(f"Pipeline failed: {'; '.join(errors)}", "error")
            update_session(session_id, user_id, {"status": "pipeline_failed"})
            return

        # ── Cancellation checkpoint 1 ─────────────────────────────────────────
        if _is_cancelled(session_id, user_id):
            emit_pipe("Analysis cancelled by user", "error")
            logger.info("Pipeline cancelled after specialist agents — session %s", session_id)
            return

        emit_pipe("All specialist reviews received", "completed")
        emit_pipe("Saving specialist findings", "running")

        # ── Step 2: Save agent 1/2/3 outputs ─────────────────────────────────
        await asyncio.gather(
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "agent1", r1, _a1_md(r1))),
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "agent2", r2, _a2_md(r2))),
            _in_thread(partial(save_agent_output_to_storage, user_id, session_id, "agent3", r3, _a3_md(r3))),
        )

        # ── Step 3: Persist to DB ─────────────────────────────────────────────
        update_session(session_id, user_id, {
            "agent1_output": r1,
            "agent2_output": r2,
            "agent3_output": r3,
            "status": "agents_complete",
        })
        emit_pipe("Saving specialist findings", "completed")

        # ── Cancellation checkpoint 2 ─────────────────────────────────────────
        if _is_cancelled(session_id, user_id):
            emit_pipe("Analysis cancelled by user", "error")
            logger.info("Pipeline cancelled before Agent 4 — session %s", session_id)
            return

        # ── Step 4: Agent 4 (sequential) ──────────────────────────────────────
        r4 = await _run_agent_in_thread(
            partial(
                _run_agent4,
                agent1_output=r1,
                agent2_output=r2,
                agent3_output=r3,
                client_industry=client_industry,
                proposal_type=proposal_type,
                client_priorities=client_priorities,
                emit=emit_a4,
            ),
            session_id, "agent_4",
        )

        # ── Step 5: Save Agent 4 output ───────────────────────────────────────
        emit_pipe("Saving final review report", "running")
        await _in_thread(partial(
            save_agent_output_to_storage, user_id, session_id, "agent4", r4, _a4_md(r4)
        ))

        # ── Step 6: Mark complete ─────────────────────────────────────────────
        report_path = f"uploads/{user_id}/{session_id}/agent4/output.md"
        update_session(session_id, user_id, {
            "agent4_output": r4,
            "report_storage_path": report_path,
            "status": "complete",
        })
        emit_pipe("Saving final review report", "completed")
        emit_pipe("Analysis complete — full report is ready", "completed")

    except Exception as exc:
        logger.error("Pipeline failed for session %s: %s", session_id, exc, exc_info=True)
        bus.emit("pipeline", f"Unexpected error: {exc}", "error")
        try:
            update_session(session_id, user_id, {"status": "pipeline_failed"})
        except Exception:
            pass
