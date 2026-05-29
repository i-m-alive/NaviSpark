import { Link } from 'react-router-dom'
import { FileText, Clock, ChevronRight, Download } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { getReportUrl } from '../api/client'
import { useState } from 'react'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function VerdictBadge({ verdict }) {
  if (!verdict) return null
  const colors = {
    'READY TO SEND':          'bg-green-900 text-green-300 border-green-700',
    'REVISE BEFORE SENDING':  'bg-yellow-900 text-yellow-300 border-yellow-700',
    'DO NOT SEND':            'bg-red-900 text-red-300 border-red-700',
  }
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${colors[verdict] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {verdict}
    </span>
  )
}

export default function SessionCard({ session }) {
  const [downloading, setDownloading] = useState(false)
  const hasReport = session.status === 'complete' && session.agent4_output

  const handleDownload = async (e) => {
    e.preventDefault()
    setDownloading(true)
    try {
      const { download_url } = await getReportUrl(session.id)
      window.open(download_url, '_blank')
    } catch (err) {
      alert('Could not get download link: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="card hover:border-gray-700 transition-colors group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-gray-800 rounded-lg flex-shrink-0 mt-0.5">
            <FileText size={18} className="text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session.original_filename || 'Untitled Document'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Clock size={11} />
              {formatDate(session.created_at)}
            </p>
          </div>
        </div>
        <StatusBadge status={session.status} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {session.page_count && (
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md">
            {session.page_count} pages
          </span>
        )}
        {session.file_type && (
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md uppercase">
            {session.file_type}
          </span>
        )}
        {session.proposal_type && (
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md">
            {session.proposal_type}
          </span>
        )}
      </div>

      {session.client_industry?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {session.client_industry.map((ind, i) => (
            <span key={i} className="text-xs bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded-md">
              {ind}
            </span>
          ))}
        </div>
      )}

      {session.agent4_output?.verdict && (
        <div className="mb-3">
          <VerdictBadge verdict={session.agent4_output.verdict} />
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
        <Link
          to={`/results/${session.id}`}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View Details <ChevronRight size={13} />
        </Link>
        {hasReport && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors ml-auto disabled:opacity-50"
          >
            <Download size={13} />
            {downloading ? 'Getting link...' : 'Download Report'}
          </button>
        )}
      </div>
    </div>
  )
}
