import { clsx } from 'clsx'

const STATUS_CONFIG = {
  uploading:        { label: 'Uploading',   color: 'bg-yellow-900 text-yellow-300 border-yellow-800' },
  ready:            { label: 'Ready',       color: 'bg-blue-900 text-blue-300 border-blue-800' },
  pipeline_running: { label: 'Analysing',   color: 'bg-teal-900 text-teal-300 border-teal-800' },
  agent1_complete:  { label: 'A1 Done',     color: 'bg-indigo-900 text-indigo-300 border-indigo-800' },
  agent2_complete:  { label: 'A2 Done',     color: 'bg-purple-900 text-purple-300 border-purple-800' },
  agents_complete:  { label: 'Analysing',   color: 'bg-teal-900 text-teal-300 border-teal-800' },
  complete:         { label: 'Complete',    color: 'bg-green-900 text-green-300 border-green-800' },
  pipeline_failed:  { label: 'Failed',      color: 'bg-red-900 text-red-300 border-red-800' },
  cancelled:        { label: 'Cancelled',   color: 'bg-gray-800 text-gray-400 border-gray-700' },
  error:            { label: 'Error',       color: 'bg-red-900 text-red-300 border-red-800' },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-800 text-gray-400 border-gray-700' }
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      config.color
    )}>
      {config.label}
    </span>
  )
}
