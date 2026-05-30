import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function scoreStatus(s) {
  if (s >= 7) return 'green'
  if (s >= 5) return 'amber'
  return 'red'
}

function scoreLabel(s) {
  if (s >= 8.5) return 'Excellent'
  if (s >= 7)   return 'Strong'
  if (s >= 5.5) return 'Needs Work'
  if (s >= 4)   return 'Weak'
  return 'Critical'
}

function humanVerdict(verdict, mustFixCount) {
  if (verdict === 'READY TO SEND')
    return 'This proposal is strong and ready to submit to the client.'
  if (verdict === 'NEEDS MAJOR REVISION' || verdict === 'DO NOT SEND')
    return 'This proposal requires significant rework before it can be submitted.'
  const n = mustFixCount
  return n > 0
    ? `This proposal needs ${n} critical fix${n > 1 ? 'es' : ''} before it can be submitted.`
    : 'This proposal is nearly ready — a few improvements are recommended.'
}

// ── Animated score ring ────────────────────────────────────────────────────────

function ScoreRing({ score, size = 110, animDelay = 0 }) {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGo(true), animDelay)
    return () => clearTimeout(t)
  }, [])

  const r     = 36
  const circ  = 2 * Math.PI * r
  const pct   = Math.min(100, Math.max(0, (score / 10) * 100))
  const color = scoreStatus(score) === 'green' ? '#34d399' : scoreStatus(score) === 'amber' ? '#fbbf24' : '#f87171'
  const num   = useCountUp(score, 1300, animDelay)

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle
          cx="44" cy="44" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={go ? circ * (1 - pct / 100) : circ}
          style={{
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)',
            filter: `drop-shadow(0 0 8px ${color}55)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-bold text-white leading-none">{num.toFixed(1)}</span>
        <span className="text-[11px] text-gray-500 mt-0.5">/10</span>
      </div>
    </div>
  )
}

// ── Traffic light card ─────────────────────────────────────────────────────────

const TL = {
  green: {
    outer:  'border-green-800/60 bg-gradient-to-b from-green-950/50 to-gray-900',
    circle: 'bg-green-500 shadow-[0_0_28px_rgba(52,211,153,0.5)]',
    label:  'text-green-300',
    badge:  'bg-green-900/60 text-green-300 border-green-700',
    Icon:   CheckCircle2,
  },
  amber: {
    outer:  'border-yellow-800/50 bg-gradient-to-b from-yellow-950/30 to-gray-900',
    circle: 'bg-yellow-500 shadow-[0_0_28px_rgba(251,191,36,0.4)]',
    label:  'text-yellow-300',
    badge:  'bg-yellow-900/60 text-yellow-300 border-yellow-700',
    Icon:   AlertTriangle,
  },
  red: {
    outer:  'border-red-800/50 bg-gradient-to-b from-red-950/30 to-gray-900',
    circle: 'bg-red-500 shadow-[0_0_28px_rgba(248,113,113,0.4)]',
    label:  'text-red-300',
    badge:  'bg-red-900/60 text-red-300 border-red-700',
    Icon:   XCircle,
  },
}

function TrafficLight({ dimensionLabel, score, description, animDelay = 0 }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), animDelay)
    return () => clearTimeout(t)
  }, [])

  const status = scoreStatus(score)
  const cfg    = TL[status]
  const { Icon } = cfg
  const num    = useCountUp(score, 1000, animDelay)

  return (
    <div
      className={clsx('rounded-2xl border p-5 flex flex-col items-center gap-3.5 text-center', cfg.outer)}
      style={{
        opacity:   show ? 1 : 0,
        transform: show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
        transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div className={clsx('w-16 h-16 rounded-full flex items-center justify-center', cfg.circle)}>
        <Icon size={28} className="text-white" />
      </div>

      <div>
        <p className="text-sm font-bold text-white">{dimensionLabel}</p>
        <p className="text-[11px] text-gray-500 mt-1 leading-snug max-w-[140px]">{description}</p>
      </div>

      <div className={clsx('px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5', cfg.badge)}>
        <span className="font-mono">{num.toFixed(1)}/10</span>
        <span className="opacity-50">·</span>
        <span>{scoreLabel(score)}</span>
      </div>
    </div>
  )
}

// ── Verdict hero card ──────────────────────────────────────────────────────────

function VerdictHero({ output }) {
  const { overall_score, verdict, plain_english_summary, priority_actions } = output
  const mustFix    = priority_actions?.must_fix?.length || 0
  const isReady    = verdict === 'READY TO SEND'
  const isFail     = verdict === 'NEEDS MAJOR REVISION' || verdict === 'DO NOT SEND'
  const borderCls  = isReady ? 'border-green-800/60' : isFail ? 'border-red-800/60' : 'border-yellow-800/50'
  const gradFrom   = isReady ? 'from-green-950/60' : isFail ? 'from-red-950/55' : 'from-yellow-950/40'
  const accentCls  = isReady ? 'bg-green-500' : isFail ? 'bg-red-500' : 'bg-yellow-500'
  const tagCls     = isReady ? 'text-green-400' : isFail ? 'text-red-400' : 'text-yellow-400'

  return (
    <div
      className={clsx('rounded-2xl border overflow-hidden bg-gradient-to-br to-gray-900', borderCls, gradFrom)}
      style={{ animation: 'slide-up-fade 0.55s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <div className={clsx('h-1', accentCls)} />
      <div className="p-8">
        <div className="flex items-center gap-7">
          <ScoreRing score={overall_score} size={116} animDelay={250} />
          <div className="flex-1">
            <p className={clsx('text-[11px] font-mono uppercase tracking-[0.15em] mb-2', tagCls)}>
              {verdict}
            </p>
            <h2 className="text-[22px] font-bold text-white leading-snug">
              {humanVerdict(verdict, mustFix)}
            </h2>
            {plain_english_summary && (
              <p className="text-[13px] text-gray-400 mt-3 leading-relaxed">
                {plain_english_summary}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Fixes / Strengths ──────────────────────────────────────────────────────────

function FixItem({ text, index }) {
  return (
    <div
      className="flex items-start gap-3 py-3 border-b border-gray-800/60 last:border-0"
      style={{ animation: `slide-up-fade 0.4s ease ${index * 90}ms both` }}
    >
      <div className="w-6 h-6 rounded-full bg-red-950 border border-red-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-red-400">{index + 1}</span>
      </div>
      <p className="text-[13px] text-gray-200 leading-relaxed">{text}</p>
    </div>
  )
}

function StrengthItem({ text, index }) {
  const icons  = ['✦', '✧', '◈']
  const colors = ['text-green-400', 'text-teal-400', 'text-emerald-400']
  return (
    <div
      className="flex items-start gap-3 py-3 border-b border-gray-800/60 last:border-0"
      style={{ animation: `slide-up-fade 0.4s ease ${index * 90}ms both` }}
    >
      <span className={clsx('text-lg flex-shrink-0 mt-0.5', colors[index % 3])}>{icons[index % 3]}</span>
      <p className="text-[13px] text-gray-200 leading-relaxed">{text}</p>
    </div>
  )
}

// ── Readiness gauge ────────────────────────────────────────────────────────────

function ReadinessGauge({ score }) {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGo(true), 600)
    return () => clearTimeout(t)
  }, [])

  const pct        = (score / 10) * 100
  const gradColor  = score >= 7 ? 'from-green-600 to-green-400' : score >= 5 ? 'from-yellow-600 to-yellow-400' : 'from-red-700 to-red-500'
  const labelColor = score >= 7 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'
  const readiness  = score >= 7.5 ? 'Ready — minor polish only'
    : score >= 6   ? 'Almost there — fix key issues first'
    : score >= 4.5 ? 'Needs moderate revisions before submission'
    : 'Requires significant rework'

  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
      style={{ animation: 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) 0.35s both' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Proposal Readiness</p>
        <span className={clsx('text-sm font-semibold', labelColor)}>{readiness}</span>
      </div>

      <div className="relative h-5 bg-gray-800 rounded-full overflow-hidden mb-2">
        {/* Zone tick marks */}
        <div className="absolute inset-0 flex pointer-events-none">
          <div className="w-[50%] border-r border-gray-700/40" />
          <div className="w-[20%] border-r border-gray-700/40" />
        </div>
        <div
          className={clsx('h-full rounded-full bg-gradient-to-r', gradColor)}
          style={{
            width: go ? `${pct}%` : '0%',
            transition: 'width 1.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
        <span>0</span>
        <span>Do Not Send (5.0)</span>
        <span>Ready to Go (7.0)</span>
        <span>10 — Perfect</span>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ExecutiveView({ output }) {
  if (!output) return <p className="text-gray-500 text-sm py-8 text-center">No data available.</p>

  const { overall_score, agent1_score, agent2_score, agent3_score, top_3_strengths, priority_actions } = output
  const mustFix  = priority_actions?.must_fix || []
  const top3Fix  = mustFix.slice(0, 3)
  const top3Str  = (top_3_strengths || []).slice(0, 3)

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">

      {/* Verdict hero */}
      <VerdictHero output={output} />

      {/* Traffic lights */}
      <div
        className="grid grid-cols-3 gap-4"
        style={{ animation: 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) 0.08s both' }}
      >
        <TrafficLight
          dimensionLabel="Clarity & Completeness"
          score={agent1_score}
          description="Is the proposal well-written, complete, and easy for the reader to follow?"
          animDelay={120}
        />
        <TrafficLight
          dimensionLabel="Commercial Strength"
          score={agent2_score}
          description="Are the pricing, estimates, and payment terms sound and fully laid out?"
          animDelay={240}
        />
        <TrafficLight
          dimensionLabel="Competitive Position"
          score={agent3_score}
          description="Does the proposal stand out and speak directly to what the client needs?"
          animDelay={360}
        />
      </div>

      {/* Fixes + Strengths split */}
      <div
        className="grid grid-cols-2 gap-4"
        style={{ animation: 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) 0.18s both' }}
      >
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-6 h-6 rounded-full bg-red-950 border border-red-800 flex items-center justify-center flex-shrink-0">
              <span className="text-red-400 text-[10px] font-bold">!</span>
            </div>
            <h3 className="text-sm font-semibold text-white">
              {top3Fix.length > 0
                ? `${top3Fix.length} Critical Fix${top3Fix.length > 1 ? 'es' : ''} Needed`
                : 'No Critical Issues'}
            </h3>
          </div>
          {top3Fix.length === 0
            ? <p className="text-sm text-green-400">✓ No critical fixes required.</p>
            : top3Fix.map((item, i) => <FixItem key={i} text={item.action} index={i} />)
          }
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-6 h-6 rounded-full bg-green-950 border border-green-800 flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-sm">✦</span>
            </div>
            <h3 className="text-sm font-semibold text-white">
              {top3Str.length > 0 ? 'Top Strengths' : 'Strengths'}
            </h3>
          </div>
          {top3Str.length === 0
            ? <p className="text-sm text-gray-500">No strengths listed.</p>
            : top3Str.map((s, i) => <StrengthItem key={i} text={s} index={i} />)
          }
        </div>
      </div>

      {/* Readiness gauge */}
      <ReadinessGauge score={overall_score} />
    </div>
  )
}
