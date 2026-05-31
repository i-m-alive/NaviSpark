"""
Thread-safe per-session event store for SSE streaming.

Pipeline threads call push() to append events.
The SSE endpoint calls read_from() to tail from a cursor position.
"""

import threading
from typing import Dict, List

_store: Dict[str, List[dict]] = {}
_lock = threading.Lock()


def push(session_id: str, event_type: str, message: str, agent: int = None) -> None:
    """Append an event for a session. Safe to call from any thread."""
    payload: dict = {"type": event_type, "message": message}
    if agent is not None:
        payload["agent"] = agent
    with _lock:
        _store.setdefault(session_id, []).append(payload)


def read_from(session_id: str, cursor: int) -> List[dict]:
    """Return events starting at cursor. Never blocks."""
    with _lock:
        return list(_store.get(session_id, [])[cursor:])


def clear(session_id: str) -> None:
    """Remove all events for a session (call after stream is closed)."""
    with _lock:
        _store.pop(session_id, None)
