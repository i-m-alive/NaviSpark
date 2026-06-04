import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, Shield } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function useCountUp(target, duration = 1200, delay = 0) {
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

function scoreColor(s) {
  if (s >= 7) return '#34d399'
  if (s >= 5) return '#fbbf24'
  return '#f87171'
}

function ScoreRing({ score, size = 110 }) {
  const [go, setGo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setGo(true), 200); return () => clearTimeout(t) }, [])
  const r = 36
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, (score / 10) * 100))
  const color = scoreColor(score)
  const num = useCountUp(score, 1300, 200)
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={go ? circ * (1 - pct / 100) : circ}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-bold text-white leading-none">{num.toFixed(1)}</span>
        <span className="text-[11px] text-gray-500 mt-0.5">/10</span>
      </div>
    </div>
  )
}

const VERDICT_CONFIG = {
  'READY TO SEND': {
    bg: 'bg-green-950/60',
    border: 'border-green-800',
    Icon: CheckCircle2,
    iconColor: 'text-green-400',
    textColor: 'text-green-300',
    badge: 'bg-green-900 text-green-200 border-green-700',
  },
  'NEEDS MAJOR REVISION': {
    bg: 'bg-red-950/60',
    border: 'border-red-800',
    Icon: AlertTriangle,
    iconColor: 'text-red-400',
    textColor: 'text-red-300',
    badge: 'bg-red-900 text-red-200 border-red-700',
  },
  'DO NOT SEND': {
    bg: 'bg-red-950/80',
    border: 'border-red-700',
    Icon: XCircle,
    iconColor: 'text-red-300',
    textColor: 'text-red-200',
    badge: 'bg-red-900 text-red-200 border-red-700',
  },
}

function getConfig(verdict) {
  return VERDICT_CONFIG[verdict] || VERDICT_CONFIG['NEEDS MAJOR REVISION']
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CustomVerdictPanel({ nc4Output }) {
  if (!nc4Output) return null

  const {
    overall_score = 0,
    verdict = 'NEEDS MAJOR REVISION',
    plain_english_summary,
    top_3_strengths = [],
    priority_actions = {},
    checklist_coverage = {},
    verdict_meta = {},
    nc2_scoring_type,
    nc2_weights_source,
  } = nc4Output

  const cfg = getConfig(verdict)
  const { Icon } = cfg

  const { must_fix = [], should_fix = [], next_time = [] } = priority_actions
  const {
    total_items = 0,
    passed = 0,
    partial = 0,
    failed = 0,
    pass_rate = 0,
  } = checklist_coverage

  return (
    <div className="space-y-4">

      {/* ── Verdict banner ───────────────────────────────────────────────── */}
      <div className={clsx(
        'border rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6',
        cfg.bg, cfg.border
      )}>
        {/* Score ring */}
        <ScoreRing score={overall_score} />

        {/* Verdict info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Icon size={18} className={cfg.iconColor} />
            <span className={clsx('text-xl font-bold tracking-wide', cfg.textColor)}>
              {verdict}
            </span>
          </div>
          {plain_english_summary && (
            <p className="text-sm text-gray-300 leading-relaxed">{plain_english_summary}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {nc2_scoring_type && (
              <span className={clsx('px-2 py-0.5 text-xs rounded border', cfg.badge)}>
                {nc2_scoring_type}
              </span>
            )}
            {nc2_weights_source && (
              <span className={clsx('px-2 py-0.5 text-xs rounded border', cfg.badge)}>
                Weights: {nc2_weights_source}
              </span>
            )}
            {verdict_meta?.triggering_rule && (
              <span className={clsx('px-2 py-0.5 text-xs rounded border', cfg.badge)}>
                Rule: {verdict_meta.triggering_rule}
              </span>
            )}
          </div>
        </div>

        {/* Coverage ring */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="text-2xl font-bold" style={{ color: scoreColor(pass_rate * 10) }}>
            {Math.round(pass_rate * 100)}%
          </div>
          <div className="text-[11px] text-gray-500 text-center">pass rate<br />({passed}/{total_items})</div>
        </div>
      </div>

      {/* ── Checklist coverage stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Passed', value: passed, color: 'text-green-400' },
          { label: 'Partial', value: partial, color: 'text-yellow-400' },
          { label: 'Failed', value: failed, color: 'text-red-400' },
          { label: 'Total', value: total_items, color: 'text-white' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className={clsx('text-2xl font-bold', color)}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Top 3 strengths ──────────────────────────────────────────────── */}
      {top_3_strengths.length > 0 && (
        <div className="bg-gray-900 border border-green-900/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-green-400" />
            <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider">Top Strengths</h4>
          </div>
          <div className="space-y-2">
            {top_3_strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-mono text-green-600 mt-0.5 flex-shrink-0">0{i + 1}</span>
                <p className="text-sm text-gray-200">{typeof s === 'string' ? s : s.description || s.text || JSON.stringify(s)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Priority actions ─────────────────────────────────────────────── */}
      {(must_fix.length > 0 || should_fix.length > 0 || next_time.length > 0) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-orange-400" />
            <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Priority Actions</h4>
          </div>
          {[
            { label: 'Must Fix', items: must_fix, color: 'text-red-300', dot: 'bg-red-500', border: 'border-red-900/40' },
            { label: 'Should Fix', items: should_fix, color: 'text-yellow-300', dot: 'bg-yellow-500', border: 'border-yellow-900/40' },
            { label: 'Next Time', items: next_time, color: 'text-blue-300', dot: 'bg-blue-500', border: 'border-blue-900/40' },
          ].map(({ label, items, color, dot, border }) => items.length > 0 && (
            <div key={label} className={clsx('border rounded-lg p-3.5 space-y-2', border, 'bg-gray-950')}>
              <p className={clsx('text-xs font-semibold uppercase tracking-wider', color)}>{label}</p>
              <ul className="space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5', dot)} />
                    <span className="text-sm text-gray-300">
                      {typeof item === 'string' ? item : item.action || item.description || item.gap || JSON.stringify(item)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
