import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { CheckCircle2, Loader2, AlertCircle, Clock, GitBranch } from 'lucide-react'

function scoreColor(score) {
  if (!score && score !== 0) return '#6b7280'
  if (score >= 7) return '#34d399'
  if (score >= 5) return '#fbbf24'
  return '#f87171'
}

function verdictShort(verdict) {
  if (verdict === 'READY TO SEND')        return 'Ready'
  if (verdict === 'REVISE BEFORE SENDING') return 'Revise'
  if (verdict === 'NEEDS MAJOR REVISION' ||
      verdict === 'DO NOT SEND')           return 'Major revision'
  return verdict || '—'
}

function statusIcon(status) {
  if (status === 'complete')        return <CheckCircle2 size={11} className="text-green-400" />
  if (status === 'pipeline_failed') return <AlertCircle  size={11} className="text-red-400" />
  if (status?.includes('running') || status?.includes('complete') && status !== 'complete')
                                    return <Loader2 size={11} className="text-blue-400 animate-spin" />
  return <Clock size={11} className="text-gray-500" />
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function VersionTimeline({ versions, currentSessionId }) {
  const navigate = useNavigate()
  if (!versions || versions.length <= 1) return null

  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 mb-4 animate-slide-down"
    >
      <div className="flex items-center gap-2 mb-3">
        <GitBranch size={12} className="text-gray-500" />
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
          Revision History · {versions.length} versions
        </span>
      </div>

      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {versions.map((v, i) => {
          const isCurrent  = v.id === currentSessionId
          const score      = v.agent4_output?.overall_score
          const verdict    = v.agent4_output?.verdict
          const isComplete = v.status === 'complete'

          return (
            <div key={v.id} className="flex items-center flex-shrink-0">

              {/* Version node */}
              <button
                onClick={() => !isCurrent && navigate(`/results/${v.id}`)}
                disabled={isCurrent}
                className={clsx(
                  'flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border transition-all duration-150 min-w-[80px]',
                  isCurrent
                    ? 'bg-blue-950/40 border-blue-700/60 cursor-default'
                    : 'border-gray-800 hover:border-gray-600 hover:bg-gray-800/50 cursor-pointer',
                )}
              >
                {/* Version badge */}
                <div className="flex items-center gap-1">
                  <span className={clsx(
                    'text-[10px] font-bold font-mono',
                    isCurrent ? 'text-blue-300' : 'text-gray-400',
                  )}>
                    V{v.version_number}
                  </span>
                  {isCurrent && (
                    <span className="text-[8px] text-blue-400 bg-blue-950 border border-blue-800 px-1 rounded-full">
                      NOW
                    </span>
                  )}
                </div>

                {/* Score ring (small) */}
                {isComplete && score != null ? (
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: scoreColor(score) }}
                    />
                    <span className="text-[11px] font-mono font-bold" style={{ color: scoreColor(score) }}>
                      {score.toFixed(1)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {statusIcon(v.status)}
                    <span className="text-[10px] text-gray-600 capitalize">{v.status?.replace(/_/g, ' ')}</span>
                  </div>
                )}

                {/* Verdict */}
                {isComplete && verdict && (
                  <span className="text-[9px] text-gray-500 text-center leading-tight">
                    {verdictShort(verdict)}
                  </span>
                )}

                {/* Time */}
                <span className="text-[9px] text-gray-700">{timeAgo(v.created_at)}</span>
              </button>

              {/* Connector arrow between versions */}
              {i < versions.length - 1 && (
                <div className="flex items-center flex-shrink-0 px-1">
                  {/* Delta badge between consecutive complete versions */}
                  {isComplete && versions[i + 1]?.status === 'complete' && (() => {
                    const nextScore = versions[i + 1]?.agent4_output?.overall_score
                    if (score != null && nextScore != null) {
                      const delta = nextScore - score
                      return (
                        <span className={clsx(
                          'text-[9px] font-mono px-1 py-0.5 rounded',
                          delta > 0 ? 'text-green-400 bg-green-950/40' : delta < 0 ? 'text-red-400 bg-red-950/40' : 'text-gray-600',
                        )}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                        </span>
                      )
                    }
                    return <span className="text-gray-700 text-sm">→</span>
                  })()}
                  {(!isComplete || !versions[i + 1]?.agent4_output) && (
                    <span className="text-gray-700 text-sm px-0.5">→</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
