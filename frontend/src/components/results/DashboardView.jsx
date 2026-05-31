import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import ScoreRadar from '../agent4/ScoreRadar'

// ── Utilities ──────────────────────────────────────────────────────────────────

function useCountUp(target, duration = 1000, delay = 0) {
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

function scoreHex(score) {
  if (score == null) return '#6b7280'
  if (score >= 7) return '#34d399'
  if (score >= 5) return '#fbbf24'
  return '#f87171'
}

// ── Info Tooltip ───────────────────────────────────────────────────────────────

function InfoTooltip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="flex-shrink-0 w-4 h-4 rounded-full border border-gray-700 bg-gray-800 hover:border-blue-600/60 hover:bg-blue-950/40 flex items-center justify-center text-gray-500 hover:text-blue-400 transition-colors"
        style={{ fontSize: '9px', fontWeight: 700 }}
        aria-label="Chart information"
      >
        ⓘ
      </button>
      {show && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-[11px] text-gray-300 leading-relaxed z-50 shadow-2xl pointer-events-none"
          style={{ animation: 'slide-up-fade 0.15s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #374151' }} />
        </div>
      )}
    </div>
  )
}

function ChartHeader({ title, info, children }) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <h3 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
      {info && <InfoTooltip text={info} />}
      {children}
    </div>
  )
}

// ── KPI card ───────────────────────────────────────────────────────────────────

const KPI_THEME = {
  overall: { grad: 'from-indigo-950/70 to-gray-900', border: 'border-indigo-800/50', accent: 'bg-indigo-500', num: 'text-indigo-200', bar: 'bg-indigo-500' },
  a1:      { grad: 'from-indigo-950/40 to-gray-900', border: 'border-indigo-800/30', accent: 'bg-indigo-400', num: 'text-indigo-300', bar: 'bg-indigo-400' },
  a2:      { grad: 'from-purple-950/40 to-gray-900', border: 'border-purple-800/30', accent: 'bg-purple-400', num: 'text-purple-300', bar: 'bg-purple-400' },
  a3:      { grad: 'from-teal-950/40 to-gray-900',   border: 'border-teal-800/30',   accent: 'bg-teal-400',   num: 'text-teal-300',   bar: 'bg-teal-400'   },
}

function KPICard({ label, score, theme, sublabel, delay = 0, info }) {
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
        <div className="flex items-center gap-1 mb-2">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{label}</p>
          {info && <InfoTooltip text={info} />}
        </div>
        <div className="flex items-end gap-1 mb-0.5">
          <span className={clsx('text-[40px] font-bold leading-none', t.num)}>{num.toFixed(1)}</span>
          <span className="text-sm text-gray-600 mb-1.5">/10</span>
        </div>
        {sublabel && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{sublabel}</p>}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--t-bg4, #1f2937)' }}>
          <div
            className={clsx('h-full rounded-full', t.bar)}
            style={{ width: `${pct}%`, transition: `width 1.1s cubic-bezier(0.4,0,0.2,1) ${delay}ms` }}
          />
        </div>
      </div>
    </div>
  )
}

// ── 1. Gauge Chart ─────────────────────────────────────────────────────────────

function GaugeChart({ score }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 250)
    return () => clearTimeout(t)
  }, [score])

  const W = 200, H = 118, cx = 100, cy = 105, R = 76, sw = 14
  const s   = Math.min(10, Math.max(0, score || 0))
  const hex = scoreHex(s)

  // Half-circle path: M (cx-R,cy) A R R 0 0 0 (cx+R,cy) — sweep=0 goes via top
  const arcL   = Math.PI * R
  const fillL  = animated ? (s / 10) * arcL : 0
  const dashOff = arcL - fillL

  // Zone arc helpers — map score to angle, compute arc path
  const scoreToAngle = sc => Math.PI * (1 - sc / 10)
  const ptX = a => cx + R * Math.cos(a)
  const ptY = a => cy - R * Math.sin(a)
  const zoneArc = (s1, s2) => {
    const a1 = scoreToAngle(s1), a2 = scoreToAngle(s2)
    return `M ${ptX(a1).toFixed(2)} ${ptY(a1).toFixed(2)} A ${R} ${R} 0 0 1 ${ptX(a2).toFixed(2)} ${ptY(a2).toFixed(2)}`
  }

  // Needle
  const na  = scoreToAngle(s)
  const nLen = R - sw - 6
  const nx  = (cx + nLen * Math.cos(na)).toFixed(2)
  const ny  = (cy - nLen * Math.sin(na)).toFixed(2)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <ChartHeader
        title="Readiness Gauge"
        info="A semicircle gauge showing the overall proposal score from 0–10. The needle points to the current score. Red zone (0–5) = major revision needed, Amber (5–7) = revise before sending, Green (7–10) = ready to send."
      />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto', overflow: 'visible' }}
      >
        {/* Background track */}
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none" stroke="var(--t-bg4, #1f2937)" strokeWidth={sw} strokeLinecap="round" />
        {/* Zone colors */}
        <path d={zoneArc(0, 5)}  fill="none" stroke="#f87171" strokeWidth={sw} strokeOpacity="0.25" />
        <path d={zoneArc(5, 7)}  fill="none" stroke="#fbbf24" strokeWidth={sw} strokeOpacity="0.25" />
        <path d={zoneArc(7, 10)} fill="none" stroke="#34d399" strokeWidth={sw} strokeOpacity="0.25" />
        {/* Animated score fill */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none" stroke={hex} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${arcL} ${arcL}`}
          strokeDashoffset={dashOff}
          style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.4,0,0.2,1) 0.1s', filter: `drop-shadow(0 0 6px ${hex}66)` }}
        />
        {/* Tick marks */}
        {[5, 7].map(tick => {
          const a  = scoreToAngle(tick)
          const ox = Math.cos(a), oy = -Math.sin(a)
          return (
            <line key={tick}
              x1={(cx + (R - sw / 2 + 1) * ox).toFixed(2)} y1={(cy + (R - sw / 2 + 1) * oy).toFixed(2)}
              x2={(cx + (R + sw / 2 + 3) * ox).toFixed(2)} y2={(cy + (R + sw / 2 + 3) * oy).toFixed(2)}
              stroke="var(--t-text5, #4b5563)" strokeWidth="1.5"
            />
          )
        })}
        {/* Tick labels */}
        {[{v:0,lbl:'0'},{v:5,lbl:'5'},{v:7,lbl:'7'},{v:10,lbl:'10'}].map(({v,lbl}) => {
          const a = scoreToAngle(v)
          const lr = R + sw + 10
          return (
            <text key={v} x={(cx + lr * Math.cos(a)).toFixed(2)} y={(cy - lr * Math.sin(a) + 3).toFixed(2)}
              textAnchor="middle" fill="var(--t-text4, #4b5563)" fontSize="9" fontFamily="monospace">{lbl}</text>
          )
        })}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={hex} strokeWidth="2.5" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${hex})` }} />
        <circle cx={cx} cy={cy} r="7" fill={hex} style={{ filter: `drop-shadow(0 0 6px ${hex}88)` }} />
        <circle cx={cx} cy={cy} r="3.5" fill="var(--t-bg1, #0a0f1a)" />
        {/* Score label */}
        <text x={cx} y={cy - R * 0.42} textAnchor="middle" fill={hex}
          fontSize="22" fontFamily="monospace, ui-monospace" fontWeight="700">{s.toFixed(1)}</text>
        <text x={cx} y={cy - R * 0.42 + 15} textAnchor="middle" fill="var(--t-text5, #6b7280)" fontSize="9">/10</text>
        {/* Zone label */}
        <text x={cx} y={cy + 20} textAnchor="middle" fill="var(--t-text5, #6b7280)" fontSize="9">
          {s >= 7 ? 'Ready to Send' : s >= 5 ? 'Revise First' : 'Major Revision'}
        </text>
      </svg>
    </div>
  )
}

// ── 2. Agent Ring Trio ─────────────────────────────────────────────────────────

function SingleRing({ score, label, sub, color, delay = 0 }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay + 100)
    return () => clearTimeout(t)
  }, [])

  const size = 96, r = 34, sw = 8, cx = size / 2, cy = size / 2
  const circ     = 2 * Math.PI * r
  const pct      = Math.min(1, (score || 0) / 10)
  const dashOff  = animated ? circ * (1 - pct) : circ

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--t-bg4, #1f2937)" strokeWidth={sw} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOff}
            style={{
              transition: `stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
              filter: `drop-shadow(0 0 5px ${color}55)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-bold leading-none" style={{ fontSize: 18, color }}>{score?.toFixed(1)}</span>
          <span className="text-gray-400 mt-0.5" style={{ fontSize: 9 }}>/10</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-300 font-medium leading-tight">{label}</p>
        <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

function AgentRingTrio({ a1, a2, a3 }) {
  const rings = [
    { score: a1, label: 'Completeness', sub: 'Agent 1', color: '#818cf8' },
    { score: a2, label: 'Commercial',   sub: 'Agent 2', color: '#c084fc' },
    { score: a3, label: 'Competitive',  sub: 'Agent 3', color: '#34d399' },
  ]
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <ChartHeader
        title="Agent Score Rings"
        info="Three specialist AI agents each evaluate a different dimension. The filled arc shows how much of the 0–10 scale each agent scored. A complete ring = perfect 10."
      />
      <div className="flex justify-around items-center py-2">
        {rings.map((ring, i) => (
          <SingleRing key={ring.sub} {...ring} delay={i * 150} />
        ))}
      </div>
    </div>
  )
}

// ── 3. Checklist Donut ─────────────────────────────────────────────────────────

function ChecklistDonut({ checklistCoverage }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(t)
  }, [])

  if (!checklistCoverage?.length) return null

  const covered = checklistCoverage.filter(c => c.status === 'COVERED').length
  const partial  = checklistCoverage.filter(c => c.status === 'PARTIAL').length
  const missing  = checklistCoverage.filter(c => c.status === 'MISSING').length
  const total    = checklistCoverage.length

  const size = 130, r = 46, sw = 18, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r

  const segments = [
    { count: covered, color: '#16a34a', lightColor: '#34d399', label: 'Covered' },
    { count: partial,  color: '#d97706', lightColor: '#fbbf24', label: 'Partial'  },
    { count: missing,  color: '#dc2626', lightColor: '#f87171', label: 'Missing'  },
  ]

  let cumOffset = 0
  const arcs = segments.map((seg, i) => {
    const segLen  = (seg.count / total) * circ
    const dashOff = animated ? -cumOffset : 0
    const arr     = animated ? `${segLen} ${circ - segLen}` : `0 ${circ}`
    cumOffset += segLen
    return { ...seg, segLen, dashOff, arr, delay: i * 200 }
  })

  const pct = Math.round((covered / total) * 100)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex-1">
      <ChartHeader
        title="Checklist Overview"
        info="Donut chart showing overall checklist completion across all three proposal sheets. The percentage in the center is the proportion of items fully covered."
      />
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
            {/* Background ring */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--t-bg4, #1f2937)" strokeWidth={sw} />
            {/* Segments */}
            {arcs.map(arc => (
              <circle key={arc.label} cx={cx} cy={cy} r={r} fill="none"
                stroke={arc.color} strokeWidth={sw}
                strokeDasharray={arc.arr}
                strokeDashoffset={arc.dashOff}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{
                  transition: `stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1) ${arc.delay}ms`,
                  filter: `drop-shadow(0 0 4px ${arc.color}55)`,
                }}
              />
            ))}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono font-bold text-xl text-green-400">{pct}%</span>
            <span className="text-[9px] text-gray-500">covered</span>
          </div>
        </div>
        {/* Legend + mini bars */}
        <div className="flex-1 space-y-2.5">
          {segments.map(seg => (
            <div key={seg.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                  {seg.label}
                </span>
                <span className="text-xs font-mono font-bold" style={{ color: seg.lightColor }}>
                  {seg.count}/{total}
                </span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: animated ? `${(seg.count / total) * 100}%` : '0%', background: seg.color, transitionDelay: '300ms' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 4. Priority Column Chart ───────────────────────────────────────────────────

function PriorityColumnChart({ priorityActions }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(t)
  }, [])

  const columns = [
    { key: 'must_fix',   label: 'Must Fix',   color: '#f87171', glow: '#f8717133' },
    { key: 'should_fix', label: 'Should Fix', color: '#fbbf24', glow: '#fbbf2433' },
    { key: 'next_time',  label: 'Next Time',  color: '#60a5fa', glow: '#60a5fa33' },
    { key: 'internal',   label: 'Internal',   color: '#9ca3af', glow: '#9ca3af22' },
  ]

  const counts   = columns.map(c => ({ ...c, count: priorityActions?.[c.key]?.length || 0 }))
  const maxCount = Math.max(...counts.map(c => c.count), 1)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <ChartHeader
        title="Action Items Distribution"
        info="Vertical bars showing how many actions fall in each priority tier. Fewer 'Must Fix' items means the proposal is closer to submission-ready. Taller red bar = more work needed."
      />
      <div className="flex items-end gap-2 mt-2" style={{ height: 130 }}>
        {counts.map((col, i) => {
          const pct    = col.count / maxCount
          const height = animated ? Math.max(col.count > 0 ? 8 : 0, pct * 90) : 0
          return (
            <div key={col.key} className="flex-1 flex flex-col items-center gap-1" style={{ height: '100%', justifyContent: 'flex-end' }}>
              {/* Count label */}
              <span
                className="font-mono font-bold text-xs transition-all duration-700"
                style={{ color: col.count > 0 ? col.color : '#374151', opacity: animated ? 1 : 0, transitionDelay: `${i * 80}ms` }}
              >
                {col.count}
              </span>
              {/* Bar */}
              <div
                className="w-full rounded-t-lg transition-all"
                style={{
                  height:          `${height}%`,
                  background:      col.count > 0 ? col.color : '#1f2937',
                  boxShadow:       col.count > 0 ? `0 0 12px ${col.glow}` : 'none',
                  opacity:         0.9,
                  transitionDuration: '1s',
                  transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
                  transitionDelay: `${i * 80}ms`,
                }}
              />
              {/* Label */}
              <span className="text-[9px] text-gray-500 text-center leading-tight mt-1" style={{ minHeight: 24 }}>
                {col.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 5. Score Tile Grid ─────────────────────────────────────────────────────────

function ScoreTileGrid({ sectionScorecard }) {
  if (!sectionScorecard) return null
  const entries = Object.entries(sectionScorecard)

  const tileBg = (s) => {
    if (s >= 7) return 'bg-green-950/50 border-green-800/50 hover:border-green-600/70'
    if (s >= 5) return 'bg-yellow-950/50 border-yellow-800/50 hover:border-yellow-600/70'
    return 'bg-red-950/50 border-red-800/50 hover:border-red-600/70'
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <ChartHeader
        title="Sub-score Heat Map"
        info="Each tile is one evaluation dimension. Color shows health at a glance: green (7+) = strong, amber (5–7) = acceptable, red (below 5) = needs work. Hover a tile to read the exact score."
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {entries.map(([key, val], i) => (
          <div
            key={key}
            className={clsx(
              'rounded-xl border p-3 text-center transition-all duration-200 cursor-default',
              tileBg(val),
            )}
            style={{ animation: `card-enter-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) ${i * 35}ms both` }}
            title={`${key.replace(/_/g, ' ')}: ${val?.toFixed(1)}/10`}
          >
            <div className="font-mono font-bold text-lg leading-none mb-1" style={{ color: scoreHex(val) }}>
              {val?.toFixed(1)}
            </div>
            <div className="text-[9px] text-gray-400 leading-tight capitalize">
              {key.replace(/_/g, ' ')}
            </div>
          </div>
        ))}
      </div>
      {/* Color legend */}
      <div className="flex gap-4 mt-4 pt-3 border-t border-gray-800">
        {[['#34d399','#052e16','Strong (7+)'],['#fbbf24','#451a03','Acceptable (5–7)'],['#f87171','#450a0a','Needs Work (<5)']].map(([c,bg,lbl]) => (
          <div key={lbl} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: bg, border: `1px solid ${c}` }} />
            <span className="text-[10px] text-gray-500">{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Checklist Breakdown (stacked bars) ────────────────────────────────────────

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
      <ChartHeader
        title="Checklist Coverage by Sheet"
        info="Stacked bars showing how many checklist items are covered (green), partially addressed (amber), or missing (red) for each of the three proposal sheets."
      />
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
                <div className="h-full bg-green-600 flex items-center justify-center text-white transition-all duration-1000 ease-out" style={{ width: `${cov}%` }}>
                  {cov > 20 && `${Math.round(cov)}%`}
                </div>
                <div className="h-full bg-yellow-600 transition-all duration-1000 ease-out" style={{ width: `${par}%`, transitionDelay: '150ms' }} />
                <div className="h-full bg-red-700 transition-all duration-1000 ease-out"   style={{ width: `${mis}%`, transitionDelay: '300ms' }} />
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
    { label: 'Completeness & Clarity',  score: a1, cls: 'bg-indigo-500', agent: 'A1' },
    { label: 'Estimation & Commercial', score: a2, cls: 'bg-purple-500', agent: 'A2' },
    { label: 'Competitive Strength',    score: a3, cls: 'bg-teal-500',   agent: 'A3' },
  ]
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <ChartHeader
        title="Score by Dimension"
        info="Horizontal bars showing each agent's raw score. Length = score out of 10. These three scores are weighted and combined to produce the Overall Score."
      />
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
  { key: 'must_fix',   label: 'Must Fix',   head: 'bg-red-950/60 text-red-300 border-b-red-800',         dot: 'bg-red-500',    border: 'border-red-900/50' },
  { key: 'should_fix', label: 'Should Fix', head: 'bg-yellow-950/60 text-yellow-300 border-b-yellow-800', dot: 'bg-yellow-500', border: 'border-yellow-900/40' },
  { key: 'next_time',  label: 'Next Time',  head: 'bg-blue-950/60 text-blue-300 border-b-blue-800',       dot: 'bg-blue-500',   border: 'border-blue-900/40' },
]

function PriorityKanban({ priorityActions }) {
  if (!priorityActions) return null
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <ChartHeader
        title="Priority Action Plan"
        info="Kanban board grouping all recommended actions by urgency. 'Must Fix' items should be resolved before submission. 'Should Fix' improves the proposal. 'Next Time' is future advice."
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        <div className="flex items-center gap-1.5">
          <h3 className="text-[11px] font-medium text-red-300 uppercase tracking-wider">
            Double-Flagged ({issues?.length || 0})
          </h3>
          <InfoTooltip text="Issues flagged independently by two or more specialist agents. These represent the highest-confidence problems — address them first." />
        </div>
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
                      <span key={a} className="text-[9px] font-mono bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded border border-gray-700">{a}</span>
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
      <div className="flex items-center gap-1.5 mb-3">
        <h3 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
          Consistency Checks ({issues?.length || 0} issues)
        </h3>
        <InfoTooltip text="Cross-checks between sections of your proposal — e.g. whether timelines in the cover letter match the estimation sheet, or whether pricing totals add up correctly." />
      </div>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Overall Score"  score={overall_score} theme="overall" sublabel={verdict}                     delay={0}   info="Weighted combination of all three agent scores. 7+ = Ready to Send, 5–7 = Revise, below 5 = Major revision needed." />
        <KPICard label="Completeness"   score={agent1_score}  theme="a1"      sublabel="Clarity & Writing"            delay={60}  info="Agent 1 score: evaluates proposal structure, writing clarity, scope definition, and whether all required sections are present." />
        <KPICard label="Commercial"     score={agent2_score}  theme="a2"      sublabel="Estimation & Pricing"         delay={120} info="Agent 2 score: evaluates pricing completeness, phase coverage, estimation methodology, and arithmetic accuracy." />
        <KPICard label="Competitive"    score={agent3_score}  theme="a3"      sublabel="Differentiation & Client Fit" delay={180} info="Agent 3 score: evaluates differentiation, alignment with client priorities, narrative flow, and risk transparency." />
      </div>

      {/* Weight adjustment banner */}
      {weight_adjusted && (
        <div className="flex items-center gap-2.5 bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-2.5 text-xs animate-slide-down">
          <span className="text-amber-400 text-sm">⚡</span>
          <span className="text-amber-300 font-semibold">{weight_label} weighting applied.</span>
          <span className="text-amber-400/70">{weight_reason}</span>
        </div>
      )}

      {/* ── Row 2: Gauge + Checklist Donut + Priority Column ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GaugeChart score={overall_score} verdict={verdict} />
        <ChecklistDonut checklistCoverage={checklist_coverage} />
        <PriorityColumnChart priorityActions={priority_actions} />
      </div>

      {/* ── Row 3: Agent Ring Trio + Score Tile Grid ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AgentRingTrio a1={agent1_score} a2={agent2_score} a3={agent3_score} />
        {section_scorecard
          ? <ScoreTileGrid sectionScorecard={section_scorecard} />
          : <AgentBars a1={agent1_score} a2={agent2_score} a3={agent3_score} />
        }
      </div>

      {/* ── Row 4: Radar + Checklist Breakdown + Agent Bars ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScoreRadar sectionScorecard={section_scorecard} />
        <div className="flex flex-col gap-4">
          <ChecklistBreakdown checklistCoverage={checklist_coverage} />
          {section_scorecard && <AgentBars a1={agent1_score} a2={agent2_score} a3={agent3_score} />}
        </div>
      </div>

      {/* ── Row 5: Priority Kanban ──────────────────────────────── */}
      <PriorityKanban priorityActions={priority_actions} />

      {/* ── Row 6: Double-flagged + Consistency ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DoubleFlaggedCompact issues={double_flagged_issues} />
        <ConsistencyCompact   issues={cross_consistency_issues} />
      </div>
    </div>
  )
}
