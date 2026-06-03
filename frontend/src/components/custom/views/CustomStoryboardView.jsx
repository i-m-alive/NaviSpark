/**
 * CustomStoryboardView — Storyboard / Narrative view for the Custom Checklist Pipeline.
 *
 * Tells the story of the proposal through the lens of each checklist category,
 * ordered from strongest to weakest. Equivalent to StoryboardView for Agent 1-4.
 */

import { clsx } from 'clsx'
import { CheckCircle2, XCircle, Minus, AlertTriangle, BookOpen, TrendingUp, TrendingDown } from 'lucide-react'

function scoreColor(pct) {
  if (pct >= 70) return 'text-green-400'
  if (pct >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreBarColor(pct) {
  if (pct >= 70) return 'bg-green-500'
  if (pct >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

function statusDot(status) {
  if (status === 'PASS')    return <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
  if (status === 'PARTIAL') return <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
  return <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
}

// ── Chapter for one checklist category ───────────────────────────────────────

function Chapter({ result, rank, total }) {
  if (!result) return null

  const { category_name, status, score = 0, max_score = 0,
          items_passed = 0, items_partial = 0, items_failed = 0, findings = [] } = result
  const pct = max_score > 0 ? Math.round((score / max_score) * 100) : 0

  const TrendIcon = pct >= 70 ? TrendingUp : pct >= 50 ? Minus : TrendingDown
  const trendColor = pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'

  const keyStrengths = findings.filter(f => f.status === 'PASS'    && f.evidence).slice(0, 2)
  const keyGaps      = findings.filter(f => f.status === 'FAIL'    && f.gap).slice(0, 2)
  const partials     = findings.filter(f => f.status === 'PARTIAL').slice(0, 2)

  const isLast = rank === total

  return (
    <div className="flex gap-5">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0">
        {/* Rank circle */}
        <div className={clsx(
          'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 flex-shrink-0',
          pct >= 70 ? 'border-green-600 bg-green-950/60 text-green-300'
          : pct >= 50 ? 'border-yellow-600 bg-yellow-950/60 text-yellow-300'
          : 'border-red-600 bg-red-950/60 text-red-300'
        )}>
          {rank}
        </div>
        {/* Connector line */}
        {!isLast && <div className="w-px flex-1 bg-gray-800 my-2" />}
      </div>

      {/* Chapter content */}
      <div className={clsx('flex-1 pb-8', isLast && 'pb-0')}>
        {/* Chapter header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">{category_name}</h3>
            <div className="flex items-center gap-3 mt-1.5">
              {/* Progress bar */}
              <div className="flex-1 max-w-[200px] h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full', scoreBarColor(pct))}
                  style={{ width: `${pct}%` }} />
              </div>
              <span className={clsx('text-xs font-mono font-bold flex-shrink-0', scoreColor(pct))}>
                {pct}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 text-[11px]">
            <TrendIcon size={14} className={trendColor} />
            <span className="text-gray-500">{items_passed}✓ {items_partial > 0 ? `${items_partial}~ ` : ''}{items_failed}✗</span>
          </div>
        </div>

        {/* Chapter body — narrative style */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          {/* Status overview */}
          {status === 'error' ? (
            <div className="flex items-center gap-2 text-xs text-red-300">
              <AlertTriangle size={12} className="text-red-400" />
              This category could not be evaluated due to an error.
            </div>
          ) : pct >= 70 ? (
            <p className="text-sm text-gray-300 leading-relaxed">
              <span className="text-green-400 font-medium">Strong performance.</span>{' '}
              This category is well-addressed in the proposal with {items_passed} of {items_passed + items_partial + items_failed} criteria met.
            </p>
          ) : pct >= 50 ? (
            <p className="text-sm text-gray-300 leading-relaxed">
              <span className="text-yellow-400 font-medium">Partial coverage.</span>{' '}
              {items_passed} criteria met, {items_partial > 0 ? `${items_partial} partially addressed, ` : ''}{items_failed} gaps remain.
            </p>
          ) : (
            <p className="text-sm text-gray-300 leading-relaxed">
              <span className="text-red-400 font-medium">Significant gaps.</span>{' '}
              Only {items_passed} of {items_passed + items_partial + items_failed} criteria are addressed. This category needs substantial attention.
            </p>
          )}

          {/* Key strengths */}
          {keyStrengths.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wider">Evidenced strengths</p>
              {keyStrengths.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={11} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300 italic">{f.evidence}</p>
                </div>
              ))}
            </div>
          )}

          {/* Partials */}
          {partials.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-yellow-600 font-semibold uppercase tracking-wider">Partially addressed</p>
              {partials.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Minus size={11} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300">
                    <span className="font-mono text-gray-500 mr-1">{f.item_id}</span>
                    {f.gap || f.evidence || 'Partially addressed'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Key gaps */}
          {keyGaps.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wider">Critical gaps</p>
              {keyGaps.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <XCircle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300">{f.gap}</p>
                </div>
              ))}
            </div>
          )}

          {/* Item summary chips when no evidence/gaps to show */}
          {keyStrengths.length === 0 && keyGaps.length === 0 && partials.length === 0 && findings.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {findings.slice(0, 8).map((f, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 border border-gray-700">
                  {statusDot(f.status)}
                  <span className="text-[10px] font-mono text-gray-400">{f.item_id}</span>
                </div>
              ))}
              {findings.length > 8 && (
                <span className="text-[10px] text-gray-600">+{findings.length - 8} more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function CustomStoryboardView({ output, session }) {
  if (!output) return null

  const nc3Results = (session?.agent3_output || [])
  const { plain_english_summary, verdict, top_3_strengths = [], priority_actions = {} } = output

  // Sort: best first for a compelling narrative arc
  const sortedResults = [...nc3Results].sort((a, b) => {
    const aPct = a.max_score > 0 ? a.score / a.max_score : 0
    const bPct = b.max_score > 0 ? b.score / b.max_score : 0
    return bPct - aPct
  })

  const mustFix = (priority_actions.must_fix || []).slice(0, 3)

  return (
    <div className="space-y-6" style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>

      {/* Narrative intro */}
      {plain_english_summary && (
        <div className="bg-gray-900 border border-blue-900/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} className="text-blue-400" />
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Executive Narrative</h3>
          </div>
          <p className="text-sm text-gray-200 leading-relaxed">{plain_english_summary}</p>
        </div>
      )}

      {/* Top strengths callout */}
      {top_3_strengths.length > 0 && (
        <div className="bg-green-950/20 border border-green-900/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={13} className="text-green-400" />
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">Standout Strengths</p>
          </div>
          <ul className="space-y-1.5">
            {top_3_strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                <CheckCircle2 size={13} className="text-green-400 flex-shrink-0 mt-0.5" />
                {typeof s === 'string' ? s : (s.highlight || s.description || s.category_name || s.text || s.category || '')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Chapter-by-chapter story */}
      {sortedResults.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">
            Proposal Story — Category by Category (Strongest First)
          </h3>
          <div>
            {sortedResults.map((result, i) => (
              <Chapter
                key={result.category_id || i}
                result={result}
                rank={i + 1}
                total={sortedResults.length}
              />
            ))}
          </div>
        </div>
      )}

      {/* Must-fix callout at the end */}
      {mustFix.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
            Before This Proposal Is Sent
          </p>
          <ul className="space-y-1.5">
            {mustFix.map((item, i) => {
              const text = typeof item === 'string' ? item
                : (item.gap_description || item.action || item.description || item.gap || '')
              // Skip parse-error fallbacks
              if (!text || text.toLowerCase().includes('llm response could not be parsed')) return null
              return (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <XCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                  {text}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
