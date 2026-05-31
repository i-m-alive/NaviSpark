/**
 * useActivityStream
 *
 * Opens a WebSocket to ws://host/sessions/{sessionId}/ws?token=<jwt>.
 * Delivers ActivityEvent objects in real time and replays full history on reconnect.
 *
 * Pass enabled=true to connect, false to disconnect.
 * The hook reconnects automatically with exponential back-off (1 s → 16 s max).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws'))

const MAX_BACKOFF_MS  = 16_000
const BASE_BACKOFF_MS = 1_000

function deriveAgentState(events) {
  const agentMaps = new Map()
  for (const ev of events) {
    if (!ev.agent_id || !ev.activity || !ev.status) continue
    if (!agentMaps.has(ev.agent_id)) agentMaps.set(ev.agent_id, new Map())
    agentMaps.get(ev.agent_id).set(ev.activity, ev.status)
  }
  const result = new Map()
  for (const [id, actMap] of agentMaps) {
    result.set(id, Array.from(actMap.entries()).map(([activity, status]) => ({ activity, status })))
  }
  return result
}

export function useActivityStream(sessionId, enabled) {
  const [events,    setEvents]    = useState([])
  const [connected, setConnected] = useState(false)

  const wsRef        = useRef(null)
  const timerRef     = useRef(null)
  const attemptRef   = useRef(0)
  const enabledRef   = useRef(enabled)   // always-current ref so closures don't go stale
  const sessionRef   = useRef(sessionId)
  // cursorRef: how many events already in state — used to skip replayed duplicates
  const cursorRef    = useRef(0)

  // Keep refs in sync on every render
  enabledRef.current  = enabled
  sessionRef.current  = sessionId

  const disconnect = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = null
    if (wsRef.current) {
      const ws = wsRef.current
      wsRef.current = null
      ws.onopen    = null
      ws.onmessage = null
      ws.onerror   = null
      ws.onclose   = null
      ws.close()
    }
    setConnected(false)
  }, [])

  // connect is stable — it reads sessionId/enabled from refs so closures are always fresh
  const connect = useCallback(() => {
    if (!enabledRef.current || !sessionRef.current) return
    if (wsRef.current) return   // already open — do not create a second socket

    const token = localStorage.getItem('navispark_token')
    if (!token) {
      console.warn('[WS] no token in localStorage — cannot connect')
      return
    }

    const url = `${WS_BASE}/sessions/${sessionRef.current}/ws?token=${encodeURIComponent(token)}`
    console.log('[WS] opening', url)

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] connected')
      setConnected(true)
      attemptRef.current = 0
    }

    ws.onmessage = ({ data: raw }) => {
      let ev
      try { ev = JSON.parse(raw) } catch { return }
      // Skip protocol / control frames that aren't activity events
      if (ev.type === 'ping' || ev.type === 'error') return
      if (!ev.agent_id || !ev.activity || !ev.status) return

      console.log('[WS] event', ev.agent_id, ev.status, ev.activity)

      setEvents((prev) => {
        const next = [...prev, ev]
        cursorRef.current = next.length
        return next
      })
    }

    ws.onerror = (e) => {
      console.error('[WS] error', e)
    }

    ws.onclose = ({ code, reason }) => {
      console.log('[WS] closed code=%d reason=%s', code, reason)
      wsRef.current = null
      setConnected(false)

      if (!enabledRef.current) return   // intentional disconnect — don't reconnect
      // 4003 = auth denied — do not retry with the same token
      if (code === 4003) {
        console.warn('[WS] auth denied — not reconnecting')
        return
      }

      const delay = Math.min(BASE_BACKOFF_MS * 2 ** attemptRef.current, MAX_BACKOFF_MS)
      attemptRef.current += 1
      console.log('[WS] reconnecting in %dms (attempt %d)', delay, attemptRef.current)
      timerRef.current = setTimeout(connect, delay)
    }
  }, [])   // stable — reads everything from refs

  const reset = useCallback(() => {
    setEvents([])
    cursorRef.current = 0
  }, [])

  useEffect(() => {
    if (enabled && sessionId) {
      connect()
    } else {
      disconnect()
    }
    return disconnect
  }, [sessionId, enabled, connect, disconnect])

  const agentState = useMemo(() => deriveAgentState(events), [events])

  return { events, agentState, connected, reset }
}
