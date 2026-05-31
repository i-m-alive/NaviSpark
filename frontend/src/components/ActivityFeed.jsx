import { CheckCircle2, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react'

const AGENT_META = {
  agent_1: { label: 'Agent 1 — Completeness',   colour: 'indigo' },
  agent_2: { label: 'Agent 2 — Estimation',      colour: 'purple' },
  agent_3: { label: 'Agent 3 — Competitive',     colour: 'teal'   },
  agent_4: { label: 'Agent 4 — Chief Reviewer',  colour: 'orange' },
}

const COLOUR = {
  indigo: { dot: 'bg-indigo-500', text: 'text-indigo-400', border: 'border-indigo-800' },
  purple: { dot: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-800' },
  teal:   { dot: 'bg-teal-500',   text: 'text-teal-400',   border: 'border-teal-800'   },
  orange: { dot: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-800' },
}

function StatusIcon({ status, colourKey }) {
  const c = COLOUR[colourKey] ?? COLOUR.indigo
  if (status === 'completed') return <CheckCircle2 size={13} className="text-green-400 shrink-0" />
  if (status === 'error')     return <AlertCircle  size={13} className="text-red-400 shrink-0" />
  return <Loader2 size={13} className={`${c.text} animate-spin shrink-0`} />
}

function AgentCard({ agentId, activities, dbStatus }) {
  const meta = AGENT_META[agentId]
  const c    = COLOUR[meta.colour]

  const hasError    = activities.some(a => a.status === 'error')
  const allComplete = activities.length > 0 && activities.every(a => a.status === 'completed' || a.status === 'error')
  const anyRunning  = activities.some(a => a.status === 'running')

  const borderCls = hasError    ? 'border-red-800/60'
                  : allComplete ? 'border-green-800/60'
                  : anyRunning  ? c.border
                  :               'border-gray-800'

  const headerCls = hasError    ? 'text-red-400'
                  : allComplete ? 'text-green-400'
                  : anyRunning  ? c.text
                  :               'text-gray-500'

  return (
    <div className={`bg-gray-900/80 border ${borderCls} rounded-xl p-4 transition-all duration-500`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
        <span className={`text-xs font-semibold ${headerCls} leading-none`}>{meta.label}</span>
        <span className="ml-auto">
          {hasError    ? <AlertCircle  size={14} className="text-red-400" />              :
           allComplete ? <CheckCircle2 size={14} className="text-green-400" />            :
           anyRunning  ? <Loader2      size={14} className={`${c.text} animate-spin`} />  :
                         <Loader2      size={14} className="text-gray-700 animate-spin" />}
        </span>
      </div>

      {activities.length === 0 ? (
        <p className="text-xs text-gray-700 italic font-mono">
          {agentId === 'agent_4' ? 'Waiting for specialist reviews…' : 'Connecting…'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {activities.map(({ activity, status }, i) => (
            <li key={i} className="flex items-start gap-2 font-mono text-xs">
              <StatusIcon status={status} colourKey={meta.colour} />
              <span className={
                status === 'completed' ? 'text-gray-300' :
                status === 'error'     ? 'text-red-400'  :
                c.text
              }>
                {activity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ActivityFeed({ agentState, connected, dbStatus }) {
  const specialistsDone = dbStatus === 'agents_complete' || dbStatus === 'complete'

  function getActivities(agentId) {
    if (agentState.has(agentId)) return agentState.get(agentId)
    if (agentId === 'agent_4') {
      if (dbStatus === 'agents_complete') return [{ activity: 'Synthesising all specialist findings…', status: 'running' }]
      return []
    }
    if (specialistsDone) return [{ activity: 'Review complete', status: 'completed' }]
    if (dbStatus === 'pipeline_running') return [{ activity: 'Analysing proposal…', status: 'running' }]
    return []
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {connected
          ? <><Wifi    size={12} className="text-green-400" /><span className="text-xs text-green-400">Live stream connected</span></>
          : <><WifiOff size={12} className="text-gray-600" /><span className="text-xs text-gray-600">Connecting to stream…</span></>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {['agent_1', 'agent_2', 'agent_3'].map(id => (
          <AgentCard key={id} agentId={id} activities={getActivities(id)} dbStatus={dbStatus} />
        ))}
      </div>

      <AgentCard agentId="agent_4" activities={getActivities('agent_4')} dbStatus={dbStatus} />
    </div>
  )
}
