import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link, useNavigate } from 'react-router-dom'
import useActivityFeed from '../hooks/useActivityFeed'
import ActivityFeed from '../components/ActivityFeed'
import { getSession, getReportUrl, getSourceFileUrl, startAnalysis, getSessionHistory, generateModifiedPpt, getModificationGuide, cancelAnalysis, deleteSession } from '../api/client'
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
import DocumentSidebar         from '../components/results/DocumentSidebar'
import ComparisonDashboard     from '../components/results/ComparisonDashboard'
import ModificationReportPanel  from '../components/agent5/ModificationReportPanel'
import ModificationResultSection from '../components/agent5/ModificationResultSection'
import { FileText, Clock, Download, ArrowLeft, Home, Loader2, Sparkles, CheckCircle2, AlertCircle, RefreshCw, FileJson, FileType, Eye, BarChart3, Layers, BookOpen, CheckSquare, Monitor, GitCompare, Wand2, Square, FileDown } from 'lucide-react'
import { downloadJson, downloadMarkdown, agent4ToMarkdown } from '../utils/agentDownload'
import { downloadCurrentView, VIEW_DOWNLOAD_META, FORMAT_LABELS } from '../utils/viewDownloads'
import { clsx } from 'clsx'
import ChatPanel, { ChatToggleButton } from '../components/ChatPanel'

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

function PipelineProgressScreen({ status, onStop, stopping, sessionId }) {
  const isRunning = POLLING_STATUSES.has(status)
  const { agentActivities, isConnected, isDone, error } = useActivityFeed(sessionId, isRunning)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Analysis in progress</p>
        {/* Stop button */}
        <button
          onClick={onStop}
          disabled={stopping}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-800/60 text-red-300 hover:text-white hover:border-red-600 hover:bg-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {stopping
            ? <Loader2 size={11} className="animate-spin" />
            : <Square size={11} />
          }
          {stopping ? 'Stopping…' : 'Stop Analysis'}
        </button>
      </div>

      {/* Live activity feed */}
      <ActivityFeed
        agentActivities={agentActivities}
        isConnected={isConnected}
        isDone={isDone}
        error={error}
      />

      {/* Dummy anchor so we can remove the old Agent 4 block below */}
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
  const [generatingPpt, setGeneratingPpt] = useState(false)
  const [pptResult, setPptResult] = useState(null)
  const [cancellingAnalysis, setCancellingAnalysis] = useState(false)
  const [downloadingSource, setDownloadingSource] = useState(false)
  const [activeView, setActiveView] = useState('executive')
  const [history,     setHistory]     = useState([])          // all versions in the group
  const [sidebarMode, setSidebarMode] = useState('report')    // 'report' | 'compare_all'
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)        // hidden by default on mobile
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [downloadMenuPos, setDownloadMenuPos] = useState({ top: 0, right: 0 })
  const [chatOpen, setChatOpen] = useState(false)
  const downloadMenuRef      = useRef(null)
  const downloadBtnRef       = useRef(null)
  const downloadDropdownRef  = useRef(null)
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

  // Close download menu when clicking outside
  useEffect(() => {
    function onClickOutside(e) {
      const inBtn      = downloadMenuRef.current     && downloadMenuRef.current.contains(e.target)
      const inDropdown = downloadDropdownRef.current && downloadDropdownRef.current.contains(e.target)
      if (!inBtn && !inDropdown) setShowDownloadMenu(false)
    }
    if (showDownloadMenu) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showDownloadMenu])

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

  const handleGeneratePpt = async () => {
    const fileType = session?.file_type || 'pdf'
    if (fileType === 'pdf') {
      alert('Edit Guide requires a PowerPoint upload.\n\nPlease re-upload your proposal as a .pptx file to use Agent 5.')
      return
    }
    setGeneratingPpt(true)
    setPptResult(null)
    try {
      const result = await getModificationGuide(sessionId)
      setPptResult(result)
    } catch (err) {
      alert('Could not generate edit guide: ' + err.message)
    } finally {
      setGeneratingPpt(false)
    }
  }

  const handleCancelAnalysis = async () => {
    setCancellingAnalysis(true)
    try {
      await cancelAnalysis(sessionId)
    } catch {
      // Swallow — most likely a race condition where the pipeline already
      // finished before this request landed. fetchSession() below will
      // surface the actual current state.
    } finally {
      await fetchSession()
      setCancellingAnalysis(false)
    }
  }

  const handleDownloadSource = async () => {
    setDownloadingSource(true)
    try {
      const { download_url, filename } = await getSourceFileUrl(sessionId)
      const a = document.createElement('a')
      a.href = download_url
      a.download = filename
      a.target = '_blank'
      a.rel = 'noreferrer'
      a.click()
    } catch (err) {
      alert('Could not get file download link: ' + err.message)
    } finally {
      setDownloadingSource(false)
    }
  }

  const handleDeleteVersion = async (targetSessionId) => {
    try {
      await deleteSession(targetSessionId)
      // If we deleted the session we're currently viewing, go home
      if (targetSessionId === sessionId) {
        navigate('/')
        return
      }
      // Otherwise refresh the history list
      getSessionHistory(sessionId)
        .then(data => setHistory(data.versions || []))
        .catch(() => {})
    } catch (err) {
      alert('Could not delete document: ' + err.message)
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
          <aside className="hidden md:block w-64 flex-shrink-0 border-r border-gray-800 p-3 space-y-3" style={{ height: 'calc(100vh - 64px)' }}>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* ── MOBILE SIDEBAR BACKDROP ──────────────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <aside
          className={clsx(
            'flex-shrink-0 border-r border-gray-800 bg-gray-950 transition-all duration-300 overflow-hidden',
            'fixed md:sticky z-40 md:z-auto top-[60px] md:top-[64px] left-0 h-[calc(100vh-60px)] md:h-[calc(100vh-64px)]',
            sidebarOpen ? 'w-72 md:w-64' : 'w-0',
          )}
          style={{ overflowY: 'auto' }}
        >
          <DocumentSidebar
            versions={history}
            currentSessionId={sessionId}
            sidebarMode={sidebarMode}
            onCompareDashboard={() => setSidebarMode('compare_all')}
            onReportMode={() => setSidebarMode('report')}
            currentSession={session}
            onDeleteVersion={handleDeleteVersion}
          />
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main
          className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 transition-all duration-300"
          style={{ paddingRight: chatOpen ? 'clamp(0px, 29vw, 428px)' : undefined }}
        >

      {/* Sidebar toggle (always visible) */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        className="fixed z-30 w-5 h-12 bg-gray-800 border border-gray-700 border-l-0 rounded-r-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-all duration-300"
        style={{ left: sidebarOpen ? 256 : 0, top: '50%', transform: 'translateY(-50%)' }}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <span className="text-[10px]">{sidebarOpen ? '‹' : '›'}</span>
      </button>
        {/* Page header */}
        <div
          className="flex flex-wrap items-start justify-between gap-3 mb-5"
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
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={11} /> {formatDate(session.created_at)}
              </p>
              {/* Download original file — always visible */}
              <button
                onClick={handleDownloadSource}
                disabled={downloadingSource}
                title={`Download ${session.original_filename || 'original file'}`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 disabled:opacity-50 transition-all"
              >
                {downloadingSource
                  ? <Loader2 size={10} className="animate-spin" />
                  : <FileDown size={10} />
                }
                {downloadingSource ? 'Getting link…' : `Download ${(session.file_type || 'file').toUpperCase()}`}
              </button>
            </div>
          </div>

          {session.status === 'complete' && session.agent4_output && (() => {
            const viewKey     = sidebarMode === 'compare_all' ? 'compare_all' : activeView
            const meta        = VIEW_DOWNLOAD_META[viewKey] || VIEW_DOWNLOAD_META.executive
            const currentIdx  = history.findIndex(v => v.id === sessionId)
            const prevSession = currentIdx > 0 ? history[currentIdx - 1] : null
            const defFmt      = meta.defaultFormat || 'pdf'
            const fmtInfo     = FORMAT_LABELS[defFmt] || FORMAT_LABELS.pdf

            return (
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Agent 5 — Edit Guide (always visible for complete sessions) */}
                <button
                  onClick={handleGeneratePpt}
                  disabled={generatingPpt}
                  title={
                    session.file_type === 'pdf'
                      ? 'Edit Guide requires a PowerPoint upload (.pptx)'
                      : 'Agent 5: Generate a copy-paste edit guide for your PPT'
                  }
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-purple-700/60 text-purple-200 hover:text-white hover:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ background: generatingPpt ? 'rgba(88,28,135,0.3)' : 'linear-gradient(135deg,#581c87,#3b0764)' }}
                >
                  {generatingPpt
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Wand2 size={13} />
                  }
                  <span className="hidden sm:inline">
                    {generatingPpt ? 'Analysing…' : 'Edit Guide'}
                  </span>
                </button>

                {/* AI Chat toggle */}
                <ChatToggleButton
                  onClick={() => setChatOpen(o => !o)}
                  active={chatOpen}
                />

                {/* Split download button + format dropdown */}
                <div className="relative" ref={downloadMenuRef}>
                  <div className="flex items-stretch rounded-lg border border-blue-700/60"
                    style={{ boxShadow: '0 0 14px rgba(99,102,241,0.25)' }}>
                    {/* Primary action */}
                    <button
                      onClick={() => {
                        setShowDownloadMenu(false)
                        downloadCurrentView({ activeView, sidebarMode, output: session.agent4_output, session, history, prevSession, format: defFmt })
                      }}
                      className="flex items-center gap-2 text-sm font-medium px-3.5 py-2 text-white transition-all"
                      style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}
                      title={defFmt === 'pdf' ? 'Opens print dialog — Save as PDF' : `Download as ${defFmt.toUpperCase()}`}
                    >
                      <Download size={13} />
                      <span>{fmtInfo.label}</span>
                      <span className="text-[9px] opacity-55 font-mono hidden sm:inline">({meta.label})</span>
                    </button>
                    {/* Dropdown arrow */}
                    <button
                      ref={downloadBtnRef}
                      onClick={() => {
                        if (!showDownloadMenu && downloadBtnRef.current) {
                          const rect = downloadBtnRef.current.getBoundingClientRect()
                          const DROPDOWN_W = 208 // w-52
                          const rawRight = window.innerWidth - rect.right
                          // Clamp so dropdown never bleeds off the left edge on mobile
                          const clampedRight = Math.max(8, Math.min(rawRight, window.innerWidth - DROPDOWN_W - 8))
                          setDownloadMenuPos({ top: rect.bottom + 6, right: clampedRight })
                        }
                        setShowDownloadMenu(v => !v)
                      }}
                      className="flex items-center justify-center w-8 text-white/70 hover:text-white border-l border-blue-700/50 transition-colors"
                      style={{ background: 'linear-gradient(135deg,#1d4ed8,#6d28d9)' }}
                      title="More formats"
                    >
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                        <path d="M0 0l5 6 5-6z"/>
                      </svg>
                    </button>
                  </div>

                  {/* Format dropdown — portal-rendered to escape all ancestor stacking contexts */}
                  {showDownloadMenu && createPortal(
                    <div ref={downloadDropdownRef}
                      className="fixed bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
                      style={{ top: downloadMenuPos.top, right: downloadMenuPos.right, width: Math.min(208, window.innerWidth - 16), zIndex: 9999, animation: 'slide-up-fade 0.18s cubic-bezier(0.16,1,0.3,1) both' }}>
                      <div className="px-3 py-2 border-b border-gray-800">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Download Format</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{meta.label}</p>
                      </div>
                      {meta.formats.map(fmt => {
                        const info    = FORMAT_LABELS[fmt] || {}
                        const isCurr  = fmt === defFmt
                        return (
                          <button
                            key={fmt}
                            onClick={() => {
                              setShowDownloadMenu(false)
                              downloadCurrentView({ activeView, sidebarMode, output: session.agent4_output, session, history, prevSession, format: fmt })
                            }}
                            className={clsx(
                              'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                              isCurr
                                ? 'bg-blue-950/50 text-blue-300'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                            )}
                          >
                            <span className="text-base leading-none w-5 text-center">{info.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs">{info.label}</div>
                              <div className="text-[10px] text-gray-600">{info.hint}</div>
                            </div>
                            {isCurr && <span className="text-[9px] text-blue-500 font-mono">default</span>}
                          </button>
                        )
                      })}
                    </div>,
                    document.body
                  )}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Session metadata — hidden in compare mode to avoid double-context */}
        <div
          className={clsx('bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5 transition-all duration-300', sidebarMode === 'compare_all' && 'hidden')}
          style={{ animation: 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) 0.06s both' }}
        >
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Session Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
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
            <PipelineProgressScreen
              status={session.status}
              onStop={handleCancelAnalysis}
              stopping={cancellingAnalysis}
              sessionId={sessionId}
            />
          )}

          {/* Cancelled */}
          {session.status === 'cancelled' && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 text-center">
              <Square size={28} className="text-gray-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white mb-1">Analysis stopped</p>
              <p className="text-xs text-gray-400 mb-4">
                You stopped this analysis. Any results collected before cancellation are shown above.
                You can re-run the full analysis any time.
              </p>
              <button
                onClick={handleStartAnalysis}
                disabled={startingAnalysis}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {startingAnalysis ? (
                  <><Loader2 size={14} className="animate-spin" /> Starting…</>
                ) : (
                  <><RefreshCw size={14} /> Re-run Analysis</>
                )}
              </button>
            </div>
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

          {/* ── AI-Modified PPT result section ──────────────────────────────── */}
          {pptResult && (
            <ModificationResultSection
              result={pptResult}
              onDismiss={() => setPptResult(null)}
            />
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
                    {/* Mobile: horizontal scroll tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>

                      {/* Group 1 — Analysis */}
                      <div className="flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden min-w-0">
                        <div className="px-3 py-1.5 border-b border-gray-800">
                          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest whitespace-nowrap">Analysis Views</span>
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
                                className={clsx('flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 text-xs font-medium transition-all duration-150 border-r border-gray-800 last:border-0 whitespace-nowrap',
                                  isActive ? active : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40')}>
                                <Icon size={13} /><span className="hidden xs:inline sm:inline">{label}</span>
                                {isActive && <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Group 2 — Working views + optional Comparison */}
                      <div className="flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden min-w-0">
                        <div className="px-3 py-1.5 border-b border-gray-800">
                          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest whitespace-nowrap">Working Views</span>
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
                                className={clsx('flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 text-xs font-medium transition-all duration-150 border-r border-gray-800 last:border-0 whitespace-nowrap',
                                  isActive ? active : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40',
                                  key === 'comparison' && !isActive && 'border border-dashed border-violet-900/40')}>
                                <Icon size={13} /><span className="hidden xs:inline sm:inline">{label}</span>
                                {isActive && <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Export */}
                      <div className="flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
                        <div className="px-3 py-1.5 border-b border-gray-800">
                          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest whitespace-nowrap">Export</span>
                        </div>
                        <div className="flex flex-1 items-center gap-1 px-2">
                          <button onClick={() => downloadJson(session.agent4_output, `verdict_${slug}.json`)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors whitespace-nowrap">
                            <FileJson size={11} /> JSON
                          </button>
                          <button onClick={() => downloadMarkdown(agent4ToMarkdown(session.agent4_output, sessionMeta), `verdict_${slug}.md`)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors whitespace-nowrap">
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

      {/* ── AI Chat Panel ────────────────────────────────────────────────────── */}
      {chatOpen && session?.proposal_group_id && (
        <ChatPanel
          groupId={session.proposal_group_id}
          versionCount={history.length || 1}
          onClose={() => setChatOpen(false)}
        />
      )}

    </div>
  )
}
