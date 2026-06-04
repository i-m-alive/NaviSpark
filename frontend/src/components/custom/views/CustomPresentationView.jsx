import { clsx } from 'clsx'
import { CheckCircle2, XCircle, AlertTriangle, Minus } from 'lucide-react'

function scoreColor(s) {
  if (s >= 7) return '#34d399'
  if (s >= 5) return '#fbbf24'
  return '#f87171'
}

function Slide({ title, children, accent = 'blue' }) {
  const colors = {
    blue:   'border-blue-800/60 bg-blue-950/20',
    green:  'border-green-800/60 bg-green-950/20',
    red:    'border-red-800/60 bg-red-950/20',
    orange: 'border-orange-800/60 bg-orange-950/20',
    purple: 'border-purple-800/60 bg-purple-950/20',
  }
  const titleColors = {
    blue: 'text-blue-400', green: 'text-green-400', red: 'text-red-400',
    orange: 'text-orange-400', purple: 'text-purple-400',
  }
  return (
    <div className={clsx('border rounded-xl p-6 space-y-4 print:break-inside-avoid', colors[accent])}>
      <h2 className={clsx('text-sm font-semibold uppercase tracking-wider', titleColors[accent])}>{title}</h2>
      {children}
    </div>
  )
}

export default function CustomPresentationView({ output, session }) {
  if (!output) return null

  const {
    overall_score = 0,
    verdict = '',
    plain_english_summary,
    top_3_strengths = [],
    priority_actions = {},
    category_scores = {},
    checklist_coverage = {},
    nc2_scoring_type,
    nc2_weights_source,
  } = output

  const nc1 = session?.agent1_output
  const ad  = nc1?.auto_detected || {}
  const { must_fix = [], should_fix = [] } = priority_actions
  const { passed = 0, partial: _partial = 0, failed = 0 } = checklist_coverage
  const total_items = passed + _partial + failed || 1   // evaluated items only
  const pass_rate   = passed / total_items

  const verdictAccent = verdict === 'READY TO SEND' ? 'green'
    : verdict === 'DO NOT SEND' ? 'red' : 'orange'

  const catEntries = Object.entries(category_scores).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-4 max-w-3xl mx-auto" style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>

      {/* Slide 1: Cover */}
      <Slide title="Proposal Review — Custom Checklist" accent="blue">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-5xl font-bold" style={{ color: scoreColor(overall_score) }}>
              {overall_score.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 mt-1">out of 10</div>
          </div>
          <div className="flex-1">
            <div className={clsx('text-xl font-bold mb-2',
              verdict === 'READY TO SEND' ? 'text-green-300'
              : verdict === 'DO NOT SEND' ? 'text-red-300' : 'text-yellow-300'
            )}>
              {verdict}
            </div>
            {plain_english_summary && (
              <p className="text-sm text-gray-300 leading-relaxed">{plain_english_summary}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {ad.client_name    && <div><span className="text-[10px] text-gray-600">Client</span><p className="text-xs text-gray-300">{ad.client_name}</p></div>}
          {ad.proposal_type  && <div><span className="text-[10px] text-gray-600">Type</span><p className="text-xs text-gray-300">{ad.proposal_type}</p></div>}
          {nc2_scoring_type  && <div><span className="text-[10px] text-gray-600">Scoring</span><p className="text-xs text-gray-300">{nc2_scoring_type}</p></div>}
        </div>
      </Slide>

      {/* Slide 2: Coverage Summary */}
      <Slide title="Checklist Coverage" accent="purple">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-green-400">{passed}</div>
            <div className="text-xs text-gray-500">Passed</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">{total_items}</div>
            <div className="text-xs text-gray-500">Total Items</div>
          </div>
          <div>
            <div className="text-3xl font-bold" style={{ color: scoreColor(pass_rate * 10) }}>
              {Math.round(pass_rate * 100)}%
            </div>
            <div className="text-xs text-gray-500">Pass Rate</div>
          </div>
        </div>
        {catEntries.length > 0 && (
          <div className="space-y-2">
            {catEntries.map(([name, score]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-40 truncate flex-shrink-0">{name}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(score / 10) * 100}%`, background: scoreColor(score) }}
                  />
                </div>
                <span className="text-xs font-mono w-10 text-right flex-shrink-0" style={{ color: scoreColor(score) }}>
                  {score.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Slide>

      {/* Slide 3: Strengths */}
      {top_3_strengths.length > 0 && (
        <Slide title="Key Strengths" accent="green">
          <div className="space-y-3">
            {top_3_strengths.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-200">
                  {typeof s === 'string' ? s : s.description || s.text || s.category || JSON.stringify(s)}
                </p>
              </div>
            ))}
          </div>
        </Slide>
      )}

      {/* Slide 4: Priority Actions */}
      {(must_fix.length > 0 || should_fix.length > 0) && (
        <Slide title="Priority Actions" accent={verdictAccent}>
          {must_fix.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Must Fix</p>
              <ul className="space-y-1.5">
                {must_fix.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <XCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                    {typeof item === 'string' ? item : item.action || item.description || item.gap || JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {should_fix.length > 0 && (
            <div className={clsx(must_fix.length > 0 && 'pt-3 border-t border-gray-800')}>
              <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">Should Fix</p>
              <ul className="space-y-1.5">
                {should_fix.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <AlertTriangle size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    {typeof item === 'string' ? item : item.action || item.description || item.gap || JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Slide>
      )}
    </div>
  )
}
