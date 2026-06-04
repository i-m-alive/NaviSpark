import { useState } from 'react'
import { clsx } from 'clsx'
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Minus } from 'lucide-react'

function statusIcon(status) {
  if (status === 'PASS')    return <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />
  if (status === 'PARTIAL') return <Minus size={13} className="text-yellow-400 flex-shrink-0" />
  if (status === 'FAIL')    return <XCircle size={13} className="text-red-400 flex-shrink-0" />
  return <AlertTriangle size={13} className="text-gray-500 flex-shrink-0" />
}

function scoreBar(score, maxScore) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0
  const color = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 w-16 text-right flex-shrink-0">
        {score?.toFixed(1)} / {maxScore?.toFixed(1)}
      </span>
    </div>
  )
}

function FindingRow({ finding }) {
  const { item_id, status, score, evidence, gap } = finding
  return (
    <div className={clsx(
      'p-3 rounded-lg border space-y-1.5',
      status === 'PASS'    ? 'border-green-900/40 bg-green-950/20'
      : status === 'PARTIAL' ? 'border-yellow-900/40 bg-yellow-950/20'
      : status === 'FAIL'    ? 'border-red-900/40 bg-red-950/20'
      : 'border-gray-800 bg-gray-900'
    )}>
      <div className="flex items-center gap-2">
        {statusIcon(status)}
        <span className="text-xs font-mono text-gray-400">{item_id}</span>
        <span className={clsx(
          'ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded',
          status === 'PASS' ? 'text-green-300 bg-green-900/50'
          : status === 'PARTIAL' ? 'text-yellow-300 bg-yellow-900/50'
          : 'text-red-300 bg-red-900/50'
        )}>
          {status}
        </span>
        {score !== undefined && (
          <span className="text-[10px] text-gray-500">{score?.toFixed(1)}</span>
        )}
      </div>
      {evidence && (
        <p className="text-xs text-gray-400 italic leading-snug">
          <span className="text-gray-600 not-italic">Evidence: </span>{evidence}
        </p>
      )}
      {gap && (
        <p className="text-xs text-red-300 leading-snug">
          <span className="text-gray-500 not-italic">Gap: </span>{gap}
        </p>
      )}
    </div>
  )
}

export default function CategoryScoreCard({ result }) {
  const [expanded, setExpanded] = useState(false)

  if (!result) return null

  const {
    category_name,
    status,
    score = 0,
    max_score = 0,
    items_evaluated = 0,
    items_passed = 0,
    items_partial = 0,
    items_failed = 0,
    findings = [],
    error_message,
  } = result

  const pct = max_score > 0 ? (score / max_score) * 100 : 0
  const statusColor = status === 'error' ? 'border-red-900/40'
    : pct >= 70 ? 'border-green-900/40'
    : pct >= 50 ? 'border-yellow-900/40'
    : 'border-red-900/40'

  return (
    <div className={clsx('bg-gray-900 border rounded-xl overflow-hidden', statusColor)}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-800/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {status === 'error'
              ? <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              : pct >= 70
              ? <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
              : pct >= 50
              ? <Minus size={14} className="text-yellow-400 flex-shrink-0" />
              : <XCircle size={14} className="text-red-400 flex-shrink-0" />
            }
            <span className="text-sm font-semibold text-white truncate">{category_name}</span>
          </div>
          {status !== 'error' && scoreBar(score, max_score)}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {status !== 'error' && (
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <span className="text-green-400">✓{items_passed}</span>
              {items_partial > 0 && <span className="text-yellow-400">~{items_partial}</span>}
              <span className="text-red-400">✗{items_failed}</span>
            </div>
          )}
          <span className={clsx(
            'text-xs font-mono font-bold',
            pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'
          )}>
            {status === 'error' ? 'ERR' : `${Math.round(pct)}%`}
          </span>
          {expanded
            ? <ChevronDown size={14} className="text-gray-500" />
            : <ChevronRight size={14} className="text-gray-500" />
          }
        </div>
      </button>

      {/* Expanded findings */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-2 bg-gray-950/40">
          {status === 'error' && error_message && (
            <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg">
              <p className="text-xs text-red-300">{error_message}</p>
            </div>
          )}
          {findings.map((f, i) => (
            <FindingRow key={f.item_id || i} finding={f} />
          ))}
          {findings.length === 0 && status !== 'error' && (
            <p className="text-xs text-gray-600 text-center py-2">No findings to display.</p>
          )}
        </div>
      )}
    </div>
  )
}
