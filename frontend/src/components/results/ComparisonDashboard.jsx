import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle, Award } from 'lucide-react'

// ── Color helpers ─────────────────────────────────────────────────────────────

function scoreHex(score) {
  if (score == null) return '#4b5563'
  if (score >= 7) return '#34d399'
  if (score >= 5) return '#fbbf24'
  return '#f87171'
}

function verdictConfig(verdict) {
  if (verdict === 'READY TO SEND')                               return { text: 'Ready',          bg: 'bg-green-900/60',  border: 'border-green-700',  text_cls: 'text-green-300'  }
  if (verdict === 'REVISE BEFORE SENDING')                       return { text: 'Revise',          bg: 'bg-yellow-900/60', border: 'border-yellow-700', text_cls: 'text-yellow-300' }
  if (verdict === 'NEEDS MAJOR REVISION' || verdict === 'DO NOT SEND') return { text: 'Major Revision', bg: 'bg-red-900/60',    border: 'border-red-700',    text_cls: 'text-red-300'    }
  return { text: verdict || '—', bg: 'bg-gray-800', border: 'border-gray-700', text_cls: 'text-gray-400' }
}

// ── Pure-SVG line chart ───────────────────────────────────────────────────────

const SERIES = [
  { key: 'overall', label: 'Overall',       color: '#6366f1', getScore: o => o?.overall_score },
  { key: 'a1',      label: 'Completeness',  color: '#818cf8', getScore: o => o?.agent1_score  },
  { key: 'a2',      label: 'Commercial',    color: '#a78bfa', getScore: o => o?.agent2_score  },
  { key: 'a3',      label: 'Competitive',   color: '#34d399', getScore: o => o?.agent3_score  },
]

function ScoreTrendChart({ versions }) {
  const W = 560, H = 200
  const P = { top: 24, right: 20, bottom: 44, left: 36 }
  const UW = W - P.left - P.right
  const UH = H - P.top  - P.bottom
  const n  = versions.length

  const xOf = i => P.left + (n <= 1 ? UW / 2 : (i / (n - 1)) * UW)
  const yOf = s => P.top + (1 - s / 10) * UH

  return (
    <div>
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
        Score Trend Across Versions
      </p>
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>

          {/* Y grid */}
          {[0, 2, 4, 6, 8, 10].map(v => {
            const y = yOf(v)
            return (
              <g key={v}>
                <line x1={P.left} y1={y} x2={W - P.right} y2={y}
                  stroke="#1f2937" strokeWidth="1" strokeDasharray={v % 5 === 0 ? '' : '3,3'} />
                <text x={P.left - 5} y={y + 3} textAnchor="end" fill="#4b5563" fontSize="9" fontFamily="monospace">{v}</text>
              </g>
            )
          })}

          {/* Zone fill: green ≥7 */}
          <rect x={P.left} y={P.top} width={UW} height={(1 - 7 / 10) * UH}
            fill="rgba(52,211,153,0.03)" />

          {/* X labels */}
          {versions.map((v, i) => (
            <text key={i} x={xOf(i)} y={H - P.bottom + 14} textAnchor="middle"
              fill="#6b7280" fontSize="10" fontFamily="monospace">
              V{v.version_number}
            </text>
          ))}

          {/* Lines */}
          {SERIES.map(({ key, color, getScore }) => {
            const pts = versions.map((v, i) => {
              const s = getScore(v.agent4_output)
              return s != null ? `${xOf(i)},${yOf(s)}` : null
            }).filter(Boolean)
            if (pts.length < 2) return null
            return (
              <polyline key={key} points={pts.join(' ')} fill="none"
                stroke={color} strokeWidth="2" strokeLinejoin="round" opacity="0.9" />
            )
          })}

          {/* Dots + score labels */}
          {SERIES.map(({ key, color, getScore }) =>
            versions.map((v, i) => {
              const s = getScore(v.agent4_output)
              if (s == null) return null
              const cx = xOf(i), cy = yOf(s)
              return (
                <g key={`${key}-${i}`}>
                  <circle cx={cx} cy={cy} r="4.5" fill={color} stroke="#030712" strokeWidth="2" />
                  {/* Only label the "overall" line to avoid clutter */}
                  {key === 'overall' && (
                    <text x={cx} y={cy - 9} textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace" fontWeight="bold">
                      {s.toFixed(1)}
                    </text>
                  )}
                </g>
              )
            })
          )}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-2 px-2">
          {SERIES.map(({ key, color, label }) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-5 h-0.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Must-fix count bar chart ──────────────────────────────────────────────────

function IssuesBarChart({ versions }) {
  const maxMust = Math.max(...versions.map(v => v.agent4_output?.priority_actions?.must_fix?.length || 0), 1)
  const W = 560, H = 140
  const P = { top: 16, right: 20, bottom: 36, left: 36 }
  const UW = W - P.left - P.right
  const UH = H - P.top - P.bottom
  const n  = versions.length
  const barW = Math.min(48, (UW / n) * 0.55)

  return (
    <div>
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
        Critical Issues to Fix — Per Version
      </p>
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>

          {/* Y grid */}
          {Array.from({ length: maxMust + 1 }, (_, v) => {
            const y = P.top + (1 - v / maxMust) * UH
            return (
              <g key={v}>
                <line x1={P.left} y1={y} x2={W - P.right} y2={y} stroke="#1f2937" strokeWidth="1" />
                {v % Math.max(1, Math.floor(maxMust / 4)) === 0 && (
                  <text x={P.left - 5} y={y + 3} textAnchor="end" fill="#4b5563" fontSize="9" fontFamily="monospace">{v}</text>
                )}
              </g>
            )
          })}

          {/* Bars */}
          {versions.map((v, i) => {
            const count  = v.agent4_output?.priority_actions?.must_fix?.length || 0
            const barH   = (count / maxMust) * UH
            const cx     = P.left + (i + 0.5) * (UW / n)
            const x      = cx - barW / 2
            const y      = P.top + UH - barH
            const color  = count === 0 ? '#34d399' : count <= 2 ? '#fbbf24' : '#f87171'
            return (
              <g key={i}>
                {/* Bar */}
                <rect x={x} y={y} width={barW} height={Math.max(barH, 2)} rx="3"
                  fill={color} opacity="0.85" />
                {/* Count label above bar */}
                <text x={cx} y={y - 5} textAnchor="middle" fill={color} fontSize="11" fontFamily="monospace" fontWeight="bold">
                  {count}
                </text>
                {/* Version label below */}
                <text x={cx} y={H - P.bottom + 14} textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="monospace">
                  V{v.version_number}
                </text>
              </g>
            )
          })}
        </svg>
        <p className="text-[10px] text-gray-700 text-center mt-1">
          Lower is better — target is 0 critical issues
        </p>
      </div>
    </div>
  )
}

// ── Checklist coverage grouped bars ──────────────────────────────────────────

function ChecklistProgressChart({ versions }) {
  const W = 560, H = 140
  const P = { top: 16, right: 20, bottom: 36, left: 36 }
  const UW = W - P.left - P.right
  const UH = H - P.top - P.bottom
  const n  = versions.length

  const maxTotal = Math.max(...versions.map(v => (v.agent4_output?.checklist_coverage || []).length), 1)

  return (
    <div>
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
        Checklist Coverage Progress
      </p>
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
          {/* Y grid */}
          {[0, 25, 50, 75, 100].map(pct => {
            const y = P.top + (1 - pct / 100) * UH
            return (
              <g key={pct}>
                <line x1={P.left} y1={y} x2={W - P.right} y2={y} stroke="#1f2937" strokeWidth="1" />
                <text x={P.left - 5} y={y + 3} textAnchor="end" fill="#4b5563" fontSize="9" fontFamily="monospace">{pct}%</text>
              </g>
            )
          })}

          {/* Stacked bars per version */}
          {versions.map((v, i) => {
            const list    = v.agent4_output?.checklist_coverage || []
            const total   = list.length || 1
            const covered = list.filter(x => x.status === 'COVERED').length
            const partial = list.filter(x => x.status === 'PARTIAL').length
            const missing = total - covered - partial

            const cx    = P.left + (i + 0.5) * (UW / n)
            const bw    = Math.min(48, (UW / n) * 0.55)
            const x     = cx - bw / 2

            const covH  = (covered / total) * UH
            const parH  = (partial / total) * UH
            const misH  = (missing / total) * UH
            const covY  = P.top + UH - covH
            const parY  = covY - parH
            const misY  = parY - misH

            const covPct = Math.round((covered / total) * 100)

            return (
              <g key={i}>
                {/* Green = covered */}
                {covH > 0 && <rect x={x} y={covY} width={bw} height={covH} fill="#16a34a" opacity="0.8" rx="0" />}
                {/* Yellow = partial */}
                {parH > 0 && <rect x={x} y={parY} width={bw} height={parH} fill="#ca8a04" opacity="0.8" />}
                {/* Red = missing */}
                {misH > 0 && <rect x={x} y={misY} width={bw} height={misH} fill="#b91c1c" opacity="0.7" rx="3" />}
                {/* Border */}
                <rect x={x} y={misY} width={bw} height={UH - (misY - P.top)} fill="none" stroke="#030712" strokeWidth="1" rx="3" />
                {/* % label */}
                <text x={cx} y={P.top + UH - (covH / 2)} textAnchor="middle" fill="white" fontSize="9" fontFamily="monospace">
                  {covPct > 15 ? `${covPct}%` : ''}
                </text>
                {/* Version label */}
                <text x={cx} y={H - P.bottom + 14} textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="monospace">
                  V{v.version_number}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="flex gap-5 mt-2 px-2">
          {[['bg-green-700','Covered'],['bg-yellow-600','Partial'],['bg-red-700','Missing']].map(([cls,lbl]) => (
            <div key={lbl} className="flex items-center gap-1.5">
              <div className={clsx('w-3 h-3 rounded', cls)} />
              <span className="text-[10px] text-gray-500">{lbl}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Verdict progression ───────────────────────────────────────────────────────

function VerdictProgression({ versions }) {
  return (
    <div>
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
        Verdict Progression
      </p>
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-0 flex-wrap">
          {versions.map((v, i) => {
            const cfg = verdictConfig(v.agent4_output?.verdict)
            const score = v.agent4_output?.overall_score
            return (
              <div key={v.id} className="flex items-center">
                <div className={clsx('flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border', cfg.bg, cfg.border)}>
                  <span className="text-[9px] font-mono text-gray-500">V{v.version_number}</span>
                  <span className={clsx('text-[11px] font-semibold text-center leading-tight', cfg.text_cls)}>{cfg.text}</span>
                  {score != null && (
                    <span className="font-mono text-xs font-bold" style={{ color: scoreHex(score) }}>{score.toFixed(1)}</span>
                  )}
                  {v.status !== 'complete' && (
                    <span className="text-[9px] text-gray-600 capitalize">{v.status?.replace(/_/g, ' ')}</span>
                  )}
                </div>
                {i < versions.length - 1 && (
                  <div className="flex flex-col items-center px-2">
                    <span className="text-gray-700 text-lg">→</span>
                    {versions[i + 1]?.agent4_output?.overall_score != null && score != null && (
                      <span className={clsx('text-[9px] font-mono font-bold',
                        versions[i+1].agent4_output.overall_score > score ? 'text-green-500' :
                        versions[i+1].agent4_output.overall_score < score ? 'text-red-500' : 'text-gray-600',
                      )}>
                        {versions[i+1].agent4_output.overall_score > score ? '+' : ''}{(versions[i+1].agent4_output.overall_score - score).toFixed(1)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Score delta summary cards ─────────────────────────────────────────────────

function DeltaSummaryStrip({ first, latest }) {
  if (!first?.agent4_output || !latest?.agent4_output) return null
  const f = first.agent4_output, l = latest.agent4_output

  const deltas = [
    { label: 'Overall',      prev: f.overall_score, curr: l.overall_score, color: '#6366f1' },
    { label: 'Completeness', prev: f.agent1_score,  curr: l.agent1_score,  color: '#818cf8' },
    { label: 'Commercial',   prev: f.agent2_score,  curr: l.agent2_score,  color: '#a78bfa' },
    { label: 'Competitive',  prev: f.agent3_score,  curr: l.agent3_score,  color: '#34d399' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {deltas.map(({ label, prev, curr, color }) => {
        const d     = (curr - prev)
        const isPos = d > 0
        const isNeg = d < 0
        return (
          <div key={label} className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1">{label}</p>
            <span className="text-2xl font-bold" style={{ color }}>{curr?.toFixed(1)}</span>
            <div className={clsx(
              'flex items-center justify-center gap-1 mt-1 text-[10px] font-mono font-bold',
              isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-gray-600',
            )}>
              {isPos ? <TrendingUp size={10} /> : isNeg ? <TrendingDown size={10} /> : <Minus size={10} />}
              {isPos && '+'}{d.toFixed(1)} from V{first.version_number}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Double-flagged reduction ──────────────────────────────────────────────────

function DoubleFlaggedBar({ versions }) {
  const data = versions.map(v => ({
    ver:   v.version_number,
    count: v.agent4_output?.double_flagged_issues?.length || 0,
  }))
  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div>
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
        Double-Flagged Issues (Cross-Agent) — Per Version
      </p>
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-2">
        {data.map(({ ver, count }) => (
          <div key={ver} className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-500 w-6">V{ver}</span>
            <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all duration-700',
                  count === 0 ? 'bg-green-600' : count <= 1 ? 'bg-yellow-500' : 'bg-red-600')}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className={clsx('text-[11px] font-mono font-bold w-4 text-right',
              count === 0 ? 'text-green-400' : count <= 1 ? 'text-yellow-400' : 'text-red-400')}>
              {count}
            </span>
          </div>
        ))}
        {data.every(d => d.count === 0) && (
          <div className="flex items-center gap-2 text-xs text-green-400 pt-1">
            <Award size={12} /> No double-flagged issues in any version!
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ComparisonDashboard({ versions }) {
  const completedVersions = versions.filter(v => v.status === 'complete' && v.agent4_output)

  if (completedVersions.length < 2) {
    return (
      <div className="text-center py-20">
        <BarChart3 size={36} className="text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Need at least 2 completed versions to compare.</p>
        <p className="text-gray-700 text-xs mt-1">Upload and analyze an improved version to unlock this view.</p>
      </div>
    )
  }

  const first  = completedVersions[0]
  const latest = completedVersions[completedVersions.length - 1]

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) both' }}>
        <h2 className="text-lg font-bold text-white">Comparison Dashboard</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Tracking {completedVersions.length} completed versions — V{first.version_number} to V{latest.version_number}
        </p>
      </div>

      {/* Score delta cards */}
      <div style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
          Overall Improvement — V{first.version_number} to V{latest.version_number}
        </p>
        <DeltaSummaryStrip first={first} latest={latest} />
      </div>

      {/* Verdict progression */}
      <div style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}>
        <VerdictProgression versions={completedVersions} />
      </div>

      {/* Score trend line chart */}
      <div style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) 0.15s both' }}>
        <ScoreTrendChart versions={completedVersions} />
      </div>

      {/* Issues bar chart */}
      <div style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}>
        <IssuesBarChart versions={completedVersions} />
      </div>

      {/* Checklist progress */}
      <div style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) 0.25s both' }}>
        <ChecklistProgressChart versions={completedVersions} />
      </div>

      {/* Double-flagged */}
      <div style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) 0.3s both' }}>
        <DoubleFlaggedBar versions={completedVersions} />
      </div>
    </div>
  )
}
