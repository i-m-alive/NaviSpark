export default function VerdictBanner({ overallScore, verdict, agent1Score, agent2Score, agent3Score, weightLabel, weightAdjusted, weightReason }) {
  const verdictConfig = {
    'READY TO SEND': {
      bg: 'bg-green-950',
      border: 'border-green-700',
      text: 'text-green-300',
      badge: 'bg-green-900 text-green-200 border-green-600',
      icon: '✓',
    },
    'REVISE BEFORE SENDING': {
      bg: 'bg-yellow-950',
      border: 'border-yellow-700',
      text: 'text-yellow-300',
      badge: 'bg-yellow-900 text-yellow-200 border-yellow-600',
      icon: '⚠',
    },
    'NEEDS MAJOR REVISION': {
      bg: 'bg-red-950',
      border: 'border-red-800',
      text: 'text-red-300',
      badge: 'bg-red-900 text-red-200 border-red-700',
      icon: '↻',
    },
    // backward-compat for existing Supabase records
    'DO NOT SEND': {
      bg: 'bg-red-950',
      border: 'border-red-800',
      text: 'text-red-300',
      badge: 'bg-red-900 text-red-200 border-red-700',
      icon: '↻',
    },
  }

  const cfg = verdictConfig[verdict] || verdictConfig['REVISE BEFORE SENDING']
  const scorePct = Math.min(100, Math.max(0, (overallScore / 10) * 100))
  const scoreColour = overallScore >= 8 ? '#34d399' : overallScore >= 5 ? '#fbbf24' : '#f87171'

  const agentPills = [
    { label: 'Completeness', score: agent1Score, colour: 'text-indigo-400' },
    { label: 'Estimation',   score: agent2Score, colour: 'text-purple-400' },
    { label: 'Competitive',  score: agent3Score, colour: 'text-teal-400'   },
  ]

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-2xl overflow-hidden`}>
      {/* Top accent bar */}
      <div className={`h-1 w-full ${verdict === 'READY TO SEND' ? 'bg-green-500' : verdict === 'NEEDS MAJOR REVISION' || verdict === 'DO NOT SEND' ? 'bg-red-500' : 'bg-yellow-500'}`} />

      <div className="p-4 sm:p-6">
        {/* Header row — wraps on mobile */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Agent 4 — Final Verdict</p>
            <h2 className="text-lg sm:text-2xl font-bold text-white leading-snug">Chief Proposal Review Officer</h2>
            <p className="text-xs text-gray-500 mt-1">Aggregated from all three specialist agents via AWS Bedrock</p>
          </div>
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border font-bold text-xs sm:text-sm flex-shrink-0 ${cfg.badge}`}>
            <span>{cfg.icon}</span>
            <span className="truncate max-w-[160px] sm:max-w-none">{verdict}</span>
          </div>
        </div>

        {/* Score + ring */}
        <div className="flex items-center gap-4 sm:gap-6 mb-5">
          {/* Circular score */}
          <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="var(--t-bg4, #1f2937)" strokeWidth="8" />
              <circle
                cx="40" cy="40" r="32"
                fill="none"
                stroke={scoreColour}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - scorePct / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg sm:text-xl font-bold text-white leading-none">{overallScore?.toFixed(1)}</span>
              <span className="text-[10px] text-gray-500 leading-none">/10</span>
            </div>
          </div>

          {/* Score bar */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Overall Score</span>
              <span>{overallScore?.toFixed(1)} / 10</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--t-bg4, #1f2937)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${scorePct}%`, background: scoreColour }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>0 — Do Not Send</span>
              <span className="hidden sm:inline">5 — Revise</span>
              <span>8+ — Ready</span>
            </div>
          </div>
        </div>

        {/* Agent sub-scores */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
          {agentPills.map(({ label, score, colour }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-2 sm:p-3 text-center">
              <p className={`text-base sm:text-lg font-bold ${colour}`}>{score?.toFixed(1)}</p>
              <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wide mt-0.5 truncate">{label}</p>
            </div>
          ))}
        </div>

        {/* Weight adjustment notice */}
        {weightAdjusted && (
          <div className="flex items-start gap-2 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-gray-400">
            <span className="text-amber-400 mt-0.5 flex-shrink-0">⚡</span>
            <div>
              <span className="text-amber-400 font-medium">{weightLabel} weighting applied. </span>
              {weightReason}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
