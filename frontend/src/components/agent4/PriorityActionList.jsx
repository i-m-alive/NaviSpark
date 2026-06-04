import { useState } from 'react'

const TIER_CONFIG = {
  must_fix: {
    label: 'Must Fix Before Sending',
    badge: 'bg-red-900 text-red-300 border-red-700',
    dot: 'bg-red-500',
    barColour: 'bg-red-500',
    tab: 'text-red-400 border-red-700',
    activeTab: 'bg-red-950 text-red-300 border-red-700',
    limit: 5,
  },
  should_fix: {
    label: 'Should Fix If Time Allows',
    badge: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    dot: 'bg-yellow-500',
    barColour: 'bg-yellow-500',
    tab: 'text-yellow-400 border-yellow-700',
    activeTab: 'bg-yellow-950 text-yellow-300 border-yellow-700',
    limit: 5,
  },
  next_time: {
    label: 'Note for Next Proposal',
    badge: 'bg-blue-900 text-blue-300 border-blue-700',
    dot: 'bg-blue-500',
    barColour: 'bg-blue-500',
    tab: 'text-blue-400 border-blue-700',
    activeTab: 'bg-blue-950 text-blue-300 border-blue-700',
    limit: 3,
  },
  internal: {
    label: 'Internal Readiness Only',
    badge: 'bg-gray-800 text-gray-400 border-gray-600',
    dot: 'bg-gray-500',
    barColour: 'bg-gray-600',
    tab: 'text-gray-500 border-gray-700',
    activeTab: 'bg-gray-800 text-gray-300 border-gray-600',
    limit: 3,
  },
}

function AgentTag({ agent }) {
  const colours = {
    'Agent 1': 'bg-indigo-950 text-indigo-400 border-indigo-800',
    'Agent 2': 'bg-purple-950 text-purple-400 border-purple-800',
    'Agent 3': 'bg-teal-950 text-teal-400 border-teal-800',
  }
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${colours[agent] || 'bg-gray-900 text-gray-500 border-gray-700'}`}>
      {agent}
    </span>
  )
}

function ActionItem({ item, cfg, index }) {
  return (
    <div className="border border-gray-800 rounded-xl p-4 space-y-2">
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-6 h-6 rounded-full ${cfg.dot} flex items-center justify-center text-xs font-bold text-white mt-0.5`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-snug">{item.action}</p>
          {item.why && (
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              <span className="text-gray-600">Why it matters: </span>{item.why}
            </p>
          )}
          {item.source_agents?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.source_agents.map(a => <AgentTag key={a} agent={a} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PriorityActionList({ priorityActions, hideTiers = [] }) {
  const [active, setActive] = useState('must_fix')

  if (!priorityActions) return null

  const tiers = ['must_fix', 'should_fix', 'next_time', 'internal'].filter(t => !hideTiers.includes(t))
  const activeItems = priorityActions[active] || []
  const cfg = TIER_CONFIG[active]

  const countBadge = (key) => {
    const count = priorityActions[key]?.length || 0
    return count > 0 ? (
      <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full border font-mono ${TIER_CONFIG[key].badge}`}>
        {count}
      </span>
    ) : null
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-0">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          Priority Action Plan
        </h3>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
          {tiers.map(tier => {
            const tc = TIER_CONFIG[tier]
            const isActive = active === tier
            return (
              <button
                key={tier}
                onClick={() => setActive(tier)}
                className={`flex-shrink-0 flex items-center text-xs px-3 py-1.5 rounded-t-lg border-x border-t transition-colors ${
                  isActive ? tc.activeTab : 'border-transparent text-gray-600 hover:text-gray-400'
                }`}
              >
                {tc.label.split(' ').slice(0, 2).join(' ')}
                {countBadge(tier)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-gray-800 px-5 py-4">
        {active === 'internal' && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950 border border-amber-800 rounded-lg px-3 py-2 mb-3">
            <span>⚠</span>
            <span>Internal section — not included in client-facing output.</span>
          </div>
        )}

        {activeItems.length === 0 ? (
          <p className="text-xs text-gray-600 italic py-3">No {cfg.label.toLowerCase()} items identified.</p>
        ) : (
          <div className="space-y-3">
            {activeItems.map((item, i) => (
              <ActionItem key={i} item={item} cfg={cfg} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
