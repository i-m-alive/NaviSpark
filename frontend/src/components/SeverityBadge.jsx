import { clsx } from 'clsx'

const CONFIG = {
  CRITICAL: { label: 'CRITICAL', classes: 'bg-red-950 text-red-300 border-red-800' },
  MAJOR:    { label: 'MAJOR',    classes: 'bg-orange-950 text-orange-300 border-orange-800' },
  MINOR:    { label: 'MINOR',    classes: 'bg-yellow-950 text-yellow-300 border-yellow-800' },
}

export default function SeverityBadge({ severity }) {
  const cfg = CONFIG[severity] || { label: severity, classes: 'bg-gray-800 text-gray-400 border-gray-700' }
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border font-mono tracking-wide',
      cfg.classes
    )}>
      {cfg.label}
    </span>
  )
}
