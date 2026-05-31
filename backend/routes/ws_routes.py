"""
WebSocket endpoint for real-time agent activity streaming.

Connect: ws://host/sessions/{session_id}/ws?token=<jwt>

Protocol:
  - subscribe() is called BEFORE replay() so no events are lost between the two
  - Full history is replayed; duplicates are filtered client-side via cursor
  - {"type":"ping"} keepalives sent every 20 s
  - Client can send "close" to terminate cleanly

Fixes vs previous version:
  - asyncio.get_running_loop() replaces deprecated get_event_loop()
  - subscribe-before-replay eliminates the race window
  - Detailed logging at every decision point
"""

import asyncio
import json
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from auth import get_current_user
from services.session_service import get_session
from services.activity_stream import stream_manager

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)

_PING_INTERVAL_S = 20
_RECV_TIMEOUT_S  = 60



@router.websocket("/sessions/{session_id}/ws")
async def activity_stream_ws(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
) -> None:
    # ── 1. Accept FIRST — then authenticate ──────────────────────────────────
    # Always accept before any auth check.  Calling close() before accept()
    # causes Starlette to send an HTTP 403 denial, which Chrome DevTools shows
    # as a failed XHR request — the WebSocket never appears in Network → WS.
    # Accepting first ensures the WS handshake always completes and is visible.
    logger.info("[WS] connection attempt  session=%s", session_id)
    await websocket.accept()
    logger.info("[WS] accepted  session=%s", session_id)

    try:
        user = await get_current_user(f"Bearer {token}")
        user_id = user["id"]
        get_session(session_id, user_id)
        logger.info("[WS] auth OK  session=%s  user=%s", session_id, user_id)
    except Exception as exc:
        logger.warning("[WS] auth FAILED session=%s: %s", session_id, exc)
        await websocket.send_text('{"type":"error","message":"Unauthorized"}')
        await websocket.close(code=4003)
        return

    # ── 2. Get bus and register loop ──────────────────────────────────────────
    bus = stream_manager.get_or_create(session_id)
    try:
        loop = asyncio.get_running_loop()   # correct: we ARE in a running loop
    except RuntimeError:
        loop = asyncio.get_event_loop()     # fallback (should never be needed)
    bus.set_loop(loop)

    # ── 3. Subscribe FIRST — then replay ──────────────────────────────────────
    # Subscribing before replay means any event emitted while we're replaying
    # goes into the queue; the cursor on the client side deduplicates it.
    q = bus.subscribe()
    history = bus.replay()
    logger.info("[WS] replaying %d buffered event(s)  session=%s", len(history), session_id)

    for event in history:
        try:
            payload = event.model_dump_json()
            await websocket.send_text(payload)
            logger.debug("[WS] replayed  %s", payload)
        except Exception as exc:
            logger.error("[WS] send failed during replay: %s", exc)
            bus.unsubscribe(q)
            return

    logger.info("[WS] replay done  session=%s  now streaming live", session_id)

    # ── 4. Stream live events ─────────────────────────────────────────────────
    async def _sender() -> None:
        while True:
            event = await q.get()
            payload = event.model_dump_json()
            logger.debug("[WS] live send  %s", payload)
            await websocket.send_text(payload)

    async def _pinger() -> None:
        while True:
            await asyncio.sleep(_PING_INTERVAL_S)
            await websocket.send_text(json.dumps({"type": "ping"}))
            logger.debug("[WS] ping  session=%s", session_id)

    sender_task = asyncio.create_task(_sender())
    pinger_task = asyncio.create_task(_pinger())

    try:
        while True:
            try:
                msg = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=_RECV_TIMEOUT_S,
                )
                if msg == "close":
                    logger.info("[WS] client requested close  session=%s", session_id)
                    break
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "ping"}))
    except (WebSocketDisconnect, Exception) as exc:
        logger.info("[WS] disconnected  session=%s: %s", session_id, exc)
    finally:
        sender_task.cancel()
        pinger_task.cancel()
        bus.unsubscribe(q)
        logger.info(
            "[WS] cleaned up  session=%s  bus has %d event(s) in buffer",
            session_id, bus.event_count,
        )
