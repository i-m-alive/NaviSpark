import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import ScoreRadar from '../agent4/ScoreRadar'

// ── Count-up hook ──────────────────────────────────────────────────────────────

function useCountUp(target, duration = 1000, delay = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      let start = null
      const step = (ts) => {
        if (!start) start = ts
        const p = Math.min((ts - start) / duration, 1)
        const e = 1 - Math.pow(1 - p, 3)
        setValue(+(target * e).toFixed(1))
        if (p < 1) requestAnimationFrame(step)
        else setValue(target)
      }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(t)
  }, [target])
  return value
}

function scoreHex(score) {
  if (score >= 7) return '#34d399'
  if (score >= 5) return '#fbbf24'
  return '#f87171'
}

// ── KPI card ───────────────────────────────────────────────────────────────────

const KPI_THEME = {
  overall: { grad: 'from-indigo-950/70 to-gray-900', border: 'border-indigo-800/50', accent: 'bg-indigo-500', num: 'text-indigo-200', bar: 'bg-indigo-500' },
  a1:      { grad: 'from-indigo-950/40 to-gray-900', border: 'border-indigo-800/30', accent: 'bg-indigo-400', num: 'text-indigo-300', bar: 'bg-indigo-400' },
  a2:      { grad: 'from-purple-950/40 to-gray-900', border: 'border-purple-800/30', accent: 'bg-purple-400', num: 'text-purple-300', bar: 'bg-purple-400' },
  a3:      { grad: 'from-teal-950/40 to-gray-900',   border: 'border-teal-800/30',   accent: 'bg-teal-400',   num: 'text-teal-300',   bar: 'bg-teal-400'   },
}

function KPICard({ label, score, theme, sublabel, delay = 0 }) {
  const t   = KPI_THEME[theme]
  const num = useCountUp(score, 1000, delay)
  const pct = (score / 10) * 100

  return (
    <div
      className={clsx('rounded-xl border bg-gradient-to-b relative overflow-hidden', t.grad, t.border)}
      style={{ animation: `stat-enter 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}
    >
      <div className={clsx('absolute top-0 inset-x-0 h-[3px]', t.accent)} />
      <div className="p-4 pt-5">
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-end gap-1 mb-0.5">
          <span className={clsx('text-[40px] font-bold leading-none', t.num)}>{num.toFixed(1)}</span>
          <span className="text-sm text-gray-600 mb-1.5">/10</span>
        </div>
        {sublabel && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{sublabel}</p>}
        <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full', t.bar)}
            style={{ width: `${pct}%`, transition: `width 1.1s cubic-bezier(0.4,0,0.2,1) ${delay}ms` }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Checklist breakdown stacked bars ──────────────────────────────────────────

function ChecklistBreakdown({ checklistCoverage }) {
  const [go, setGo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setGo(true), 300); return () => clearTimeout(t) }, [])

  if (!checklistCoverage?.length) return null

  const sheets = ['Proposal', 'Estimation', 'Pricing']
  const bySheet = {}
  sheets.forEach(s => { bySheet[s] = { covered: 0, partial: 0, missing: 0, total: 0 } })
  checklistCoverage.forEach(item => {
    const sh = item.sheet
    if (bySheet[sh]) {
      bySheet[sh].total++
      if (item.status === 'COVERED') bySheet[sh].covered++
      else if (item.status === 'PARTIAL') bySheet[sh].partial++
      else bySheet[sh].missing++
    }
  })

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex-1">
      <h3 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-4">
        Checklist Coverage by Sheet
      </h3>
      <div className="space-y-4">
        {sheets.map(sheet => {
          const d = bySheet[sheet]
          if (!d.total) return null
          const cov = go ? (d.covered / d.total) * 100 : 0
          const par = go ? (d.partial / d.total) * 100 : 0
          const mis = go ? (d.missing / d.total) * 100 : 0
          return (
            <div key={sheet}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-white font-medium">{sheet}</span>
                <span className="text-xs text-gray-500 font-mono">{d.covered}/{d.total} covered</span>
              </div>
              <div className="h-7 bg-gray-800 rounded-lg overflow-hidden flex text-[11px] font-semibold">
                <div
                  className="h-full bg-green-600 flex items-center justify-center text-white transition-all duration-1000 ease-out"
                  style={{ width: `${cov}%` }}
                >
                  {cov > 20 && `${Math.round(cov)}%`}
                </div>
                <div
                  className="h-full bg-yellow-600 transition-all duration-1000 ease-out"
                  style={{ width: `${par}%`, transitionDelay: '150ms' }}
                />
                <div
                  className="h-full bg-red-700 transition-all duration-1000 ease-out"
                  style={{ width: `${mis}%`, transitionDelay: '300ms' }}
                />
              </div>
              <div className="flex gap-3 mt-1.5">
                <span className="text-[10px] text-green-500">✓ {d.covered}</span>
                {d.partial > 0 && <span className="text-[10px] text-yellow-500">~ {d.partial}</span>}
                {d.missing > 0 && <span className="text-[10px] text-red-500">✕ {d.missing}</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-5 mt-5 pt-4 border-t border-gray-800">
        {[['bg-green-600','Covered'],['bg-yellow-600','Partial'],['bg-red-700','Missing']].map(([cls,lbl]) => (
          <div key={lbl} className="flex items-center gap-1.5">
            <div className={clsx('w-3 h-3 rounded', cls)} />
            <span className="text-[10px] text-gray-500">{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Agent contribution bars ────────────────────────────────────────────────────

function AgentBars({ a1, a2, a3 }) {
  const bars = [
    { label: 'Completeness & Clarity',   score: a1, cls: 'bg-indigo-500', agent: 'A1' },
    { label: 'Estimation & Commercial',  score: a2, cls: 'bg-purple-500', agent: 'A2' },
    { label: 'Competitive Strength',     score: a3, cls: 'bg-teal-500',   agent: 'A3' },
  ]
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-4">
        Score by Dimension
      </h3>
      <div className="space-y-3.5">
        {bars.map((bar, i) => (
          <div key={bar.agent}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-300">{bar.label}</span>
              <span className="text-xs font-mono font-bold" style={{ color: scoreHex(bar.score) }}>
                {bar.score?.toFixed(1)}
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all duration-1000', bar.cls)}
                style={{ width: `${(bar.score / 10) * 100}%`, transitionDelay: `${i * 120}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Priority Kanban ────────────────────────────────────────────────────────────

const KANBAN = [
  { key: 'must_fix',   label: 'Must Fix',   head: 'bg-red-950/60 text-red-300 border-b-red-800',    dot: 'bg-red-500',    border: 'border-red-900/50' },
  { key: 'should_fix', label: 'Should Fix', head: 'bg-yellow-950/60 text-yellow-300 border-b-yellow-800', dot: 'bg-yellow-500', border: 'border-yellow-900/40' },
  { key: 'next_time',  label: 'Next Time',  head: 'bg-blue-950/60 text-blue-300 border-b-blue-800',  dot: 'bg-blue-500',   border: 'border-blue-900/40' },
]

function PriorityKanban({ priorityActions }) {
  if (!priorityActions) return null
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-4">
        Priority Action Plan
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {KANBAN.map(col => {
          const items = priorityActions[col.key] || []
          return (
            <div key={col.key} className={clsx('rounded-xl border overflow-hidden', col.border)}>
              <div className={clsx('px-3 py-2.5 border-b flex items-center justify-between text-xs font-semibold', col.head)}>
                <span>{col.label}</span>
                <span className="font-mono opacity-60">{items.length}</span>
              </div>
              <div className="p-2 space-y-1.5 max-h-56 overflow-y-auto">
                {items.length === 0
                  ? <p className="text-[11px] text-gray-600 italic px-1.5 py-2">None</p>
                  : items.map((item, i) => (
                    <div key={i} className="bg-gray-800/70 rounded-lg p-2.5 flex items-start gap-2">
                      <div className={clsx('w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0', col.dot)} />
                      <p className="text-xs text-gray-300 leading-snug">{item.action}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Double-flagged compact ─────────────────────────────────────────────────────

function DoubleFlaggedCompact({ issues }) {
  return (
    <div className="bg-gray-900 border border-red-900/40 rounded-xl p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-red-950 border border-red-800 flex items-center justify-center flex-shrink-0">
          <span className="text-red-400 text-[10px] font-bold">!</span>
        </div>
        <h3 className="text-[11px] font-medium text-red-300 uppercase tracking-wider">
          Double-Flagged ({issues?.length || 0})
        </h3>
      </div>
      {!issues?.length
        ? <p className="text-xs text-green-400">✓ No issues flagged by multiple agents</p>
        : <div className="space-y-2 max-h-48 overflow-y-auto">
            {issues.map((issue, i) => (
              <div key={i} className="bg-red-950/30 border border-red-900/40 rounded-lg p-2.5">
                <p className="text-xs text-gray-300 leading-snug">{issue.issue_summary}</p>
                {issue.agents?.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {issue.agents.map(a => (
                      <span key={a} className="text-[9px] font-mono bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded border border-gray-700">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ── Cross-consistency compact ──────────────────────────────────────────────────

function ConsistencyCompact({ issues }) {
  const dot = { CRITICAL: 'bg-red-500', MAJOR: 'bg-yellow-500', MINOR: 'bg-blue-500' }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
      <h3 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">
        Consistency Checks ({issues?.length || 0} issues)
      </h3>
      {!issues?.length
        ? <p className="text-xs text-green-400">✓ All consistency checks passed</p>
        : <div className="space-y-2 max-h-48 overflow-y-auto">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={clsx('w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0', dot[issue.severity] || 'bg-gray-600')} />
                <div>
                  <p className="text-xs text-gray-300 leading-snug">{issue.finding}</p>
                  <span className="text-[9px] font-mono text-gray-600">{issue.severity}</span>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function DashboardView({ output }) {
  if (!output) return <p className="text-gray-500 text-sm py-8 text-center">No data available.</p>

  const {
    overall_score, verdict, agent1_score, agent2_score, agent3_score,
    weight_label, weight_adjusted, weight_reason,
    priority_actions, double_flagged_issues, cross_consistency_issues,
    checklist_coverage, section_scorecard,
  } = output

  return (
    <div className="space-y-4 pb-8">

      {/* ── Row 1: KPI strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <KPICard label="Overall Score"  score={overall_score} theme="overall" sublabel={verdict}                      delay={0}   />
        <KPICard label="Completeness"   score={agent1_score}  theme="a1"      sublabel="Clarity & Writing"             delay={60}  />
        <KPICard label="Commercial"     score={agent2_score}  theme="a2"      sublabel="Estimation & Pricing"          delay={120} />
        <KPICard label="Competitive"    score={agent3_score}  theme="a3"      sublabel="Differentiation & Client Fit"  delay={180} />
      </div>

      {/* Weight adjustment banner */}
      {weight_adjusted && (
        <div className="flex items-center gap-2.5 bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-2.5 text-xs animate-slide-down">
          <span className="text-amber-400 text-sm">⚡</span>
          <span className="text-amber-300 font-semibold">{weight_label} weighting applied.</span>
          <span className="text-amber-400/70">{weight_reason}</span>
        </div>
      )}

      {/* ── Row 2: Radar + Checklist + Dimension bars ─────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <ScoreRadar sectionScorecard={section_scorecard} />
        <div className="flex flex-col gap-4">
          <ChecklistBreakdown checklistCoverage={checklist_coverage} />
          <AgentBars a1={agent1_score} a2={agent2_score} a3={agent3_score} />
        </div>
      </div>

      {/* ── Row 3: Priority Kanban ──────────────────────────────────── */}
      <PriorityKanban priorityActions={priority_actions} />

      {/* ── Row 4: Double-flagged + Consistency ────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <DoubleFlaggedCompact issues={double_flagged_issues} />
        <ConsistencyCompact   issues={cross_consistency_issues} />
      </div>
    </div>
  )
}
