import { clsx } from 'clsx'

function ScoreBar({ value }) {
  const pct = Math.min(100, (value / 10) * 100)
  const color = value >= 7 ? 'bg-green-500' : value >= 5 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={clsx('text-sm font-bold font-mono w-8 text-right', value >= 7 ? 'text-green-400' : value >= 5 ? 'text-yellow-400' : 'text-red-400')}>
        {value?.toFixed(1)}
      </span>
    </div>
  )
}

function OverallRing({ score }) {
  const color = score >= 7 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'
  const label = score >= 8 ? 'Strong' : score >= 6.5 ? 'Acceptable' : score >= 5 ? 'Needs Work' : 'Weak'
  return (
    <div className="flex flex-col items-center justify-center">
      <span className={clsx('text-4xl font-black font-mono', color)}>{score?.toFixed(1)}</span>
      <span className="text-xs text-gray-500 mt-0.5">/ 10</span>
      <span className={clsx('text-xs font-semibold mt-1', color)}>{label}</span>
    </div>
  )
}

const DIMENSIONS = [
  { key: 'section_completeness', label: 'Section Completeness', weight: '40%' },
  { key: 'writing_quality',      label: 'Writing Quality',      weight: '20%' },
  { key: 'scope_clarity',        label: 'Scope Clarity',        weight: '25%' },
  { key: 'client_coverage',      label: 'Client Coverage',      weight: '15%' },
]

export default function Agent1ScoreCard({ scores }) {
  if (!scores) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Agent 1 — Score Summary</h3>
      <div className="flex gap-6 items-center">
        <OverallRing score={scores.overall} />
        <div className="flex-1 space-y-3">
          {DIMENSIONS.map(({ key, label, weight }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs text-gray-600 font-mono">{weight}</span>
              </div>
              <ScoreBar value={scores[key]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
