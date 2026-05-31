// Pure SVG radar chart — zero dependencies, no recharts.

const DIMENSIONS = [
  { key: 'section_completeness', label: 'Completeness' },
  { key: 'writing_quality',      label: 'Writing'      },
  { key: 'scope_clarity',        label: 'Scope'        },
  { key: 'estimation_rigour',    label: 'Estimation'   },
  { key: 'phase_coverage',       label: 'Phases'       },
  { key: 'pricing_completeness', label: 'Pricing'      },
  { key: 'client_fit',           label: 'Client Fit'   },
  { key: 'differentiation',      label: 'Diff.'        },
  { key: 'risk_transparency',    label: 'Risk'         },
  { key: 'credibility',          label: 'Credibility'  },
  { key: 'narrative',            label: 'Narrative'    },
]

const CX = 180
const CY = 160
const R  = 120
const N  = DIMENSIONS.length

function polarToCart(angle, radius) {
  const rad = (angle - 90) * (Math.PI / 180)
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  }
}

function makePolygon(values, maxR) {
  return values
    .map((v, i) => {
      const angle = (360 / N) * i
      const r = (v / 10) * maxR
      const { x, y } = polarToCart(angle, r)
      return `${x},${y}`
    })
    .join(' ')
}

function makeGrid(level, maxR) {
  const r = (level / 5) * maxR
  return Array.from({ length: N }).map((_, i) => {
    const { x, y } = polarToCart((360 / N) * i, r)
    return `${x},${y}`
  }).join(' ')
}

export default function ScoreRadar({ sectionScorecard }) {
  if (!sectionScorecard) return null

  const values = DIMENSIONS.map(d => sectionScorecard[d.key] ?? 0)
  const polygon = makePolygon(values, R)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
        Dimension Score Radar — All 11 Sub-Scores
      </h3>

      <div className="flex justify-center w-full">
        <svg width={360} height={320} viewBox="0 0 360 320" className="w-full max-w-sm mx-auto">
          {/* Grid circles */}
          {[1, 2, 3, 4, 5].map(level => (
            <polygon
              key={level}
              points={makeGrid(level, R)}
              fill="none"
              stroke="var(--t-bg4, #1f2937)"
              strokeWidth="1"
            />
          ))}

          {/* Axis spokes */}
          {DIMENSIONS.map((_, i) => {
            const angle = (360 / N) * i
            const outer = polarToCart(angle, R)
            return (
              <line
                key={i}
                x1={CX} y1={CY}
                x2={outer.x} y2={outer.y}
                stroke="var(--t-bg4, #1f2937)" strokeWidth="1"
              />
            )
          })}

          {/* Score polygon */}
          <polygon
            points={polygon}
            fill="rgba(99,102,241,0.2)"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Score dots */}
          {values.map((v, i) => {
            const angle = (360 / N) * i
            const r = (v / 10) * R
            const { x, y } = polarToCart(angle, r)
            return <circle key={i} cx={x} cy={y} r={3.5} fill="#6366f1" stroke="#1e1b4b" strokeWidth="1.5" />
          })}

          {/* Axis labels */}
          {DIMENSIONS.map((d, i) => {
            const angle = (360 / N) * i
            const { x, y } = polarToCart(angle, R + 20)
            const anchor = x < CX - 5 ? 'end' : x > CX + 5 ? 'start' : 'middle'
            return (
              <text
                key={i}
                x={x} y={y + 4}
                textAnchor={anchor}
                fill="#9ca3af"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                {d.label}
              </text>
            )
          })}

          {/* Scale labels */}
          {[2, 4, 6, 8, 10].map(val => {
            const { x, y } = polarToCart(0, (val / 10) * R)
            return (
              <text key={val} x={x + 3} y={y - 2} fill="#4b5563" fontSize="8" fontFamily="ui-monospace, monospace">
                {val}
              </text>
            )
          })}
        </svg>
      </div>

      {/* Legend grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mt-2 border-t border-gray-800 pt-4">
        {DIMENSIONS.map(d => {
          const score = sectionScorecard[d.key] ?? 0
          const colour = score >= 7 ? 'text-green-400' : score >= 4 ? 'text-yellow-400' : 'text-red-400'
          return (
            <div key={d.key} className="flex items-center justify-between text-xs">
              <span className="text-gray-500 truncate">{d.label}</span>
              <span className={`font-mono font-semibold ml-2 flex-shrink-0 ${colour}`}>{score.toFixed(1)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
