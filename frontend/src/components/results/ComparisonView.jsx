import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle, ArrowRight, Award } from 'lucide-react'

// ── Delta helpers ─────────────────────────────────────────────────────────────

function Delta({ value, size = 'md', showSign = true }) {
  const isPos  = value > 0
  const isNeg  = value < 0
  const sizes  = { sm: 'text-[10px]', md: 'text-sm', lg: 'text-base' }
  const Icon   = isPos ? TrendingUp : isNeg ? TrendingDown : Minus
  const colors = isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-gray-500'
  return (
    <span className={clsx('flex items-center gap-1 font-mono font-bold', sizes[size], colors)}>
      <Icon size={size === 'lg' ? 14 : 11} />
      {showSign && isPos && '+'}{value.toFixed(1)}
    </span>
  )
}

function ScoreCard({ label, prev, curr }) {
  const delta  = curr - prev
  const color  = curr >= 7 ? '#34d399' : curr >= 5 ? '#fbbf24' : '#f87171'
  const isPos  = delta > 0
  const isNeg  = delta < 0
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col gap-2">
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold" style={{ color }}>{curr.toFixed(1)}</span>
          <span className="text-sm text-gray-600">/10</span>
        </div>
        <div className={clsx(
          'flex items-center gap-1 text-xs font-mono font-bold px-2 py-1 rounded-full border',
          isPos ? 'text-green-400 bg-green-950/50 border-green-800' :
          isNeg ? 'text-red-400 bg-red-950/50 border-red-800' :
                  'text-gray-500 bg-gray-800 border-gray-700',
        )}>
          {isPos && '+'}{delta.toFixed(1)}
          {isPos ? <TrendingUp size={10} /> : isNeg ? <TrendingDown size={10} /> : <Minus size={10} />}
        </div>
      </div>
      {/* Before/after bar */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-700 w-10">Before</span>
          <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gray-600 rounded-full" style={{ width: `${(prev / 10) * 100}%` }} />
          </div>
          <span className="text-[9px] text-gray-600 font-mono w-6">{prev.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-500 w-10">After</span>
          <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(curr / 10) * 100}%`, backgroundColor: color }} />
          </div>
          <span className="text-[9px] font-mono w-6" style={{ color }}>{curr.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Verdict change banner ─────────────────────────────────────────────────────

function VerdictChange({ prev, curr }) {
  const changed  = prev !== curr
  const improved = (
    (prev === 'NEEDS MAJOR REVISION' || prev === 'DO NOT SEND') && curr !== 'NEEDS MAJOR REVISION' && curr !== 'DO NOT SEND'
  ) || (prev === 'REVISE BEFORE SENDING' && curr === 'READY TO SEND')

  if (!changed) {
    return (
      <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
        <Minus size={14} className="text-gray-500" />
        <p className="text-sm text-gray-400">
          Verdict unchanged: <span className="font-semibold text-white">{curr}</span>
        </p>
      </div>
    )
  }

  return (
    <div className={clsx(
      'flex items-center gap-3 rounded-xl px-4 py-3 border',
      improved ? 'bg-green-950/30 border-green-800/60' : 'bg-yellow-950/20 border-yellow-800/50',
    )}>
      {improved ? <Award size={14} className="text-green-400 flex-shrink-0" /> : <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 line-through">{prev}</span>
        <ArrowRight size={12} className={improved ? 'text-green-500' : 'text-yellow-500'} />
        <span className={clsx('text-sm font-bold', improved ? 'text-green-300' : 'text-yellow-300')}>{curr}</span>
        {improved && <span className="text-[10px] text-green-500 bg-green-950 border border-green-800 px-2 py-0.5 rounded-full">Improved! 🎉</span>}
      </div>
    </div>
  )
}

// ── Priority actions diff ─────────────────────────────────────────────────────

function ActionsDiff({ prevOutput, currOutput }) {
  const prevMust = prevOutput?.priority_actions?.must_fix || []
  const currMust = currOutput?.priority_actions?.must_fix || []
  const reduced  = prevMust.length - currMust.length

  const prevShould = prevOutput?.priority_actions?.should_fix || []
  const currShould = currOutput?.priority_actions?.should_fix || []

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
        Priority Actions
      </h3>

      {/* Count summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Critical (Must Fix)', prev: prevMust.length, curr: currMust.length },
          { label: 'Important (Should Fix)', prev: prevShould.length, curr: currShould.length },
        ].map(({ label, prev, curr }) => {
          const delta  = curr - prev
          const isGood = delta <= 0
          return (
            <div key={label} className={clsx(
              'rounded-xl border p-3 text-center',
              isGood ? 'bg-green-950/20 border-green-900/40' : 'bg-red-950/20 border-red-900/40',
            )}>
              <p className="text-[10px] text-gray-500 mb-1">{label}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-500 font-mono text-sm line-through">{prev}</span>
                <ArrowRight size={11} className="text-gray-600" />
                <span className={clsx('font-mono text-lg font-bold', isGood ? 'text-green-400' : 'text-red-400')}>{curr}</span>
              </div>
              {delta !== 0 && (
                <p className={clsx('text-[10px] mt-1', isGood ? 'text-green-500' : 'text-red-500')}>
                  {delta < 0 ? `${Math.abs(delta)} resolved` : `${delta} new`}
                </p>
              )}
              {delta === 0 && <p className="text-[10px] mt-1 text-gray-600">unchanged</p>}
            </div>
          )
        })}
      </div>

      {/* Remaining critical issues */}
      {currMust.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            Remaining Critical Issues ({currMust.length})
          </p>
          <div className="space-y-1.5">
            {currMust.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-300 bg-gray-950 rounded-lg px-3 py-2">
                <AlertCircle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
                {item.action}
              </div>
            ))}
          </div>
        </div>
      )}

      {currMust.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950/40 border border-green-900/50 rounded-lg px-3 py-2.5">
          <CheckCircle2 size={13} />
          <span>All critical issues resolved — this version is ready to submit!</span>
        </div>
      )}
    </div>
  )
}

// ── Checklist delta ───────────────────────────────────────────────────────────

function ChecklistDelta({ prevOutput, currOutput }) {
  const prevList = prevOutput?.checklist_coverage || []
  const currList = currOutput?.checklist_coverage || []

  if (!prevList.length || !currList.length) return null

  // Items that improved in status
  const improved = currList.filter(c => {
    const p = prevList.find(x => x.id === c.id)
    return p && p.status !== 'COVERED' && c.status === 'COVERED'
  })

  // Items that regressed (rare but possible)
  const regressed = currList.filter(c => {
    const p = prevList.find(x => x.id === c.id)
    return p && p.status === 'COVERED' && c.status !== 'COVERED'
  })

  // Items still missing
  const stillMissing = currList.filter(c => c.status === 'MISSING')

  const prevCovered = prevList.filter(x => x.status === 'COVERED').length
  const currCovered = currList.filter(x => x.status === 'COVERED').length

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Checklist Coverage
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 line-through">{prevCovered}/{prevList.length}</span>
          <ArrowRight size={11} className="text-gray-600" />
          <span className={clsx(
            'font-mono font-bold',
            currCovered > prevCovered ? 'text-green-400' : currCovered < prevCovered ? 'text-red-400' : 'text-gray-400',
          )}>
            {currCovered}/{currList.length}
          </span>
          {currCovered !== prevCovered && (
            <span className={clsx(
              'text-[10px] px-1.5 py-0.5 rounded-full border font-mono',
              currCovered > prevCovered
                ? 'text-green-400 bg-green-950/50 border-green-800'
                : 'text-red-400 bg-red-950/50 border-red-800',
            )}>
              {currCovered > prevCovered ? '+' : ''}{currCovered - prevCovered}
            </span>
          )}
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 w-12">Before</span>
          <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gray-600 rounded-full" style={{ width: `${(prevCovered / prevList.length) * 100}%` }} />
          </div>
          <span className="text-[10px] text-gray-600 font-mono w-8">{Math.round((prevCovered / prevList.length) * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-12">After</span>
          <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: `${(currCovered / currList.length) * 100}%` }} />
          </div>
          <span className="text-[10px] text-green-400 font-mono w-8">{Math.round((currCovered / currList.length) * 100)}%</span>
        </div>
      </div>

      {/* Newly covered */}
      {improved.length > 0 && (
        <div>
          <p className="text-[10px] text-green-500 uppercase tracking-wider mb-2">
            Newly Covered ({improved.length})
          </p>
          <div className="space-y-1">
            {improved.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                <CheckCircle2 size={11} className="text-green-400 flex-shrink-0" />
                <span className="font-mono text-[10px] text-gray-600">{item.id}</span>
                <span>{item.topic}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Still missing */}
      {stillMissing.length > 0 && (
        <div>
          <p className="text-[10px] text-red-400 uppercase tracking-wider mb-2">
            Still Missing ({stillMissing.length})
          </p>
          <div className="space-y-1">
            {stillMissing.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-red-500 flex-shrink-0">✕</span>
                <span className="font-mono text-[10px] text-gray-600">{item.id}</span>
                <span>{item.topic}</span>
              </div>
            ))}
            {stillMissing.length > 5 && (
              <p className="text-[10px] text-gray-600">+ {stillMissing.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {/* Regressions (rare) */}
      {regressed.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3">
          <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1.5">
            ⚠ Coverage Regressions ({regressed.length})
          </p>
          {regressed.map((item, i) => (
            <div key={i} className="text-xs text-gray-400">
              <span className="font-mono text-[10px] text-gray-600">{item.id}</span>{' '}
              {item.topic} — was COVERED, now {item.status}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Double-flagged delta ──────────────────────────────────────────────────────

function DoubleFlaggedDelta({ prevOutput, currOutput }) {
  const prev = prevOutput?.double_flagged_issues?.length || 0
  const curr = currOutput?.double_flagged_issues?.length || 0
  const delta = curr - prev
  if (prev === 0 && curr === 0) return null
  return (
    <div className={clsx(
      'flex items-center gap-3 rounded-xl px-4 py-3 border text-sm',
      delta < 0 ? 'bg-green-950/20 border-green-900/40' :
      delta > 0 ? 'bg-red-950/20 border-red-900/40' :
                  'bg-gray-900 border-gray-800',
    )}>
      <span className="text-gray-500 font-mono text-xs">Double-flagged issues</span>
      <span className="text-gray-500 font-mono line-through text-xs">{prev}</span>
      <ArrowRight size={11} className="text-gray-600" />
      <span className={clsx('font-mono font-bold', delta < 0 ? 'text-green-400' : delta > 0 ? 'text-red-400' : 'text-gray-400')}>
        {curr}
      </span>
      {delta < 0 && <span className="text-[10px] text-green-500">{Math.abs(delta)} resolved</span>}
      {delta > 0 && <span className="text-[10px] text-red-500">{delta} new</span>}
    </div>
  )
}

// ── Overall progress summary ──────────────────────────────────────────────────

function ProgressSummary({ prevOutput, currOutput, prevVersion, currVersion }) {
  const prevScore = prevOutput?.overall_score
  const currScore = currOutput?.overall_score
  const delta     = currScore - prevScore
  const pct       = Math.abs(delta / prevScore) * 100

  const color = delta > 0 ? 'from-green-950/60 to-gray-900 border-green-800/60'
              : delta < 0 ? 'from-red-950/60 to-gray-900 border-red-800/60'
              : 'from-gray-900 to-gray-900 border-gray-800'
  const accent = delta > 0 ? 'bg-green-500' : delta < 0 ? 'bg-red-500' : 'bg-gray-600'
  const headline = delta > 0
    ? `V${currVersion} scores ${pct.toFixed(0)}% higher than V${prevVersion}`
    : delta < 0
    ? `V${currVersion} scores ${pct.toFixed(0)}% lower than V${prevVersion}`
    : `Score unchanged from V${prevVersion}`

  return (
    <div className={clsx('rounded-2xl border bg-gradient-to-br overflow-hidden', color)}
      style={{ animation: 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
      <div className={clsx('h-1', accent)} />
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex-shrink-0">
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="30" fill="none" stroke="#1f2937" strokeWidth="7" />
              <circle cx="40" cy="40" r="30" fill="none"
                stroke={delta > 0 ? '#34d399' : delta < 0 ? '#f87171' : '#6b7280'}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - (currScore / 10))}`}
                style={{ filter: `drop-shadow(0 0 6px ${delta > 0 ? '#34d39955' : '#f8717155'})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white leading-none">{currScore?.toFixed(1)}</span>
              <span className="text-[9px] text-gray-500">/10</span>
            </div>
          </div>
        </div>
        <div>
          <p className="text-base font-bold text-white leading-snug">{headline}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-gray-400">
              V{prevVersion}: <span className="font-mono text-gray-300">{prevScore?.toFixed(1)}</span>
            </span>
            <ArrowRight size={13} className="text-gray-600" />
            <span className="text-sm text-gray-400">
              V{currVersion}: <span className="font-mono font-bold" style={{ color: delta > 0 ? '#34d399' : delta < 0 ? '#f87171' : '#9ca3af' }}>
                {currScore?.toFixed(1)}
              </span>
            </span>
            <Delta value={delta} size="md" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ComparisonView({ currentSession, prevSession }) {
  if (!currentSession?.agent4_output || !prevSession?.agent4_output) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">Previous version analysis not available for comparison.</p>
      </div>
    )
  }

  const curr    = currentSession.agent4_output
  const prev    = prevSession.agent4_output
  const currVer = currentSession.version_number || '?'
  const prevVer = prevSession.version_number    || '?'

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">

      {/* Progress summary hero */}
      <ProgressSummary
        prevOutput={prev}
        currOutput={curr}
        prevVersion={prevVer}
        currVersion={currVer}
      />

      {/* Verdict change */}
      <VerdictChange prev={prev.verdict} curr={curr.verdict} />

      {/* Score cards grid */}
      <div>
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
          Score Breakdown — V{prevVer} → V{currVer}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ScoreCard label="Overall Score"    prev={prev.overall_score}  curr={curr.overall_score} />
          <ScoreCard label="Completeness (A1)" prev={prev.agent1_score}   curr={curr.agent1_score} />
          <ScoreCard label="Commercial (A2)"   prev={prev.agent2_score}   curr={curr.agent2_score} />
          <ScoreCard label="Competitive (A3)"  prev={prev.agent3_score}   curr={curr.agent3_score} />
        </div>
      </div>

      {/* Double-flagged delta */}
      <DoubleFlaggedDelta prevOutput={prev} currOutput={curr} />

      {/* Priority actions diff */}
      <ActionsDiff prevOutput={prev} currOutput={curr} />

      {/* Checklist delta */}
      <ChecklistDelta prevOutput={prev} currOutput={curr} />
    </div>
  )
}
