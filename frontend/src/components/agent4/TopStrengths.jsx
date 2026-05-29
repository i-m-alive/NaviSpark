const ICONS = ['✦', '✧', '◈']
const COLOURS = [
  { border: 'border-green-800', bg: 'bg-green-950', icon: 'text-green-400', text: 'text-green-300' },
  { border: 'border-teal-800',  bg: 'bg-teal-950',  icon: 'text-teal-400',  text: 'text-teal-300'  },
  { border: 'border-indigo-800', bg: 'bg-indigo-950', icon: 'text-indigo-400', text: 'text-indigo-300' },
]

export default function TopStrengths({ strengths }) {
  if (!strengths?.length) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
        Top {strengths.length} Genuine Strength{strengths.length !== 1 ? 's' : ''}
      </h3>
      <div className="space-y-3">
        {strengths.map((strength, i) => {
          const cfg = COLOURS[i % COLOURS.length]
          return (
            <div
              key={i}
              className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 flex items-start gap-3`}
            >
              <span className={`text-lg flex-shrink-0 mt-0.5 ${cfg.icon}`}>{ICONS[i % ICONS.length]}</span>
              <p className={`text-sm leading-relaxed ${cfg.text}`}>{strength}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
