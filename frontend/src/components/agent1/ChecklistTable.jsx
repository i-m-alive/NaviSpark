import { clsx } from 'clsx'
import { CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

const STATUS_CONFIG = {
  COVERED: {
    icon: CheckCircle2,
    iconClass: 'text-green-400',
    rowClass: '',
    badgeClass: 'bg-green-950 text-green-300 border-green-800',
  },
  PARTIAL: {
    icon: AlertCircle,
    iconClass: 'text-yellow-400',
    rowClass: 'bg-yellow-950/10',
    badgeClass: 'bg-yellow-950 text-yellow-300 border-yellow-800',
  },
  MISSING: {
    icon: XCircle,
    iconClass: 'text-red-400',
    rowClass: 'bg-red-950/10',
    badgeClass: 'bg-red-950 text-red-300 border-red-800',
  },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.MISSING
  const Icon = cfg.icon
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border', cfg.badgeClass)}>
      <Icon size={11} />
      {status}
    </span>
  )
}

export default function ChecklistTable({ sectionAudit }) {
  const [expanded, setExpanded] = useState(true)

  if (!sectionAudit || sectionAudit.length === 0) return null

  const covered  = sectionAudit.filter(i => i.status === 'COVERED').length
  const partial  = sectionAudit.filter(i => i.status === 'PARTIAL').length
  const missing  = sectionAudit.filter(i => i.status === 'MISSING').length
  const mandatory = sectionAudit.filter(i => i.mandatory)
  const mandatoryMissing = mandatory.filter(i => i.status === 'MISSING').length

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">GSK Proposal Checklist Coverage</span>
          <span className="text-xs font-mono text-gray-500">22 items</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-green-950 text-green-300 border border-green-800 px-2 py-0.5 rounded-full">✓ {covered} covered</span>
          <span className="text-xs bg-yellow-950 text-yellow-300 border border-yellow-800 px-2 py-0.5 rounded-full">◑ {partial} partial</span>
          <span className="text-xs bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full">✗ {missing} missing</span>
          {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </div>
      </button>

      {mandatoryMissing > 0 && (
        <div className="mx-5 mb-3 px-4 py-2.5 bg-red-950 border border-red-800 rounded-lg text-xs text-red-300">
          ⚠ {mandatoryMissing} mandatory item{mandatoryMissing > 1 ? 's' : ''} missing — must be addressed before submission
        </div>
      )}

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-950">
                <th className="text-left px-5 py-2.5 text-xs font-mono text-gray-500 w-16">ID</th>
                <th className="text-left px-3 py-2.5 text-xs font-mono text-gray-500">Section</th>
                <th className="text-center px-3 py-2.5 text-xs font-mono text-gray-500 w-24">Required</th>
                <th className="text-center px-3 py-2.5 text-xs font-mono text-gray-500 w-28">Status</th>
                <th className="text-left px-3 py-2.5 text-xs font-mono text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sectionAudit.map((item, idx) => {
                const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.MISSING
                return (
                  <tr key={item.id || idx} className={clsx('border-b border-gray-800/50 last:border-0', cfg.rowClass)}>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{item.id || '—'}</td>
                    <td className="px-3 py-3 text-gray-200 font-medium text-xs">{item.section}</td>
                    <td className="px-3 py-3 text-center">
                      {item.mandatory
                        ? <span className="text-xs bg-red-950 text-red-400 border border-red-900 px-1.5 py-0.5 rounded">YES</span>
                        : <span className="text-xs text-gray-600">opt</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-center"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-3 text-xs text-gray-400 max-w-xs">{item.note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
