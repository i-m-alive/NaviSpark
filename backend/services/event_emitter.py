"""
Session-scoped event bus for the live activity feed.

Design:
  - Per-session SessionFeed holds an append-only events list.
  - Agent threads call emit_sync() → schedules _do_emit in the event loop via
    call_soon_threadsafe (thread-safe bridge from ThreadPoolExecutor to asyncio).
  - Each WebSocket connection gets its own asyncio.Event (local_event) to
    avoid cross-client interference when multiple tabs are open.
  - Late-connecting WS clients receive the full history via cursor replay.
  - Sessions auto-cleanup 120 s after close_session() is called.

Call flow:
  pipeline start  → ensure_session(session_id)          # async context
  agent threads   → emit_sync(session_id, ...)           # worker thread
  WS handler      → ensure_session() + cursor read loop  # async context
  pipeline end    → await close_session(session_id)      # async context
"""

import asyncio
import logging
import threading
from datetime import datetime, timezone
from typing import Callable

logger = logging.getLogger(__name__)

_sessions: dict = {}          # session_id → SessionFeed
_loop: asyncio.AbstractEventLoop | None = None
_lock = threading.Lock()      # guards _sessions dict writes

MAX_EVENTS_PER_SESSION = 500


class SessionFeed:
    __slots__ = ("events", "done", "_waiters")

    def __init__(self) -> None:
        self.events: list[dict] = []
        self.done: bool = False
        self._waiters: list[asyncio.Event] = []

    def add_waiter(self) -> asyncio.Event:
        ev: asyncio.Event = asyncio.Event()
        self._waiters.append(ev)
        return ev

    def remove_waiter(self, ev: asyncio.Event) -> None:
        try:
            self._waiters.remove(ev)
        except ValueError:
            pass

    def _notify(self) -> None:
        for ev in self._waiters:
            ev.set()


# ── Loop registration ─────────────────────────────────────────────────────────

def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


# ── Session lifecycle ─────────────────────────────────────────────────────────

def ensure_session(session_id: str) -> SessionFeed:
    """Get or create a SessionFeed. Safe to call from async or sync context."""
    with _lock:
        if session_id not in _sessions:
            _sessions[session_id] = SessionFeed()
        return _sessions[session_id]


def get_session(session_id: str) -> "SessionFeed | None":
    return _sessions.get(session_id)


async def close_session(session_id: str) -> None:
    """Mark session done and schedule cleanup. Call from async context (pipeline end)."""
    feed = _sessions.get(session_id)
    if feed:
        feed.done = True
        feed._notify()                         # wake all WS readers
    asyncio.create_task(_cleanup_after(session_id, delay=120))


async def _cleanup_after(session_id: str, delay: int) -> None:
    await asyncio.sleep(delay)
    _sessions.pop(session_id, None)
    logger.debug("[EventEmitter] Session %s cleaned up", session_id[:8])


# ── Emit (thread-safe) ────────────────────────────────────────────────────────

def _do_emit_in_loop(session_id: str, event: dict) -> None:
    """Runs inside the event loop (scheduled via call_soon_threadsafe)."""
    feed = _sessions.get(session_id)
    if feed and not feed.done and len(feed.events) < MAX_EVENTS_PER_SESSION:
        feed.events.append(event)
        feed._notify()


def emit_sync(session_id: str, agent_id: str, activity: str, status: str = "running") -> None:
    """Thread-safe emit. Call from any thread (agent workers, sync services)."""
    if _loop is None or not _loop.is_running():
        return

    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": agent_id,
        "activity": activity,
        "status": status,
    }
    try:
        _loop.call_soon_threadsafe(_do_emit_in_loop, session_id, event)
    except RuntimeError:
        pass  # loop closed


def make_emitter(session_id: str, agent_id: str) -> Callable[[str, str], None]:
    """Returns an emit(activity, status='running') callable for use inside agents."""
    def _emit(activity: str, status: str = "running") -> None:
        emit_sync(session_id, agent_id, activity, status)
    return _emit
