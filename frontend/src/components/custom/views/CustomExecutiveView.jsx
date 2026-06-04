import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp } from 'lucide-react'

function useCountUp(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      let start = null
      const step = (ts) => {
        if (!start) start = ts
        const p = Math.min((ts - start) / duration, 1)
        setValue(+(target * (1 - Math.pow(1 - p, 3))).toFixed(1))
        if (p < 1) requestAnimationFrame(step)
        else setValue(target)
      }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(t)
  }, [target])
  return value
}

function scoreColor(s) {
  if (s >= 7) return '#34d399'
  if (s >= 5) return '#fbbf24'
  return '#f87171'
}

function ScoreRing({ score, size = 120 }) {
  const [go, setGo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setGo(true), 300); return () => clearTimeout(t) }, [])
  const r = 42
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, (score / 10) * 100)
  const color = scoreColor(score)
  const num = useCountUp(score, 1400, 300)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1f2937" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={go ? circ * (1 - pct / 100) : circ}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 10px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[32px] font-bold text-white leading-none">{num.toFixed(1)}</span>
        <span className="text-xs text-gray-500 mt-1">/10</span>
      </div>
    </div>
  )
}

const VERDICT_CFG = {
  'READY TO SEND':        { Icon: CheckCircle2, color: 'text-green-300', bg: 'bg-green-950/50 border-green-800' },
  'NEEDS MAJOR REVISION': { Icon: AlertTriangle, color: 'text-yellow-300', bg: 'bg-yellow-950/50 border-yellow-800' },
  'DO NOT SEND':          { Icon: XCircle,       color: 'text-red-300',   bg: 'bg-red-950/50 border-red-800' },
}

export default function CustomExecutiveView({ output, session }) {
  if (!output) return null

  const {
    overall_score = 0,
    verdict = '',
    plain_english_summary,
    top_3_strengths = [],
    checklist_coverage = {},
    category_scores = {},
    verdict_meta = {},
    nc2_scoring_type,
  } = output

  const cfg = VERDICT_CFG[verdict] || VERDICT_CFG['NEEDS MAJOR REVISION']
  const { passed = 0, partial: _partial = 0, failed = 0 } = checklist_coverage
  const total_items = passed + _partial + failed || 1   // evaluated items only
  const pass_rate   = passed / total_items
  const nc1 = session?.agent1_output
  const nc2 = session?.agent2_output
  const clientName = nc1?.auto_detected?.client_name
  const projectName = nc1?.auto_detected?.project_name

  const catEntries = Object.entries(category_scores).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-5" style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>

      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className={clsx('border rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6', cfg.bg)}>
        <ScoreRing score={overall_score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <cfg.Icon size={20} className={cfg.color} />
            <h2 className={clsx('text-2xl font-bold', cfg.color)}>{verdict}</h2>
          </div>
          {plain_english_summary && (
            <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">{plain_english_summary}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">
            {clientName && <span>Client: <span className="text-gray-300">{clientName}</span></span>}
            {projectName && <span>· Project: <span className="text-gray-300">{projectName}</span></span>}
            {nc2_scoring_type && <span>· Scoring: <span className="text-gray-300">{nc2_scoring_type}</span></span>}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="text-3xl font-bold" style={{ color: scoreColor(pass_rate * 10) }}>
            {Math.round(pass_rate * 100)}%
          </div>
          <div className="text-xs text-gray-500 text-center">pass rate<br />{passed}/{total_items} items</div>
        </div>
      </div>

      {/* ── Coverage + category strip ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overall Score', value: `${overall_score.toFixed(1)}/10`, color: scoreColor(overall_score) },
          { label: 'Pass Rate',     value: `${Math.round(pass_rate * 100)}%`, color: scoreColor(pass_rate * 10) },
          { label: 'Items Passed',  value: passed, color: '#34d399' },
          { label: 'Categories',    value: catEntries.length, color: '#60a5fa' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Strengths ───────────────────────────────────────────────────── */}
      {top_3_strengths.length > 0 && (
        <div className="bg-gray-900 border border-green-900/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-green-400" />
            <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider">Top Strengths</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {top_3_strengths.slice(0, 3).map((s, i) => (
              <div key={i} className="bg-green-950/20 border border-green-900/30 rounded-lg p-3">
                <div className="text-[10px] font-mono text-green-600 mb-1">0{i + 1}</div>
                <p className="text-sm text-gray-200">
                  {typeof s === 'string' ? s : s.description || s.text || s.category || JSON.stringify(s)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Category scorecard ───────────────────────────────────────────── */}
      {catEntries.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Category Scores</h3>
          {catEntries.map(([name, score]) => {
            const pct = (score / 10) * 100
            const color = scoreColor(score)
            return (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 truncate">{name}</span>
                  <span className="font-mono flex-shrink-0 ml-2" style={{ color }}>{score.toFixed(1)}/10</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: color, transition: 'width 1s ease' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Verdict rationale ────────────────────────────────────────────── */}
      {verdict_meta?.triggering_rule && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Verdict Rationale</p>
          <p className="text-sm text-gray-300">
            <span className="font-medium text-white">Rule triggered: </span>
            {verdict_meta.triggering_rule}
            {verdict_meta.must_fix_count > 0 && (
              <span className="text-red-400"> — {verdict_meta.must_fix_count} must-fix item{verdict_meta.must_fix_count !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
