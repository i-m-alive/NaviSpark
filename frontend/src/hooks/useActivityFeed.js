/**
 * useActivityFeed — WebSocket hook for live agent activity streaming.
 *
 * Connects to /ws/sessions/{sessionId}/activity and collects ActivityEvent objects.
 * Automatically reconnects with exponential back-off on unexpected disconnects.
 * Replays the full event history the server buffered before this client connected.
 *
 * Returns:
 *   events          — flat array of all ActivityEvent objects (chronological)
 *   agentActivities — events grouped by agent_id: { agent1: [...], agent2: [...], ... }
 *   isConnected     — WebSocket is currently open
 *   isDone          — server sent the "done" sentinel (pipeline finished)
 *   error           — last connection error message or null
 */

import { useState, useEffect, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const MAX_RECONNECT_ATTEMPTS = 6
const BASE_RECONNECT_DELAY_MS = 800

function buildWsUrl(sessionId) {
  const token = localStorage.getItem('navispark_token') || ''
  const wsBase = API_URL.replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws'))
  return `${wsBase}/ws/sessions/${sessionId}/activity?token=${encodeURIComponent(token)}`
}

export default function useActivityFeed(sessionId, isActive) {
  const [events, setEvents] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState(null)

  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const attemptsRef = useRef(0)
  const isDoneRef = useRef(false)   // stable ref so closure inside connect() stays current
  const isActiveRef = useRef(isActive)

  useEffect(() => { isActiveRef.current = isActive }, [isActive])
  useEffect(() => { isDoneRef.current = isDone }, [isDone])

  const connect = useCallback(() => {
    if (!sessionId || !isActiveRef.current) return
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return

    const url = buildWsUrl(sessionId)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
      attemptsRef.current = 0
    }

    ws.onmessage = (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch { return }

      if (msg.type === 'event' && msg.data) {
        setEvents((prev) => [...prev, msg.data])
      } else if (msg.type === 'done') {
        setIsDone(true)
        isDoneRef.current = true
      }
      // 'ping' — ignore (heartbeat)
    }

    ws.onclose = (ev) => {
      setIsConnected(false)
      if (isDoneRef.current) return   // clean close after pipeline finished
      if (!isActiveRef.current) return

      const attempt = attemptsRef.current
      if (attempt >= MAX_RECONNECT_ATTEMPTS) {
        setError('Could not reconnect to activity feed after multiple attempts.')
        return
      }

      const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt)
      attemptsRef.current += 1
      reconnectTimerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      // onerror always fires before onclose; let onclose handle reconnect
      ws.close()
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId || !isActive) return

    connect()

    return () => {
      clearTimeout(reconnectTimerRef.current)
      isActiveRef.current = false
      const ws = wsRef.current
      if (ws) {
        ws.onclose = null  // suppress reconnect on unmount
        ws.close()
        wsRef.current = null
      }
    }
  }, [sessionId, isActive, connect])

  // Group events by agent_id preserving insertion order
  const agentActivities = events.reduce((acc, evt) => {
    const id = evt.agent_id || 'pipeline'
    if (!acc[id]) acc[id] = []
    acc[id].push(evt)
    return acc
  }, {})

  return { events, agentActivities, isConnected, isDone, error }
}
