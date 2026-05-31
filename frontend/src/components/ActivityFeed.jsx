/**
 * ActivityFeed — live agent activity panel.
 *
 * Shows: connected indicator, chunking (when active), Agent 1, Agent 2,
 * Agent 3, Agent 4. All four agent cards are always visible (placeholder
 * while waiting, live card once events arrive).
 *
 * Pipeline events are intentionally ignored here — they are consumed by
 * the backend but never rendered in this component.
 *
 * Props:
 *   agentActivities  — { agent_id: ActivityEvent[] } from useActivityFeed
 *   isConnected      — bool: WebSocket is open
 *   isDone           — bool: pipeline finished
 *   error            — string | null: connection error
 */

import { useEffect, useRef } from 'react'
import { CheckCircle2, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { clsx } from 'clsx'

// ── Agent metadata ────────────────────────────────────────────────────────────

const AGENT_META = {
  chunking: {
    label: 'Document Pre-processing',
    shortLabel: 'Chunking',
    accent: 'yellow',
    icon: '✂',
  },
  agent1: {
    label: 'Agent 1 — Completeness & Clarity',
    shortLabel: 'Agent 1',
    accent: 'blue',
    icon: '①',
  },
  agent2: {
    label: 'Agent 2 — Estimation & Commercial',
    shortLabel: 'Agent 2',
    accent: 'emerald',
    icon: '②',
  },
  agent3: {
    label: 'Agent 3 — Competitive Strength',
    shortLabel: 'Agent 3',
    accent: 'violet',
    icon: '③',
  },
  agent4: {
    label: 'Agent 4 — Chief Reviewer',
    shortLabel: 'Agent 4',
    accent: 'orange',
    icon: '④',
  },
}

const ACCENT_CLASSES = {
  yellow:  { border: 'border-yellow-800',  header: 'text-yellow-400' },
  blue:    { border: 'border-blue-800',    header: 'text-blue-400'   },
  emerald: { border: 'border-emerald-800', header: 'text-emerald-400'},
  violet:  { border: 'border-violet-800',  header: 'text-violet-400' },
  orange:  { border: 'border-orange-800',  header: 'text-orange-400' },
}

// ── ActivityItem ──────────────────────────────────────────────────────────────

function ActivityItem({ event, isLatest }) {
  const { activity, status } = event

  if (status === 'completed') {
    return (
      <div className="flex items-start gap-2 py-0.5">
        <CheckCircle2 size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
        <span className="text-xs text-gray-300 leading-relaxed">{activity}</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-start gap-2 py-0.5">
        <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
        <span className="text-xs text-red-300 leading-relaxed">{activity}</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 py-0.5">
      <Loader2 size={12} className="text-blue-400 mt-0.5 flex-shrink-0 animate-spin" />
      <span className="text-xs text-gray-200 leading-relaxed">{activity}</span>
    </div>
  )
}

// ── AgentCard ─────────────────────────────────────────────────────────────────

function AgentCard({ agentId, events, isDone }) {
  const scrollRef = useRef(null)
  const meta = AGENT_META[agentId]
  const c = ACCENT_CLASSES[meta.accent]

  const lastEvent = events[events.length - 1]
  const agentDone =
    isDone ||
    (lastEvent?.status === 'completed' &&
      (lastEvent.activity.includes('done') || lastEvent.activity.includes('complete')))

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events.length])

  return (
    <div
      className={clsx(
        'bg-gray-900/80 border rounded-xl p-4 flex flex-col gap-2 transition-all duration-300',
        agentDone ? 'border-green-800/60' : c.border,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className={clsx('text-sm font-mono select-none', agentDone ? 'text-green-400' : c.header)}>
          {meta.icon}
        </span>
        <span className={clsx('text-xs font-semibold tracking-wide truncate', agentDone ? 'text-green-300' : c.header)}>
          {meta.label}
        </span>
        {agentDone && <CheckCircle2 size={12} className="text-green-400 ml-auto flex-shrink-0" />}
        {!agentDone && lastEvent?.status === 'running' && (
          <Loader2 size={11} className={clsx('ml-auto flex-shrink-0 animate-spin', c.header)} />
        )}
      </div>

      {/* Activity list — scrollable */}
      <div
        ref={scrollRef}
        className="flex flex-col gap-0.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700"
      >
        {events.map((evt, i) => (
          <ActivityItem key={i} event={evt} isLatest={i === events.length - 1} />
        ))}
      </div>
    </div>
  )
}

// ── PlaceholderCard — shown before any events arrive for an agent ─────────────

function PlaceholderCard({ agentId, label }) {
  const meta = AGENT_META[agentId]
  const c = ACCENT_CLASSES[meta.accent]
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 flex items-center gap-2">
      <span className={clsx('text-sm font-mono select-none opacity-30', c.header)}>{meta.icon}</span>
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  )
}

// ── ConnectionBadge ───────────────────────────────────────────────────────────

function ConnectionBadge({ isConnected, isDone, error }) {
  if (isDone) return null
  if (error) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-red-400">
        <AlertCircle size={10} /> Reconnecting…
      </span>
    )
  }
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 text-[10px]',
      isConnected ? 'text-green-400' : 'text-gray-500',
    )}>
      {isConnected
        ? <><Wifi size={10} /> Live</>
        : <><WifiOff size={10} /> Connecting…</>
      }
    </span>
  )
}

// ── ActivityFeed (main export) ────────────────────────────────────────────────

export default function ActivityFeed({ agentActivities, isConnected, isDone, error }) {
  const specialistsDone = ['agent1', 'agent2', 'agent3'].every((id) => {
    const evts = agentActivities[id] || []
    if (!evts.length) return false
    return evts[evts.length - 1].status === 'completed'
  })

  const hasChunking = Boolean(agentActivities['chunking']?.length)

  return (
    <div className="space-y-3">

      {/* ── Connection status bar ── */}
      <div className="flex items-center justify-end">
        <ConnectionBadge isConnected={isConnected} isDone={isDone} error={error} />
      </div>

      {/* ── Chunking (full width, only when active) ── */}
      {hasChunking && (
        <AgentCard agentId="chunking" events={agentActivities['chunking']} isDone={isDone} />
      )}

      {/* ── Agents 1 / 2 / 3 — 3-column grid, always visible ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {['agent1', 'agent2', 'agent3'].map((id) =>
          agentActivities[id]?.length ? (
            <AgentCard key={id} agentId={id} events={agentActivities[id]} isDone={isDone} />
          ) : (
            <PlaceholderCard
              key={id}
              agentId={id}
              label={`${AGENT_META[id].shortLabel} — waiting…`}
            />
          ),
        )}
      </div>

      {/* ── Agent 4 — full width, always visible ── */}
      {agentActivities['agent4']?.length ? (
        <AgentCard agentId="agent4" events={agentActivities['agent4']} isDone={isDone} />
      ) : specialistsDone ? (
        <div className="bg-gray-900/40 border border-orange-900/40 rounded-xl p-4 flex items-center gap-2">
          <Loader2 size={12} className="text-orange-400 animate-spin flex-shrink-0" />
          <span className="text-xs text-orange-300">
            Agent 4 — Chief Reviewer — synthesizing specialist reviews…
          </span>
        </div>
      ) : (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 flex items-center gap-2">
          <span className="text-sm font-mono opacity-30 text-orange-400 select-none">④</span>
          <span className="text-xs text-gray-600">
            Agent 4 — Chief Reviewer — waiting for specialist reviews…
          </span>
        </div>
      )}

    </div>
  )
}
