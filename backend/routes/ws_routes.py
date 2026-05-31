"""
WebSocket endpoint for live agent activity feed.

Connect: ws[s]://<host>/ws/sessions/<session_id>/activity?token=<jwt>

Message types sent to client:
  {"type": "event",  "data": {timestamp, agent_id, activity, status}}
  {"type": "done"}   — pipeline finished, safe to close
  {"type": "ping"}   — heartbeat (client may ignore)

Error close codes:
  4001 — authentication failed
  4004 — session not found (pipeline not started)
"""

import asyncio
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from auth import get_current_user
from services import event_emitter

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)

_HEARTBEAT_TIMEOUT = 25   # seconds between pings when idle
_MAX_RECONNECT_WAIT = 30  # seconds to wait for pipeline to start


@router.websocket("/ws/sessions/{session_id}/activity")
async def activity_feed(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
):
    """
    Streams ActivityEvent objects for a running analysis pipeline.

    Authentication is via JWT passed as ?token=<jwt> query parameter
    (Authorization headers are not available in WebSocket upgrades in most
    browsers; query-param is the standard workaround).

    The handler replays any events emitted before this client connected
    (cursor-based replay from the in-memory event buffer), then streams
    live events until the pipeline finishes or the client disconnects.
    """
    # ── Auth ──────────────────────────────────────────────────────────────────
    try:
        await get_current_user(f"Bearer {token}")
    except Exception:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    logger.info("[WS] Client connected for session %s", session_id[:8])

    # ── Get or create feed ───────────────────────────────────────────────────
    # If the pipeline hasn't started yet, wait briefly for it to register
    feed = event_emitter.get_session(session_id)
    if feed is None:
        loop = asyncio.get_running_loop()
        deadline = loop.time() + _MAX_RECONNECT_WAIT
        while feed is None and loop.time() < deadline:
            await asyncio.sleep(0.5)
            feed = event_emitter.get_session(session_id)

    if feed is None:
        # Pipeline never started; create a feed so we don't block forever
        feed = event_emitter.ensure_session(session_id)

    # ── Subscribe with a per-connection local event ──────────────────────────
    local_event = feed.add_waiter()
    cursor = 0

    try:
        while True:
            # ── Send all unsent events ────────────────────────────────────────
            while cursor < len(feed.events):
                evt = feed.events[cursor]
                cursor += 1
                try:
                    await websocket.send_json({"type": "event", "data": evt})
                except Exception:
                    return

            # ── Done? ─────────────────────────────────────────────────────────
            if feed.done:
                try:
                    await websocket.send_json({"type": "done"})
                except Exception:
                    pass
                break

            # ── Wait for new events or heartbeat timeout ──────────────────────
            local_event.clear()
            # Re-check after clear to handle events that arrived just before we cleared
            if cursor < len(feed.events) or feed.done:
                continue

            try:
                await asyncio.wait_for(local_event.wait(), timeout=_HEARTBEAT_TIMEOUT)
            except asyncio.TimeoutError:
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break

    except WebSocketDisconnect:
        logger.info("[WS] Client disconnected from session %s", session_id[:8])
    except Exception as exc:
        logger.error("[WS] Error on session %s: %s", session_id[:8], exc)
    finally:
        feed.remove_waiter(local_event)
        logger.info("[WS] Feed closed for session %s", session_id[:8])
