import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getSession, getReportUrl, startAnalysis, getSessionHistory } from '../api/client'
import Navbar from '../components/Navbar'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
// Agent 4 components
import VerdictBanner from '../components/agent4/VerdictBanner'
import ScoreRadar from '../components/agent4/ScoreRadar'
import PriorityActionList from '../components/agent4/PriorityActionList'
import FullChecklistGrid from '../components/agent4/FullChecklistGrid'
import CrossConsistencyPanel from '../components/agent4/CrossConsistencyPanel'
import DoubleFlaggedIssues from '../components/agent4/DoubleFlaggedIssues'
import TopStrengths from '../components/agent4/TopStrengths'
import RewriteSuggestions from '../components/agent4/RewriteSuggestions'
// Multi-view components
import ExecutiveView        from '../components/results/ExecutiveView'
import DashboardView        from '../components/results/DashboardView'
import InDepthView          from '../components/results/InDepthView'
import StoryboardView       from '../components/results/StoryboardView'
import ActionPlanView       from '../components/results/ActionPlanView'
import PresentationView     from '../components/results/PresentationView'
import ComparisonView        from '../components/results/ComparisonView'
import VersionTimeline       from '../components/results/VersionTimeline'
import UploadRevisionPanel   from '../components/results/UploadRevisionPanel'
import DocumentSidebar       from '../components/results/DocumentSidebar'
import ComparisonDashboard   from '../components/results/ComparisonDashboard'
import { FileText, Clock, Download, ArrowLeft, Home, Loader2, Sparkles, CheckCircle2, AlertCircle, RefreshCw, FileJson, FileType, Eye, BarChart3, Layers, BookOpen, CheckSquare, Monitor, GitCompare } from 'lucide-react'
import { downloadJson, downloadMarkdown, agent4ToMarkdown } from '../utils/agentDownload'
import { clsx } from 'clsx'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function DownloadButtons({ onJson, onMarkdown }) {
  return (
    <div className="ml-auto flex items-center gap-1">
      <button
        onClick={onJson}
        title="Download as JSON"
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
      >
        <FileJson size={12} />
        JSON
      </button>
      <button
        onClick={onMarkdown}
        title="Download as Markdown"
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
      >
        <FileType size={12} />
        MD
      </button>
    </div>
  )
}

// ── Agent 4 Results ────────────────────────────────────────────────────────────

function Agent4Results({ output, onDownloadJson, onDownloadMarkdown }) {
  const a4 = output

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 pb-1 border-b border-orange-900">
        <Sparkles size={14} className="text-orange-400" />
        <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
          Agent 4 — Chief Proposal Review Officer
        </span>
        {onDownloadJson && <DownloadButtons onJson={onDownloadJson} onMarkdown={onDownloadMarkdown} />}
      </div>

      {/* Verdict Banner + Scores */}
      <VerdictBanner
        overallScore={a4.overall_score}
        verdict={a4.verdict}
        agent1Score={a4.agent1_score}
        agent2Score={a4.agent2_score}
        agent3Score={a4.agent3_score}
        weightLabel={a4.weight_label}
        weightAdjusted={a4.weight_adjusted}
        weightReason={a4.weight_reason}
      />

      {/* Plain-English Summary */}
      {a4.plain_english_summary && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Executive Briefing
          </h3>
          <p className="text-sm text-gray-200 leading-relaxed">{a4.plain_english_summary}</p>
        </div>
      )}

      {/* Top Strengths */}
      {a4.top_3_strengths?.length > 0 && (
        <TopStrengths strengths={a4.top_3_strengths} />
      )}

      {/* Double-Flagged Issues */}
      <DoubleFlaggedIssues issues={a4.double_flagged_issues} />

      {/* Priority Action List */}
      <PriorityActionList priorityActions={a4.priority_actions} />

      {/* Score Radar */}
      <ScoreRadar sectionScorecard={a4.section_scorecard} />

      {/* Cross-Consistency */}
      <CrossConsistencyPanel issues={a4.cross_consistency_issues} />

      {/* Unified Checklist Grid */}
      <FullChecklistGrid checklistCoverage={a4.checklist_coverage} />

      {/* Rewrite Suggestions */}
      {a4.rewrite_suggestions?.length > 0 && (
        <RewriteSuggestions suggestions={a4.rewrite_suggestions} />
      )}
    </div>
  )
}

// ── Pipeline Progress Screen ──────────────────────────────────────────────────

const AGENT_CARDS = [
  { num: 1, label: 'Completeness & Clarity', colour: 'indigo' },
  { num: 2, label: 'Estimation & Commercial Integrity', colour: 'purple' },
  { num: 3, label: 'Competitive Strength', colour: 'teal' },
]

const COLOUR_MAP = {
  indigo: { border: 'border-indigo-800', text: 'text-indigo-400', bg: 'bg-indigo-950' },
  purple: { border: 'border-purple-800', text: 'text-purple-400', bg: 'bg-purple-950' },
  teal:   { border: 'border-teal-800',   text: 'text-teal-400',   bg: 'bg-teal-950' },
}

function PipelineProgressScreen({ status }) {
  const specialistsDone = status === 'agents_complete' || status === 'complete'

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Analysis in progress</p>

      {/* Three parallel agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AGENT_CARDS.map(({ num, label, colour }) => {
          const c = COLOUR_MAP[colour]
          return (
            <div
              key={num}
              className={`bg-gray-900 border ${specialistsDone ? 'border-green-800' : c.border} rounded-xl p-4 transition-all duration-500`}
              style={{ animation: `stat-enter 0.5s cubic-bezier(0.16,1,0.3,1) ${(num - 1) * 80}ms both` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 ${specialistsDone ? 'bg-green-950' : c.bg} rounded-lg`}>
                  {specialistsDone ? (
                    <CheckCircle2 size={14} className="text-green-400" />
                  ) : (
                    <Loader2 size={14} className={`${c.text} animate-spin`} />
                  )}
                </div>
                <p className={`text-xs font-semibold ${specialistsDone ? 'text-green-400' : c.text}`}>
                  Agent {num}
                </p>
              </div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-xs text-gray-600 mt-1">
                {specialistsDone ? 'Complete' : 'Analysing…'}
              </p>
            </div>
          )
        })}
      </div>

      {/* Agent 4 status */}
      <div className={`bg-gray-900 border ${status === 'agents_complete' ? 'border-orange-800' : 'border-gray-800'} rounded-xl p-4 transition-all duration-500`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 ${status === 'agents_complete' ? 'bg-orange-950' : 'bg-gray-800'} rounded-lg`}>
            {status === 'agents_complete' ? (
              <Loader2 size={16} className="text-orange-400 animate-spin" />
            ) : (
              <Sparkles size={16} className="text-gray-600" />
            )}
          </div>
          <div>
            <p className={`text-sm font-semibold ${status === 'agents_complete' ? 'text-orange-300' : 'text-gray-600'}`}>
              Agent 4 — Chief Proposal Review Officer
            </p>
            <p className="text-xs text-gray-500">
              {status === 'agents_complete'
                ? 'Synthesising all specialist findings…'
                : 'Waiting for specialist agents to complete…'}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-600 text-center">
        This typically takes 30–60 seconds. Page updates automatically.
      </p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const POLLING_STATUSES = new Set(['pipeline_running', 'agents_complete'])
const POLL_INTERVAL_MS = 3000

export default function ResultsPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [startingAnalysis, setStartingAnalysis] = useState(false)
  const [activeView, setActiveView] = useState('executive')
  const [history,     setHistory]     = useState([])          // all versions in the group
  const [sidebarMode, setSidebarMode] = useState('report')    // 'report' | 'compare_all'
  const [sidebarOpen, setSidebarOpen] = useState(true)        // mobile toggle
  const pollRef = useRef(null)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const fetchSession = async () => {
    try {
      const data = await getSession(sessionId)
      setSession(data)
      // Stop polling once terminal state is reached
      if (!POLLING_STATUSES.has(data.status)) {
        stopPolling()
      }
    } catch (err) {
      setError(err.message)
      stopPolling()
    }
  }

  useEffect(() => {
    fetchSession().finally(() => setLoading(false))
    return stopPolling
  }, [sessionId])

  // Start or stop polling whenever status changes
  useEffect(() => {
    if (!session) return
    if (POLLING_STATUSES.has(session.status)) {
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchSession, POLL_INTERVAL_MS)
      }
    } else {
      stopPolling()
    }
  }, [session?.status])

  // Load version history once the session is complete
  useEffect(() => {
    if (session?.status === 'complete') {
      getSessionHistory(sessionId)
        .then(data => setHistory(data.versions || []))
        .catch(() => {})  // non-critical — history panel just won't show
    }
  }, [session?.status, sessionId])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { download_url } = await getReportUrl(sessionId)
      window.open(download_url, '_blank')
    } catch (err) {
      alert('Could not get download link: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  const handleStartAnalysis = async () => {
    setStartingAnalysis(true)
    try {
      await startAnalysis(sessionId)
      await fetchSession()
    } catch (err) {
      setError(err.message)
    } finally {
      setStartingAnalysis(false)
    }
  }

  const sessionMeta = session ? {
    filename: session.original_filename,
    proposalType: session.proposal_type,
    industry: session.client_industry,
    priorities: session.client_priorities,
    date: session.created_at ? new Date(session.created_at).toLocaleDateString('en-IN') : '',
  } : {}

  const slug = sessionId?.slice(0, 8) || 'report'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <Navbar />
        <div className="flex flex-1">
          {/* Sidebar skeleton */}
          <aside className="w-64 flex-shrink-0 border-r border-gray-800 p-3 space-y-3" style={{ height: 'calc(100vh - 64px)' }}>
            <div className="px-1 py-4 border-b border-gray-800 space-y-2">
              <div className="h-3 w-20 rounded bg-gray-800 animate-shimmer" />
              <div className="h-2 w-14 rounded bg-gray-800/60 animate-shimmer" />
            </div>
            {[1, 2].map(i => (
              <div key={i} className="rounded-xl border border-gray-800 p-3 flex gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gray-800 animate-shimmer flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-16 rounded bg-gray-800 animate-shimmer" />
                  <div className="h-3 w-28 rounded bg-gray-800/80 animate-shimmer" />
                  <div className="h-2 w-12 rounded bg-gray-800/60 animate-shimmer" />
                </div>
              </div>
            ))}
          </aside>
          {/* Main skeleton */}
          <main className="flex-1 px-6 py-8 space-y-4">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-gray-800 animate-shimmer" />
              <div className="h-6 w-72 rounded bg-gray-800/80 animate-shimmer" />
              <div className="h-3 w-40 rounded bg-gray-800/60 animate-shimmer" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="h-3 w-28 rounded bg-gray-800 animate-shimmer" />
              <div className="grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-2.5 w-16 rounded bg-gray-800/70 animate-shimmer" />
                    <div className="h-4 w-24 rounded bg-gray-800 animate-shimmer" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-14 rounded-xl bg-gray-900 border border-gray-800 animate-shimmer" />
              <div className="flex-1 h-14 rounded-xl bg-gray-900 border border-gray-800 animate-shimmer" />
              <div className="w-24 h-14 rounded-xl bg-gray-900 border border-gray-800 animate-shimmer" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
              <div className="h-20 rounded-xl bg-gray-800 animate-shimmer" />
              <div className="h-3 w-full rounded bg-gray-800/70 animate-shimmer" />
              <div className="h-3 w-4/5 rounded bg-gray-800/60 animate-shimmer" />
              <div className="h-3 w-3/5 rounded bg-gray-800/50 animate-shimmer" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-red-400">{error || 'Session not found.'}</p>
          <Link to="/" className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 hover:border-gray-500 text-sm text-gray-300 hover:text-white transition-all">
            <Home size={14} /> Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <aside
          className={clsx(
            'flex-shrink-0 border-r border-gray-800 bg-gray-950 transition-all duration-300 overflow-hidden',
            sidebarOpen ? 'w-64' : 'w-0',
          )}
          style={{ position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto' }}
        >
          <DocumentSidebar
            versions={history}
            currentSessionId={sessionId}
            sidebarMode={sidebarMode}
            onCompareDashboard={() => setSidebarMode('compare_all')}
            onReportMode={() => setSidebarMode('report')}
            currentSession={session}
          />
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-8">

      {/* Sidebar toggle (always visible) */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-20 w-5 h-12 bg-gray-800 border border-gray-700 border-l-0 rounded-r-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-all"
        style={{ left: sidebarOpen ? 256 : 0 }}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <span className="text-[10px]">{sidebarOpen ? '‹' : '›'}</span>
      </button>
        {/* Page header */}
        <div
          className="flex items-start justify-between mb-5"
          style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <div>
            {/* Home navigation pill */}
            <Link
              to="/"
              className="group inline-flex items-center gap-1.5 mb-2.5 text-xs font-medium text-gray-500 hover:text-white px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-600 hover:bg-gray-800 transition-all duration-200"
            >
              <Home size={11} className="group-hover:text-blue-400 transition-colors" />
              Home
            </Link>

            <div className="flex items-center gap-2 flex-wrap">
              <FileText size={18} className="text-blue-400 flex-shrink-0" />
              <h1 className="text-lg font-semibold text-white truncate max-w-sm">
                {session.original_filename || 'Untitled Document'}
              </h1>
              <StatusBadge status={session.status} />
              {(session.version_number || 1) > 1 && (
                <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded-full">
                  V{session.version_number}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Clock size={11} /> {formatDate(session.created_at)}
            </p>
          </div>

          {session.status === 'complete' && session.report_storage_path && (
            <button onClick={handleDownload} disabled={downloading} className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0">
              <Download size={14} />
              {downloading ? 'Loading…' : 'Download Report'}
            </button>
          )}
        </div>

        {/* Session metadata — hidden in compare mode to avoid double-context */}
        <div
          className={clsx('bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5 transition-all duration-300', sidebarMode === 'compare_all' && 'hidden')}
          style={{ animation: 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) 0.06s both' }}
        >
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Session Details</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <span className="text-gray-500">File Type</span>
              <p className="text-white uppercase">{session.file_type || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Pages</span>
              <p className="text-white">{session.page_count ?? '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Proposal Type</span>
              <p className="text-white">{session.proposal_type || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Industries</span>
              <p className="text-white">{session.client_industry?.join(', ') || '—'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Client Priorities</span>
              <p className="text-white">{session.client_priorities?.join(', ') || '—'}</p>
            </div>
          </div>
        </div>

        {/* ── Analysis section — state-driven ─────────────────────────────── */}
        <div
          key={`${session.status}-${sidebarMode}`}
          className="space-y-4"
          style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) 0.12s both' }}
        >

          {/* Ready — not started yet */}
          {session.status === 'ready' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <Sparkles size={32} className="text-orange-400 mx-auto mb-3" />
              <p className="text-base font-semibold text-white mb-1">Ready for analysis</p>
              <p className="text-sm text-gray-400 mb-5">
                Click below to run all three specialist agents in parallel, then get the final verdict.
              </p>
              <button
                onClick={handleStartAnalysis}
                disabled={startingAnalysis}
                className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {startingAnalysis ? (
                  <><Loader2 size={15} className="animate-spin" /> Starting…</>
                ) : (
                  <><Sparkles size={15} /> Start Analysis</>
                )}
              </button>
            </div>
          )}

          {/* Pipeline running */}
          {POLLING_STATUSES.has(session.status) && (
            <PipelineProgressScreen status={session.status} />
          )}

          {/* Pipeline failed */}
          {session.status === 'pipeline_failed' && (
            <div className="bg-red-950 border border-red-800 rounded-xl p-6 text-center">
              <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white mb-1">Analysis failed</p>
              <p className="text-xs text-red-300 mb-4">
                One or more agents encountered an error. You can retry the full analysis.
              </p>
              <button
                onClick={handleStartAnalysis}
                disabled={startingAnalysis}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {startingAnalysis ? (
                  <><Loader2 size={14} className="animate-spin" /> Retrying…</>
                ) : (
                  <><RefreshCw size={14} /> Retry Analysis</>
                )}
              </button>
            </div>
          )}

          {/* Complete — multi-view report (hidden when comparison dashboard is active) */}
          {session.status === 'complete' && session.agent4_output && sidebarMode === 'report' && (
            <div>
              {/* ── View switcher (6 views + optional Comparison tab) ────────── */}
              {(() => {
                // Previous version for comparison (the one directly before current)
                const currentIdx = history.findIndex(v => v.id === sessionId)
                const prevVersion = currentIdx > 0 ? history[currentIdx - 1] : null
                const hasComparison = prevVersion && prevVersion.agent4_output

                return (
                  <div className="mb-5 animate-fade-in space-y-1.5">
                    <div className="flex gap-2">

                      {/* Group 1 — Analysis */}
                      <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-gray-800">
                          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Analysis Views</span>
                        </div>
                        <div className="flex">
                          {[
                            { key: 'executive', label: 'Executive', Icon: Eye,      active: 'bg-indigo-950/40 text-indigo-300', dot: 'bg-indigo-500' },
                            { key: 'dashboard', label: 'Dashboard', Icon: BarChart3, active: 'bg-purple-950/40 text-purple-300', dot: 'bg-purple-500' },
                            { key: 'indepth',   label: 'In-Depth',  Icon: Layers,   active: 'bg-teal-950/40 text-teal-300',     dot: 'bg-teal-500'   },
                          ].map(({ key, label, Icon, active, dot }) => {
                            const isActive = activeView === key
                            return (
                              <button key={key} onClick={() => setActiveView(key)}
                                className={clsx('flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all duration-150 border-r border-gray-800 last:border-0',
                                  isActive ? active : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40')}>
                                <Icon size={13} /><span>{label}</span>
                                {isActive && <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Group 2 — Working views + optional Comparison */}
                      <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-gray-800">
                          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Working Views</span>
                        </div>
                        <div className="flex">
                          {[
                            { key: 'storyboard',   label: 'Story',   Icon: BookOpen,    active: 'bg-orange-950/40 text-orange-300', dot: 'bg-orange-500' },
                            { key: 'actionplan',   label: 'Plan',    Icon: CheckSquare, active: 'bg-green-950/40 text-green-300',   dot: 'bg-green-500'  },
                            { key: 'presentation', label: 'Present', Icon: Monitor,     active: 'bg-sky-950/40 text-sky-300',       dot: 'bg-sky-500'    },
                            ...(hasComparison ? [{ key: 'comparison', label: 'Compare', Icon: GitCompare, active: 'bg-violet-950/40 text-violet-300', dot: 'bg-violet-500' }] : []),
                          ].map(({ key, label, Icon, active, dot }) => {
                            const isActive = activeView === key
                            return (
                              <button key={key} onClick={() => setActiveView(key)}
                                className={clsx('flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all duration-150 border-r border-gray-800 last:border-0',
                                  isActive ? active : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40',
                                  key === 'comparison' && !isActive && 'border border-dashed border-violet-900/40')}>
                                <Icon size={13} /><span>{label}</span>
                                {isActive && <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Export */}
                      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
                        <div className="px-3 py-1.5 border-b border-gray-800">
                          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Export</span>
                        </div>
                        <div className="flex flex-1 items-center gap-1 px-2">
                          <button onClick={() => downloadJson(session.agent4_output, `verdict_${slug}.json`)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors">
                            <FileJson size={11} /> JSON
                          </button>
                          <button onClick={() => downloadMarkdown(agent4ToMarkdown(session.agent4_output, sessionMeta), `verdict_${slug}.md`)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors">
                            <FileType size={11} /> MD
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* ── Active view ──────────────────────────────────────────────── */}
              {(() => {
                const currentIdx = history.findIndex(v => v.id === sessionId)
                const prevVersion = currentIdx > 0 ? history[currentIdx - 1] : null
                return (
                  <div key={activeView} style={{ animation: 'slide-up-fade 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
                    {activeView === 'executive'    && <ExecutiveView    output={session.agent4_output} session={session} />}
                    {activeView === 'dashboard'    && <DashboardView    output={session.agent4_output} session={session} />}
                    {activeView === 'indepth'      && <InDepthView      output={session.agent4_output} session={session} />}
                    {activeView === 'storyboard'   && <StoryboardView   output={session.agent4_output} session={session} />}
                    {activeView === 'actionplan'   && <ActionPlanView   output={session.agent4_output} session={session} />}
                    {activeView === 'presentation' && <PresentationView output={session.agent4_output} session={session} />}
                    {activeView === 'comparison'   && (
                      <ComparisonView
                        currentSession={{ ...session, agent4_output: session.agent4_output }}
                        prevSession={prevVersion}
                      />
                    )}
                  </div>
                )
              })()}

              {/* ── Upload revised document panel ────────────────────────────── */}
              <div id="upload-revision-panel">
                <UploadRevisionPanel
                  sessionId={sessionId}
                  versionNumber={session.version_number || history.length || 1}
                  parentFilename={session.original_filename}
                />
              </div>
            </div>
          )}

          {/* ── Comparison dashboard — replaces individual report ──────────── */}
          {sidebarMode === 'compare_all' && (
            <div key="compare_all" style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
              <ComparisonDashboard versions={history} />
            </div>
          )}

        </div>
        </main>
      </div>
    </div>
  )
}
