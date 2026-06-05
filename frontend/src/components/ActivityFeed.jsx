/**
 * ActivityFeed — live agent activity panel.
 *
 * Standard mode: shows Agent 1 / Agent 2 / Agent 3 / Agent 4 with standard labels.
 * Custom mode (customMode prop): shows NCR1 / NCR2 / NCR3 with sequential reveal
 *   animation and hides the Agent 4 row (NC4 is displayed separately in
 *   PipelineProgressScreen).
 *
 * Props:
 *   agentActivities  — { agent_id: ActivityEvent[] } from useActivityFeed
 *   isConnected      — bool: WebSocket is open
 *   isDone           — bool: pipeline finished
 *   error            — string | null: connection error
 *   customMode       — bool: use NCR labels + sequential reveal (default false)
 */

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { clsx } from 'clsx'

// ── Agent metadata — standard pipeline ───────────────────────────────────────

const AGENT_META = {
  chunking: { label: 'Document Pre-processing',        shortLabel: 'Chunking', accent: 'yellow',  icon: '✂'  },
  agent1:   { label: 'Agent 1 — Completeness & Clarity', shortLabel: 'Agent 1', accent: 'blue',    icon: '①' },
  agent2:   { label: 'Agent 2 — Estimation & Commercial', shortLabel: 'Agent 2', accent: 'emerald', icon: '②' },
  agent3:   { label: 'Agent 3 — Competitive Strength',  shortLabel: 'Agent 3', accent: 'violet',  icon: '③' },
  agent4:   { label: 'Agent 4 — Chief Reviewer',        shortLabel: 'Agent 4', accent: 'orange',  icon: '④' },
}

// ── Agent metadata — custom pipeline (NCR specialists) ───────────────────────

const CUSTOM_AGENT_META = {
  agent1: { label: 'NCR1 — Clarity & Completeness', shortLabel: 'NCR1', accent: 'blue',    icon: '①' },
  agent2: { label: 'NCR2 — Commercial Strength',    shortLabel: 'NCR2', accent: 'emerald', icon: '②' },
  agent3: { label: 'NCR3 — Competitive Position',   shortLabel: 'NCR3', accent: 'violet',  icon: '③' },
}

function getMeta(agentId, customMode) {
  if (customMode && CUSTOM_AGENT_META[agentId]) return CUSTOM_AGENT_META[agentId]
  return AGENT_META[agentId] || { label: agentId, shortLabel: agentId, accent: 'blue', icon: '?' }
}

const ACCENT_CLASSES = {
  yellow:  { border: 'border-yellow-800',  header: 'text-yellow-400'  },
  blue:    { border: 'border-blue-800',    header: 'text-blue-400'    },
  emerald: { border: 'border-emerald-800', header: 'text-emerald-400' },
  violet:  { border: 'border-violet-800',  header: 'text-violet-400'  },
  orange:  { border: 'border-orange-800',  header: 'text-orange-400'  },
}

// ── ActivityItem ──────────────────────────────────────────────────────────────

function ActivityItem({ event, agentDone, isCurrentStep }) {
  const { activity, status } = event

  if (status === 'error') {
    return (
      <div className="flex items-start gap-2 py-0.5">
        <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
        <span className="text-xs text-red-300 leading-relaxed">{activity}</span>
      </div>
    )
  }

  if (status === 'completed' || agentDone) {
    return (
      <div className="flex items-start gap-2 py-0.5">
        <CheckCircle2 size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
        <span className="text-xs text-gray-300 leading-relaxed">{activity}</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 py-0.5">
      <Loader2
        size={12}
        className={clsx('mt-0.5 flex-shrink-0 animate-spin', isCurrentStep ? 'text-blue-400' : 'text-gray-600')}
      />
      <span className={clsx('text-xs leading-relaxed', isCurrentStep ? 'text-gray-200' : 'text-gray-500')}>
        {activity}
      </span>
    </div>
  )
}

// ── AgentCard — live card once events arrive ──────────────────────────────────

function AgentCard({ agentId, events, isDone, customMode }) {
  const scrollRef = useRef(null)
  const meta = getMeta(agentId, customMode)
  const c    = ACCENT_CLASSES[meta.accent]

  const lastEvent = events[events.length - 1]
  const agentDone =
    isDone ||
    (lastEvent?.status === 'completed' &&
      (lastEvent.activity.includes('done') || lastEvent.activity.includes('complete')))

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [events.length])

  return (
    <div className={clsx(
      'bg-gray-900/80 border rounded-xl p-4 flex flex-col gap-2 transition-all duration-300',
      agentDone ? 'border-green-800/60' : c.border,
    )}>
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

      <div
        ref={scrollRef}
        className="flex flex-col gap-0.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700"
      >
        {events.map((evt, i) => (
          <ActivityItem
            key={i}
            event={evt}
            agentDone={agentDone}
            isCurrentStep={!agentDone && evt.status === 'running' && i === events.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

// ── RunningPlaceholderCard — shown after reveal, before real events arrive ────

function RunningPlaceholderCard({ agentId, customMode }) {
  const meta = getMeta(agentId, customMode)
  const c    = ACCENT_CLASSES[meta.accent]
  return (
    <div
      className={clsx('bg-gray-900/80 border rounded-xl p-4', c.border)}
      style={{ animation: 'slide-up-fade 0.3s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Loader2 size={12} className={clsx('animate-spin flex-shrink-0', c.header)} />
        <span className={clsx('text-xs font-semibold tracking-wide', c.header)}>{meta.label}</span>
      </div>
      <p className="text-xs text-gray-500 ml-5">Running analysis…</p>
    </div>
  )
}

// ── PlaceholderCard — shown before an agent has been revealed yet ─────────────

function PlaceholderCard({ agentId, customMode }) {
  const meta = getMeta(agentId, customMode)
  const c    = ACCENT_CLASSES[meta.accent]
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 flex items-center gap-2">
      <span className={clsx('text-sm font-mono select-none opacity-30', c.header)}>{meta.icon}</span>
      <span className="text-xs text-gray-600">{meta.shortLabel} — waiting…</span>
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
    <span className={clsx('inline-flex items-center gap-1 text-[10px]', isConnected ? 'text-green-400' : 'text-gray-500')}>
      {isConnected ? <><Wifi size={10} /> Live</> : <><WifiOff size={10} /> Connecting…</>}
    </span>
  )
}

// ── ActivityFeed (main export) ────────────────────────────────────────────────

export default function ActivityFeed({ agentActivities, isConnected, isDone, error, customMode = false }) {
  // Sequential reveal for custom mode: NCR1 immediately, NCR2 after 4s, NCR3 after 8s.
  // In standard mode activatedCount stays 0 (unused — all cards follow standard logic).
  const [activatedCount, setActivatedCount] = useState(0)

  useEffect(() => {
    if (!customMode) return
    setActivatedCount(1)  // NCR1 active immediately
    const t2 = setTimeout(() => setActivatedCount(c => Math.max(c, 2)), 4000)
    const t3 = setTimeout(() => setActivatedCount(c => Math.max(c, 3)), 8000)
    return () => { clearTimeout(t2); clearTimeout(t3) }
  }, [customMode])

  // If real events arrive earlier, advance the reveal immediately
  useEffect(() => {
    if (!customMode) return
    if (agentActivities['agent2']?.length) setActivatedCount(c => Math.max(c, 2))
    if (agentActivities['agent3']?.length) setActivatedCount(c => Math.max(c, 3))
  }, [customMode, agentActivities['agent2']?.length, agentActivities['agent3']?.length])

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
        <AgentCard agentId="chunking" events={agentActivities['chunking']} isDone={isDone} customMode={false} />
      )}

      {/* ── NCR1 / NCR2 / NCR3  (custom)  or  Agent 1 / 2 / 3  (standard) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {['agent1', 'agent2', 'agent3'].map((id, idx) => {
          const hasEvents = Boolean(agentActivities[id]?.length)

          if (hasEvents) {
            return <AgentCard key={id} agentId={id} events={agentActivities[id]} isDone={isDone} customMode={customMode} />
          }

          if (customMode) {
            // Sequential reveal: idx < activatedCount → show running spinner
            return idx < activatedCount
              ? <RunningPlaceholderCard key={id} agentId={id} customMode />
              : <PlaceholderCard key={id} agentId={id} customMode />
          }

          // Standard mode: static "waiting" placeholder until events arrive
          return <PlaceholderCard key={id} agentId={id} customMode={false} />
        })}
      </div>

      {/* ── Agent 4 / Chief Reviewer — standard mode only ────────────────────
          In custom mode, NC4 is displayed separately in PipelineProgressScreen. */}
      {!customMode && (
        agentActivities['agent4']?.length ? (
          <AgentCard agentId="agent4" events={agentActivities['agent4']} isDone={isDone} customMode={false} />
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
        )
      )}

    </div>
  )
}
