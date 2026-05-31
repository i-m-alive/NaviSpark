"""
WebSocket activity stream — bridges synchronous agent threads with async WS clients.

Design:
  - Agent threads call bus.emit()  (thread-safe via threading.Lock)
  - WS clients subscribe() first, then receive replay, ensuring no events are lost
  - loop.call_soon_threadsafe() schedules queue.put_nowait() on the event loop
  - A replay buffer lets reconnecting clients catch up on missed events

Fix vs previous version:
  - subscribe() BEFORE replay() eliminates the replay-then-subscribe race
  - get_running_loop() used everywhere instead of deprecated get_event_loop()
"""

from __future__ import annotations

import asyncio
import logging
import threading
from datetime import datetime, timezone
from typing import Callable, Dict, List, Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ── Schema ────────────────────────────────────────────────────────────────────

class ActivityEvent(BaseModel):
    timestamp: str
    agent_id: str   # "pipeline" | "agent_1" | "agent_2" | "agent_3" | "agent_4"
    activity: str
    status: str     # "running" | "completed" | "error"


# ── Per-session bus ───────────────────────────────────────────────────────────

class SessionBus:
    def __init__(self) -> None:
        self._lock: threading.Lock = threading.Lock()
        self._events: List[ActivityEvent] = []
        self._queues: List[asyncio.Queue] = []
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    # ── Async side ────────────────────────────────────────────────────────────

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        with self._lock:
            self._loop = loop
        logger.debug("[ActivityStream] loop registered: %s", id(loop))

    def subscribe(self) -> asyncio.Queue:
        """
        Register a new delivery queue BEFORE calling replay().
        This eliminates the race where events emitted between replay() and
        subscribe() are silently dropped.
        """
        q: asyncio.Queue = asyncio.Queue()
        with self._lock:
            self._queues.append(q)
        logger.debug("[ActivityStream] client subscribed — %d subscriber(s)", len(self._queues))
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        with self._lock:
            try:
                self._queues.remove(q)
            except ValueError:
                pass
        logger.debug("[ActivityStream] client unsubscribed — %d subscriber(s)", len(self._queues))

    def replay(self) -> List[ActivityEvent]:
        """
        Return a snapshot of all stored events for reconnect replay.
        Call AFTER subscribe() so new events go to the queue while we replay.
        """
        with self._lock:
            snapshot = list(self._events)
        logger.debug("[ActivityStream] replay snapshot: %d event(s)", len(snapshot))
        return snapshot

    # ── Thread side ───────────────────────────────────────────────────────────

    def emit(self, agent_id: str, activity: str, status: str = "running") -> None:
        event = ActivityEvent(
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_id=agent_id,
            activity=activity,
            status=status,
        )
        with self._lock:
            self._events.append(event)
            loop = self._loop
            queues = list(self._queues)

        logger.debug(
            "[ActivityStream] emit  agent=%-10s status=%-10s subscribers=%d  activity=%s",
            agent_id, status, len(queues), activity,
        )

        if loop is not None and not loop.is_closed():
            for q in queues:
                loop.call_soon_threadsafe(q.put_nowait, event)
        else:
            logger.warning(
                "[ActivityStream] emit called but loop is None or closed "
                "(agent=%s, %d subscriber(s)) — event stored in buffer only",
                agent_id, len(queues),
            )

    def make_emitter(self, agent_id: str) -> Callable[[str, str], None]:
        def _emit(activity: str, status: str = "running") -> None:
            self.emit(agent_id, activity, status)
        return _emit

    @property
    def event_count(self) -> int:
        with self._lock:
            return len(self._events)


# ── Global registry ───────────────────────────────────────────────────────────

class ActivityStreamManager:
    def __init__(self) -> None:
        self._buses: Dict[str, SessionBus] = {}
        self._lock: threading.Lock = threading.Lock()

    def get_or_create(self, session_id: str) -> SessionBus:
        with self._lock:
            if session_id not in self._buses:
                self._buses[session_id] = SessionBus()
                logger.debug("[ActivityStream] new SessionBus created for session %s", session_id)
            return self._buses[session_id]

    def get(self, session_id: str) -> Optional[SessionBus]:
        with self._lock:
            return self._buses.get(session_id)

    def delete(self, session_id: str) -> None:
        with self._lock:
            self._buses.pop(session_id, None)


stream_manager = ActivityStreamManager()
