/**
 * CustomInDepthView — In-Depth view for the Custom Checklist Pipeline.
 * Shows: scoring breakdown table, per-category deep dives (NC3 findings),
 * full checklist coverage table, and consistency warnings.
 *
 * Equivalent to ResultsPage's "In-Depth" view for the standard pipeline.
 */

import { useState } from 'react'
import { clsx } from 'clsx'
import { AlertTriangle, CheckCircle2, XCircle, Minus, ChevronDown, ChevronRight } from 'lucide-react'
import CustomChecklistGrid from '../CustomChecklistGrid'

function scoreColor(s) {
  if (s >= 7) return '#34d399'
  if (s >= 5) return '#fbbf24'
  return '#f87171'
}

function statusIcon(status) {
  if (status === 'PASS')    return <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />
  if (status === 'PARTIAL') return <Minus size={13} className="text-yellow-400 flex-shrink-0" />
  return <XCircle size={13} className="text-red-400 flex-shrink-0" />
}

// ── Per-category detail card ───────────────────────────────────────────────────

function CategoryDeepDive({ result }) {
  const [open, setOpen] = useState(false)
  if (!result) return null

  const { category_name, status, score = 0, max_score = 0,
          items_passed = 0, items_partial = 0, items_failed = 0, findings = [], error_message } = result
  const pct = max_score > 0 ? (score / max_score) * 100 : 0
  const color = scoreColor(pct / 10)

  const passList    = findings.filter(f => f.status === 'PASS')
  const partialList = findings.filter(f => f.status === 'PARTIAL')
  const failList    = findings.filter(f => f.status === 'FAIL')

  return (
    <div className={clsx(
      'bg-gray-900 border rounded-xl overflow-hidden',
      status === 'error' ? 'border-red-900/40'
      : pct >= 70 ? 'border-green-900/30'
      : pct >= 50 ? 'border-yellow-900/30'
      : 'border-red-900/30'
    )}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-800/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2.5">
            {status === 'error' ? <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
            : pct >= 70 ? <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
            : pct >= 50 ? <Minus size={14} className="text-yellow-400 flex-shrink-0" />
            : <XCircle size={14} className="text-red-400 flex-shrink-0" />}
            <span className="text-sm font-semibold text-white truncate">{category_name}</span>
          </div>
          {/* Score bar */}
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden max-w-sm">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Item counts */}
          <div className="hidden sm:flex items-center gap-2 text-[11px]">
            <span className="text-green-400">✓ {items_passed}</span>
            {items_partial > 0 && <span className="text-yellow-400">~ {items_partial}</span>}
            <span className="text-red-400">✗ {items_failed}</span>
          </div>
          {/* Score */}
          <span className="text-sm font-bold font-mono" style={{ color }}>
            {status === 'error' ? 'ERR' : `${score.toFixed(1)}/${max_score.toFixed(1)}`}
          </span>
          {open ? <ChevronDown size={14} className="text-gray-500" />
                : <ChevronRight size={14} className="text-gray-500" />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-gray-800 px-5 py-4 bg-gray-950/40 space-y-4">
          {status === 'error' && error_message && (
            <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg">
              <p className="text-xs text-red-300">{error_message}</p>
            </div>
          )}

          {/* Failures first */}
          {failList.length > 0 && (
            <div>
              <p className="text-[11px] text-red-400 font-semibold uppercase tracking-wider mb-2">
                Failed ({failList.length})
              </p>
              <div className="space-y-2">
                {failList.map((f, i) => (
                  <div key={f.item_id || i} className="bg-red-950/20 border border-red-900/30 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      {statusIcon(f.status)}
                      <span className="text-xs font-mono text-gray-400">{f.item_id}</span>
                    </div>
                    {f.gap && <p className="text-xs text-red-300 ml-5">{f.gap}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Partials */}
          {partialList.length > 0 && (
            <div>
              <p className="text-[11px] text-yellow-400 font-semibold uppercase tracking-wider mb-2">
                Partial ({partialList.length})
              </p>
              <div className="space-y-2">
                {partialList.map((f, i) => (
                  <div key={f.item_id || i} className="bg-yellow-950/20 border border-yellow-900/30 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      {statusIcon(f.status)}
                      <span className="text-xs font-mono text-gray-400">{f.item_id}</span>
                      {f.score !== undefined && (
                        <span className="text-[10px] text-yellow-500 ml-auto">{f.score?.toFixed(1)}</span>
                      )}
                    </div>
                    {f.evidence && <p className="text-xs text-gray-400 ml-5 italic">{f.evidence}</p>}
                    {f.gap && <p className="text-xs text-yellow-300 ml-5">{f.gap}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passes */}
          {passList.length > 0 && (
            <div>
              <p className="text-[11px] text-green-400 font-semibold uppercase tracking-wider mb-2">
                Passed ({passList.length})
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {passList.map((f, i) => (
                  <div key={f.item_id || i} className="bg-green-950/20 border border-green-900/30 rounded-lg p-2.5 flex items-start gap-2">
                    {statusIcon(f.status)}
                    <div className="min-w-0">
                      <span className="text-xs font-mono text-gray-400">{f.item_id}</span>
                      {f.evidence && (
                        <p className="text-[10px] text-gray-500 mt-0.5 italic line-clamp-2">{f.evidence}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function CustomInDepthView({ output, session }) {
  if (!output) return null

  const nc3Results   = session?.agent3_output || []
  const nc2Output    = session?.agent2_output || {}
  const { consistency_warnings = [], scoring_breakdown = [], error_categories = [] } = output

  // Sort categories: failed first, then partial, then passed
  const sortedResults = [...nc3Results].sort((a, b) => {
    const aPct = a.max_score > 0 ? a.score / a.max_score : 0
    const bPct = b.max_score > 0 ? b.score / b.max_score : 0
    return aPct - bPct  // worst first
  })

  return (
    <div className="space-y-5" style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>

      {/* Scoring breakdown table */}
      {scoring_breakdown.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Scoring Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/50">
                  {['Category', 'Items', 'Passed', 'Failed', 'Raw Score', 'Score / 10', 'Weight', 'Weighted'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scoring_breakdown.map((row, i) => {
                  const score = row.normalised_score ?? row.score ?? 0
                  return (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-4 py-2.5 text-xs text-gray-300">{row.category_name || row.name || '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{row.items_evaluated ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-green-400">{row.items_passed ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-red-400">{row.items_failed ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-400">{row.raw_score != null ? row.raw_score.toFixed(2) : '—'}/{row.max_score != null ? row.max_score.toFixed(2) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono font-bold" style={{ color: scoreColor(score) }}>{score.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{row.weight != null ? `${Math.round(row.weight * 100)}%` : '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-blue-300">{(row.weighted_contribution ?? row.weighted_score) != null ? (row.weighted_contribution ?? row.weighted_score).toFixed(2) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-category deep dives */}
      {sortedResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
            Per-Category Evaluation — Worst to Best
          </h3>
          {sortedResults.map((result, i) => (
            <CategoryDeepDive key={result.category_id || i} result={result} />
          ))}
        </div>
      )}

      {/* Full checklist coverage grid — tabbed by category, same as FullChecklistGrid */}
      {nc3Results.length > 0 && (
        <CustomChecklistGrid nc3Results={nc3Results} nc2Output={nc2Output} />
      )}

      {/* Error categories */}
      {error_categories.length > 0 && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" />
            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Evaluation Errors</h3>
          </div>
          {error_categories.map((c, i) => (
            <p key={i} className="text-xs text-red-300">• {c}</p>
          ))}
        </div>
      )}

      {/* Consistency warnings */}
      {consistency_warnings.length > 0 && (
        <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-400" />
            <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">
              Consistency Warnings ({consistency_warnings.length})
            </h3>
          </div>
          {consistency_warnings.map((w, i) => (
            <div key={i} className="p-3 bg-yellow-950/30 border border-yellow-900/30 rounded-lg">
              <p className="text-xs text-yellow-300">
                {typeof w === 'string' ? w : (w.description || w.warning || w.finding || JSON.stringify(w))}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
