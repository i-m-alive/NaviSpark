/**
 * CustomResultsPage — exact mirror of ResultsPage for the Custom Checklist Pipeline (NC1–NC4).
 *
 * Uses the same views, sidebar, chat panel, download system, comparison flow and
 * desktop notifications as ResultsPage. NC4 output is adapted to Agent4 format
 * so all existing view components work without modification.
 *
 * Views used:
 *   Executive, Dashboard  → existing views with adapted NC4 output
 *   In-Depth              → CustomInDepthView  (NC3 category data)
 *   Storyboard            → CustomStoryboardView (NC3 narrative)
 *   Action Plan           → existing ActionPlanView with adapted NC4
 *   Presentation          → existing PresentationView with adapted NC4
 *   Comparison            → existing ComparisonView with adapted NC4
 */

import { useState, useEffect, useRef } from 'react'
import { useNotifications } from '../context/NotificationContext'
import { createPortal } from 'react-dom'
import { useParams, Link, useNavigate } from 'react-router-dom'
import useActivityFeed from '../hooks/useActivityFeed'
import ActivityFeed from '../components/ActivityFeed'
import {
  getSession, getReportUrl, getSourceFileUrl, getSessionHistory,
  cancelCustomAnalysis, reRunCustom, deleteSession,
} from '../api/client'
import Navbar        from '../components/Navbar'
import StatusBadge   from '../components/StatusBadge'
// Agent4 sub-components — reused for custom pipeline via adapter
import VerdictBanner        from '../components/agent4/VerdictBanner'
import ScoreRadar           from '../components/agent4/ScoreRadar'
import PriorityActionList   from '../components/agent4/PriorityActionList'
import CrossConsistencyPanel from '../components/agent4/CrossConsistencyPanel'
import DoubleFlaggedIssues  from '../components/agent4/DoubleFlaggedIssues'
import TopStrengths         from '../components/agent4/TopStrengths'
// Existing multi-view components (work with adapted NC4 data)
import ExecutiveView    from '../components/results/ExecutiveView'
import ActionPlanView   from '../components/results/ActionPlanView'
import PresentationView from '../components/results/PresentationView'
import ComparisonView   from '../components/results/ComparisonView'
import UploadRevisionPanel   from '../components/results/UploadRevisionPanel'
import DocumentSidebar       from '../components/results/DocumentSidebar'
import ComparisonDashboard   from '../components/results/ComparisonDashboard'
// NC4-specific views (custom pipeline)
import CustomDashboardView  from '../components/custom/views/CustomDashboardView'
import CustomInDepthView    from '../components/custom/views/CustomInDepthView'
import CustomStoryboardView from '../components/custom/views/CustomStoryboardView'
// NC4-specific components
import CustomChecklistGrid from '../components/custom/CustomChecklistGrid'
import {
  FileText, Clock, Download, Home, Loader2, Sparkles, CheckCircle2,
  AlertCircle, RefreshCw, FileJson, FileType, Eye, BarChart3, Layers,
  BookOpen, CheckSquare, Monitor, GitCompare, Square, FileDown,
} from 'lucide-react'
import { downloadJson, downloadMarkdown } from '../utils/agentDownload'
import { downloadCurrentView, VIEW_DOWNLOAD_META, FORMAT_LABELS } from '../utils/viewDownloads'
import { clsx } from 'clsx'
import ChatPanel, { ChatToggleButton } from '../components/ChatPanel'

// ── NC4 Output Adapter ────────────────────────────────────────────────────────
// Transforms NC4 output + NC3 results into the Agent4 shape that all existing
// view components expect.  Null-safe throughout.

function normalizeActionItem(item) {
  if (!item) return { action: '', why: '', source_agents: [] }
  if (typeof item === 'string') return { action: item, why: '', source_agents: [] }
  // NC4.3 uses gap_description + suggested_fix; other formats use action/description/gap
  const action = item.gap_description || item.action || item.description || item.gap || item.text || ''
  const why    = item.suggested_fix   || item.why    || item.gap || item.reason || ''
  return { action, why, source_agents: item.source_agents || [] }
}

function buildChecklistCoverageFromNc3(nc3Results, nc2Output) {
  const items = []
  ;(nc3Results || []).forEach(cat => {
    ;(cat.findings || []).forEach(f => {
      const nc2Cat  = (nc2Output?.categories || []).find(c => c.id === cat.category_id)
      const nc2Item = (nc2Cat?.items || []).find(i => i.id === f.item_id)
      items.push({
        id:           f.item_id || '—',
        sheet:        cat.category_name || 'Custom',
        topic:        nc2Item?.text || f.item_id || '—',
        status:       f.status === 'PASS' ? 'COVERED' : f.status === 'PARTIAL' ? 'PARTIAL' : 'MISSING',
        mandatory:    (nc2Item?.weight || 0) >= 1.0,
        primary_agent:'NC3',
        note:         f.evidence || f.gap || '',
        internal:     false,
      })
    })
  })
  return items
}

export function adaptNc4ToAgent4(nc4Output, nc3Results, nc2Output, nc1Output) {
  if (!nc4Output) return null

  const {
    category_scores      = {},
    priority_actions     = {},
    consistency_warnings = [],
    top_3_strengths      = [],
    overall_score        = 0,
    verdict              = '',
    error_categories     = [],
    verdict_meta         = {},
    nc2_scoring_type,
    nc2_weights_source,
    checklist_coverage:  rawChecklistCoverage = {},
    specialist_scores    = {},
    specialist_priority_actions = {},
    specialist_available = false,
  } = nc4Output

  // Filter out fallback parse-error items before building action lists
  const _isParseError = (item) => {
    if (!item) return true
    const text = (typeof item === 'string' ? item : (item.gap_description || item.action || item.gap || '')).toLowerCase()
    return text.includes('llm response could not be parsed') || text.includes('manual review required')
  }

  const adaptedActions = {
    must_fix:   (priority_actions.must_fix   || []).filter(i => !_isParseError(i)).map(normalizeActionItem),
    should_fix: (priority_actions.should_fix || []).filter(i => !_isParseError(i)).map(normalizeActionItem),
    next_time:  (priority_actions.next_time  || []).filter(i => !_isParseError(i)).map(normalizeActionItem),
    internal:   [],
  }

  const adaptedConsistency = (consistency_warnings || []).map((w, i) => {
    if (typeof w === 'string') {
      return { rule_id: `CW-${i + 1}`, check: 'Consistency Issue', finding: w, severity: 'MAJOR', agents_involved: [] }
    }
    const typeLabel = w.type ? w.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : (w.check || `Warning ${i + 1}`)
    return {
      rule_id:         w.warning_id || `CW-${i + 1}`,
      check:           typeLabel,
      finding:         w.description || w.finding || w.warning || '',
      severity:        w.severity || 'MAJOR',
      agents_involved: [],
    }
  })

  // NC4.4 strengths: use `highlight` field (the generated sentence), fallback to category_name
  const adaptedStrengths = top_3_strengths
    .map(s => typeof s === 'string' ? s : (s.highlight || s.description || s.category_name || s.text || s.category || s.strength || ''))
    .filter(Boolean)

  // NC4.7 produces section_scorecard with the 15 standard dimensions.
  // If present, use it directly for ScoreRadar. Fallback to category_scores.
  const section_scorecard = (nc4Output.section_scorecard && Object.keys(nc4Output.section_scorecard).length > 0)
    ? nc4Output.section_scorecard
    : category_scores

  // Fallback score: average of NC3 category scores (used when a specialist review failed)
  const breakdown    = nc4Output.scoring_breakdown || []
  const avgScore     = breakdown.length
    ? Number((breakdown.reduce((s, r) => s + (r.normalised_score || r.score || 0), 0) / breakdown.length).toFixed(1))
    : null

  // agent1/2/3_score map to NCR1/NCR2/NCR3 specialist scores.
  // ExecutiveView renders these as the three traffic-light cards labelled
  // "Clarity & Completeness", "Commercial Strength", "Competitive Position".
  // Fall back to the NC3 category average when a specialist review failed.
  const agent1_score = specialist_scores.clarity_completeness  ?? avgScore
  const agent2_score = specialist_scores.commercial_strength   ?? avgScore
  const agent3_score = specialist_scores.competitive_position  ?? avgScore

  return {
    // ── Core scoring ───────────────────────────────────────────────────────────
    overall_score,
    weighted_overall_score: overall_score,
    verdict,

    // ── Summary ────────────────────────────────────────────────────────────────
    plain_english_summary: nc4Output.plain_english_summary || '',

    // ── Per-category scores (used by dashboard/executive category bars) ────────
    category_scores,

    // ── Verdict metadata ───────────────────────────────────────────────────────
    verdict_meta,

    // ── Checklist metadata ─────────────────────────────────────────────────────
    nc2_scoring_type,
    nc2_weights_source,

    // ── Error categories (shown in dashboard error section) ────────────────────
    error_categories,

    // ── NCR1/NCR2/NCR3 scores → Executive traffic-light cards ─────────────────
    agent1_score,
    agent2_score,
    agent3_score,
    weight_adjusted: false,
    weight_label:    nc2_weights_source ? `Weights: ${nc2_weights_source}` : 'Custom Checklist',
    weight_reason:   nc2_scoring_type   ? `Scoring: ${nc2_scoring_type}`   : null,

    // ── Scorecard & radar ──────────────────────────────────────────────────────
    section_scorecard,

    // ── Priority actions (checklist-based from NC3) ────────────────────────────
    priority_actions: adaptedActions,

    // ── Specialist priority actions (NCR1/2/3 domain-level actions) ───────────
    specialist_priority_actions,
    specialist_available,
    specialist_scores,

    // ── Strengths ──────────────────────────────────────────────────────────────
    top_3_strengths: adaptedStrengths,

    // ── Consistency issues ─────────────────────────────────────────────────────
    cross_consistency_issues: adaptedConsistency,

    // ── Double-flagged: NC3 category FAIL + NCR specialist independently confirmed ──
    double_flagged_issues: nc4Output.double_flagged_issues || [],

    // ── Checklist coverage — raw NC4 object {total_items, passed, partial,
    //    failed, error_items, pass_rate}. Components that need per-item arrays
    //    receive nc3Results/nc2Output directly via session prop.
    checklist_coverage: rawChecklistCoverage,

    // ── Rewrite suggestions (not in NC4) ──────────────────────────────────────
    rewrite_suggestions: [],

    // ── NC4 passthrough fields ─────────────────────────────────────────────────
    _nc4: nc4Output,
    _nc3: nc3Results || [],
    _nc2: nc2Output || {},
    _nc1: nc1Output || {},
  }
}

// ── NC4 → Markdown export ─────────────────────────────────────────────────────

function nc4ToMarkdown(nc4Output, sessionMeta, nc2Output, nc3Results) {
  if (!nc4Output) return ''
  const lines = []
  const { overall_score = 0, verdict = '', plain_english_summary, top_3_strengths = [],
          priority_actions = {}, category_scores = {}, checklist_coverage = {},
          consistency_warnings = [], nc2_scoring_type, nc2_weights_source } = nc4Output

  lines.push(`# Custom Checklist Review — ${sessionMeta?.filename || 'Report'}`)
  lines.push('')
  if (sessionMeta?.date) lines.push(`**Date:** ${sessionMeta.date}`)
  if (nc2_scoring_type)  lines.push(`**Scoring type:** ${nc2_scoring_type}`)
  if (nc2_weights_source) lines.push(`**Weights:** ${nc2_weights_source}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  const verdictEmoji = verdict === 'READY TO SEND' ? '✅' : verdict === 'DO NOT SEND' ? '❌' : '🔄'
  lines.push(`## ${verdictEmoji} Verdict: ${verdict}`)
  lines.push('')
  lines.push(`**Overall Score:** ${overall_score.toFixed(1)} / 10`)
  const _cPassed   = checklist_coverage.passed  || 0
  const _cPartial  = checklist_coverage.partial || 0
  const _cFailed   = checklist_coverage.failed  || 0
  const _cEval     = _cPassed + _cPartial + _cFailed || 1
  const _cRate     = Math.round((_cPassed / _cEval) * 100)
  lines.push(`**Pass Rate:** ${_cRate}% (${_cPassed}/${_cEval} evaluated items)`)
  lines.push('')

  if (plain_english_summary) {
    lines.push('## Executive Summary')
    lines.push('')
    lines.push(plain_english_summary)
    lines.push('')
  }

  if (top_3_strengths.length) {
    lines.push('## Top Strengths')
    top_3_strengths.forEach((s, i) => {
      const text = typeof s === 'string' ? s : (s.description || s.text || '')
      lines.push(`${i + 1}. ${text}`)
    })
    lines.push('')
  }

  const renderActions = (items, heading) => {
    if (!items?.length) return
    lines.push(`## ${heading}`)
    lines.push('')
    items.forEach((item, i) => {
      const text = typeof item === 'string' ? item : (item.action || item.description || item.gap || '')
      const why  = typeof item === 'object' && (item.why || item.gap) ? `\n   *${item.why || item.gap}*` : ''
      lines.push(`${i + 1}. ${text}${why}`)
    })
    lines.push('')
  }
  renderActions(priority_actions.must_fix,   '🔴 Must Fix')
  renderActions(priority_actions.should_fix, '🟡 Should Fix')
  renderActions(priority_actions.next_time,  '🔵 Next Time')

  if (Object.keys(category_scores).length) {
    lines.push('## Category Scores')
    lines.push('')
    lines.push('| Category | Score |')
    lines.push('|----------|-------|')
    Object.entries(category_scores)
      .sort(([, a], [, b]) => b - a)
      .forEach(([name, score]) => lines.push(`| ${name} | ${score.toFixed(1)} / 10 |`))
    lines.push('')
  }

  if (nc3Results?.length) {
    lines.push('## Item-Level Coverage')
    lines.push('')
    nc3Results.forEach(cat => {
      const pct = cat.max_score > 0 ? Math.round((cat.score / cat.max_score) * 100) : 0
      lines.push(`### ${cat.category_name} — ${pct}%`)
      lines.push(`Passed: ${cat.items_passed} | Partial: ${cat.items_partial || 0} | Failed: ${cat.items_failed}`)
      ;(cat.findings || []).filter(f => f.status === 'FAIL').slice(0, 3).forEach(f => {
        lines.push(`- ❌ **${f.item_id}**: ${f.gap || 'No evidence found'}`)
      })
      lines.push('')
    })
  }

  if (consistency_warnings.length) {
    lines.push('## Consistency Warnings')
    lines.push('')
    consistency_warnings.forEach((w, i) => {
      const text = typeof w === 'string' ? w : (w.description || w.warning || '')
      lines.push(`${i + 1}. ${text}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function DownloadButtons({ onJson, onMarkdown }) {
  return (
    <div className="ml-auto flex items-center gap-1">
      <button onClick={onJson} title="Download JSON"
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors">
        <FileJson size={12} /> JSON
      </button>
      <button onClick={onMarkdown} title="Download Markdown"
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors">
        <FileType size={12} /> MD
      </button>
    </div>
  )
}

// ── NC4 Results block (shown in the "main" slot when complete) ────────────────

function Nc4Results({ adapted, nc4Raw, nc3Results, nc2Output, onDownloadJson, onDownloadMarkdown }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-1 border-b border-teal-900">
        <CheckSquare size={14} className="text-teal-400" />
        <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
          Custom Checklist Review — NC4 Final Report
        </span>
        {onDownloadJson && <DownloadButtons onJson={onDownloadJson} onMarkdown={onDownloadMarkdown} />}
      </div>

      {/* Verdict Banner */}
      <VerdictBanner
        overallScore={adapted.overall_score}
        verdict={adapted.verdict}
        agent1Score={adapted.agent1_score}
        agent2Score={adapted.agent2_score}
        agent3Score={adapted.agent3_score}
        weightLabel={adapted.weight_label}
        weightAdjusted={adapted.weight_adjusted}
        weightReason={adapted.weight_reason}
      />

      {/* Plain-English Summary */}
      {adapted.plain_english_summary && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Executive Briefing</h3>
          <p className="text-sm text-gray-200 leading-relaxed">{adapted.plain_english_summary}</p>
        </div>
      )}

      {/* NC2 metadata */}
      {(nc4Raw.nc2_scoring_type || nc4Raw.nc2_weights_source) && (
        <div className="flex flex-wrap gap-2">
          {nc4Raw.nc2_scoring_type && (
            <span className="px-2.5 py-1 text-xs rounded-full bg-teal-950 text-teal-300 border border-teal-800">
              Scoring: {nc4Raw.nc2_scoring_type}
            </span>
          )}
          {nc4Raw.nc2_weights_source && (
            <span className="px-2.5 py-1 text-xs rounded-full bg-blue-950 text-blue-300 border border-blue-800">
              Weights: {nc4Raw.nc2_weights_source}
            </span>
          )}
          {nc4Raw.nc1_confidence && (
            <span className="px-2.5 py-1 text-xs rounded-full bg-gray-800 text-gray-400 border border-gray-700">
              NC1 Confidence: {Math.round(nc4Raw.nc1_confidence * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Top Strengths */}
      {adapted.top_3_strengths?.length > 0 && (
        <TopStrengths strengths={adapted.top_3_strengths} />
      )}

      {/* Double Flagged */}
      <DoubleFlaggedIssues issues={adapted.double_flagged_issues} />

      {/* Priority Actions — internal tab hidden (no internal hygiene items in custom pipeline) */}
      <PriorityActionList priorityActions={adapted.priority_actions} hideTiers={['internal']} />

      {/* Score Radar */}
      <ScoreRadar sectionScorecard={adapted.section_scorecard} />

      {/* Cross Consistency */}
      <CrossConsistencyPanel issues={adapted.cross_consistency_issues} />

      {/* Full Coverage Grid — tabbed by category, mirrors FullChecklistGrid layout */}
      {nc3Results?.length > 0 && (
        <CustomChecklistGrid nc3Results={nc3Results} nc2Output={nc2Output} />
      )}
    </div>
  )
}

// ── Pipeline progress ─────────────────────────────────────────────────────────

const POLLING_STATUSES = new Set(['uploading', 'pipeline_running'])

function PipelineProgressScreen({ status, onStop, stopping, sessionId }) {
  const isRunning = POLLING_STATUSES.has(status)
  const { agentActivities, isConnected, isDone, error } = useActivityFeed(sessionId, isRunning)

  const statusPhase = status === 'uploading'
    ? 'NC1 + NC2 pre-flight running…'
    : 'NC3 fan-out + NC4 synthesis running…'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{statusPhase}</p>
        <button onClick={onStop} disabled={stopping}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-800/60 text-red-300 hover:text-white hover:border-red-600 hover:bg-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {stopping ? <Loader2 size={11} className="animate-spin" /> : <Square size={11} />}
          {stopping ? 'Stopping…' : 'Stop Analysis'}
        </button>
      </div>

      <ActivityFeed agentActivities={agentActivities} isConnected={isConnected} isDone={isDone} error={error} customMode />

      {/* NC4 synthesis panel — accurate state based on whether NC4 has actually started */}
      {(() => {
        // NC4 emits events under the "nc4" channel. Only show it as actively running
        // once real NC4 events arrive — before that it's still waiting for NCR1/2/3 + NC3.
        const nc4Started = Boolean(agentActivities['nc4']?.length)
        return (
          <div className={clsx(
            'bg-gray-900 border rounded-xl p-4 transition-all duration-500',
            nc4Started ? 'border-teal-800' : 'border-gray-800'
          )}>
            <div className="flex items-center gap-3">
              <div className={clsx('p-2 rounded-lg', nc4Started ? 'bg-teal-950' : 'bg-gray-800')}>
                {nc4Started
                  ? <Loader2 size={16} className="text-teal-400 animate-spin" />
                  : <CheckSquare size={16} className="text-gray-600" />}
              </div>
              <div>
                <p className={clsx('text-sm font-semibold', nc4Started ? 'text-teal-300' : 'text-gray-500')}>
                  NC4 — Synthesis &amp; Report
                </p>
                <p className="text-xs text-gray-500">
                  {nc4Started
                    ? 'Aggregating category scores and generating final verdict…'
                    : 'Waiting for specialist reviews to complete…'}
                </p>
              </div>
            </div>
          </div>
        )
      })()}

      <p className="text-xs text-gray-600 text-center">
        Custom evaluation typically takes 60–120 seconds. Page updates automatically.
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3000

export default function CustomResultsPage() {
  const { sessionId }  = useParams()
  const navigate       = useNavigate()
  const { sendNotification } = useNotifications()

  const [session,            setSession]            = useState(null)
  const [loading,            setLoading]            = useState(true)
  const [error,              setError]              = useState('')
  const [downloading,        setDownloading]        = useState(false)
  const [downloadingSource,  setDownloadingSource]  = useState(false)
  const [reAnalysing,        setReAnalysing]        = useState(false)
  const [cancellingAnalysis, setCancellingAnalysis] = useState(false)
  const [activeView,         setActiveView]         = useState('executive')
  const [history,            setHistory]            = useState([])
  const [sidebarMode,        setSidebarMode]        = useState('report')
  const [sidebarOpen,        setSidebarOpen]        = useState(window.innerWidth >= 768)
  const [showDownloadMenu,   setShowDownloadMenu]   = useState(false)
  const [downloadMenuPos,    setDownloadMenuPos]    = useState({ top: 0, right: 0 })
  const [chatOpen,           setChatOpen]           = useState(false)

  const downloadMenuRef     = useRef(null)
  const downloadBtnRef      = useRef(null)
  const downloadDropdownRef = useRef(null)
  const pollRef             = useRef(null)
  const wasPollingRef       = useRef(false)

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  const fetchSession = async () => {
    try {
      const data = await getSession(sessionId)
      setSession(data)
      if (!POLLING_STATUSES.has(data.status)) stopPolling()
    } catch (err) {
      setError(err.message)
      stopPolling()
    }
  }

  useEffect(() => {
    fetchSession().finally(() => setLoading(false))
    return stopPolling
  }, [sessionId])

  useEffect(() => {
    if (!session) return
    if (POLLING_STATUSES.has(session.status)) {
      if (!pollRef.current) pollRef.current = setInterval(fetchSession, POLL_INTERVAL_MS)
    } else {
      stopPolling()
    }
  }, [session?.status])

  useEffect(() => {
    if (session?.status === 'complete') {
      getSessionHistory(sessionId)
        .then(d => setHistory(d.versions || []))
        .catch(() => {})
    }
  }, [session?.status, sessionId])

  useEffect(() => {
    if (POLLING_STATUSES.has(session?.status)) wasPollingRef.current = true
  }, [session?.status])

  useEffect(() => {
    if (session?.status === 'complete' && wasPollingRef.current) {
      wasPollingRef.current = false
      sendNotification(
        session.original_filename ? `Custom review complete — ${session.original_filename}` : 'Custom checklist review complete',
        'Your scored report is ready. Click to view.'
      )
    }
  }, [session?.status])

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

  const handleDownloadSource = async () => {
    setDownloadingSource(true)
    try {
      const { download_url, filename } = await getSourceFileUrl(sessionId)
      const a = Object.assign(document.createElement('a'), {
        href: download_url, download: filename, target: '_blank', rel: 'noreferrer'
      })
      a.click()
    } catch (err) {
      alert('Could not get file download link: ' + err.message)
    } finally {
      setDownloadingSource(false)
    }
  }

  const handleCancelAnalysis = async () => {
    setCancellingAnalysis(true)
    try { await cancelCustomAnalysis(sessionId) } catch {}
    await fetchSession()
    setCancellingAnalysis(false)
  }

  const handleReAnalyse = async () => {
    setReAnalysing(true)
    try {
      await reRunCustom(sessionId)
      await fetchSession()
    } catch (err) {
      setError(err.message)
    } finally {
      setReAnalysing(false)
    }
  }

  const handleDeleteVersion = async (targetSessionId) => {
    try {
      await deleteSession(targetSessionId)
      if (targetSessionId === sessionId) { navigate('/'); return }
      getSessionHistory(sessionId).then(d => setHistory(d.versions || [])).catch(() => {})
    } catch (err) {
      alert('Could not delete: ' + err.message)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const nc4Raw    = session?.agent4_output || null
  const nc3Results = session?.agent3_output || []
  const nc2Output  = session?.agent2_output || {}
  const nc1Output  = session?.agent1_output || {}

  // Adapted output — compatible with all existing view components
  const adapted = adaptNc4ToAgent4(nc4Raw, nc3Results, nc2Output, nc1Output)

  const slug = sessionId?.slice(0, 8) || 'report'
  const sessionMeta = session ? {
    filename:     session.original_filename,
    proposalType: nc1Output?.auto_detected?.proposal_type || session.proposal_type,
    industry:     nc1Output?.auto_detected?.client_industry || session.client_industry,
    priorities:   nc1Output?.auto_detected?.client_priorities || session.client_priorities,
    date:         session.created_at ? new Date(session.created_at).toLocaleDateString('en-IN') : '',
  } : {}

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <Navbar />
        <div className="flex flex-1">
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
                </div>
              </div>
            ))}
          </aside>
          <main className="flex-1 px-6 py-8 space-y-4">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-gray-800 animate-shimmer" />
              <div className="h-6 w-72 rounded bg-gray-800/80 animate-shimmer" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="h-3 w-28 rounded bg-gray-800 animate-shimmer" />
              {[1,2,3,4].map(i => (
                <div key={i} className="h-4 w-24 rounded bg-gray-800/70 animate-shimmer" />
              ))}
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

  const isComplete = session.status === 'complete' && nc4Raw
  const isPolling  = POLLING_STATUSES.has(session.status)

  // Enrich session for views that consume session.agent1/2/3_output
  const enrichedSession = {
    ...session,
    agent1_output: nc1Output,
    agent2_output: nc2Output,
    agent3_output: nc3Results,
    agent4_output: adapted,  // adapted output for ComparisonView
  }

  // ── View switcher config ──────────────────────────────────────────────────────
  const currentIdx  = history.findIndex(v => v.id === sessionId)
  const prevVersion = currentIdx > 0 ? history[currentIdx - 1] : null
  const hasComparison = Boolean(prevVersion?.agent4_output)

  const VIEW_DOWNLOAD_META_CUSTOM = {
    executive:    { label: 'Executive View',    formats: ['pdf', 'md', 'json'], defaultFormat: 'pdf' },
    dashboard:    { label: 'Dashboard View',    formats: ['pdf', 'md', 'json'], defaultFormat: 'pdf' },
    indepth:      { label: 'In-Depth View',     formats: ['pdf', 'md', 'json'], defaultFormat: 'pdf' },
    storyboard:   { label: 'Storyboard View',   formats: ['pdf', 'md', 'json'], defaultFormat: 'pdf' },
    actionplan:   { label: 'Action Plan View',  formats: ['md', 'json'],        defaultFormat: 'md'  },
    presentation: { label: 'Presentation View', formats: ['pdf'],               defaultFormat: 'pdf' },
    comparison:   { label: 'Comparison View',   formats: ['pdf'],               defaultFormat: 'pdf' },
    compare_all:  { label: 'Compare All',        formats: ['pdf'],               defaultFormat: 'pdf' },
  }

  const handleCustomDownload = ({ format }) => {
    if (format === 'json') {
      downloadJson(nc4Raw, `nc4_verdict_${slug}.json`)
    } else if (format === 'md') {
      downloadMarkdown(
        nc4ToMarkdown(nc4Raw, sessionMeta, nc2Output, nc3Results),
        `nc4_verdict_${slug}.md`
      )
    } else {
      // PDF — use downloadCurrentView which opens a printable tab
      try {
        downloadCurrentView({
          activeView:  sidebarMode === 'compare_all' ? 'compare_all' : activeView,
          sidebarMode,
          output:      adapted,
          session:     enrichedSession,
          history,
          prevSession: prevVersion,
          format,
        })
      } catch {
        window.print()
      }
    }
  }

  const viewKey  = sidebarMode === 'compare_all' ? 'compare_all' : activeView
  const meta     = VIEW_DOWNLOAD_META_CUSTOM[viewKey] || VIEW_DOWNLOAD_META_CUSTOM.executive
  const defFmt   = meta.defaultFormat || 'pdf'
  const fmtInfo  = FORMAT_LABELS?.[defFmt] || { label: defFmt.toUpperCase(), icon: '📄', hint: '' }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left sidebar */}
        <aside className={clsx(
          'flex-shrink-0 border-r border-gray-800 bg-gray-950 transition-all duration-300 overflow-hidden',
          'fixed md:sticky z-40 md:z-auto top-[60px] md:top-[64px] left-0 h-[calc(100vh-60px)] md:h-[calc(100vh-64px)]',
          sidebarOpen ? 'w-72 md:w-64' : 'w-0',
        )} style={{ overflowY: 'auto' }}>
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

        {/* Main content */}
        <main
          className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 transition-all duration-300"
          style={{ paddingRight: chatOpen ? 'clamp(0px, 29vw, 428px)' : undefined }}
        >

          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="fixed z-30 w-5 h-12 bg-gray-800 border border-gray-700 border-l-0 rounded-r-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-all duration-300"
            style={{ left: sidebarOpen ? 256 : 0, top: '50%', transform: 'translateY(-50%)' }}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <span className="text-[10px]">{sidebarOpen ? '‹' : '›'}</span>
          </button>

          {/* ── Page header ──────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5"
            style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
            <div>
              <Link to="/"
                className="group inline-flex items-center gap-1.5 mb-2.5 text-xs font-medium text-gray-500 hover:text-white px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-600 hover:bg-gray-800 transition-all duration-200">
                <Home size={11} className="group-hover:text-teal-400 transition-colors" /> Home
              </Link>
              <div className="flex items-center gap-2 flex-wrap">
                <CheckSquare size={18} className="text-teal-400 flex-shrink-0" />
                <h1 className="text-lg font-semibold text-white truncate max-w-sm">
                  {session.original_filename || 'Custom Checklist Review'}
                </h1>
                <StatusBadge status={session.status} />
                <span className="text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded-full">
                  Custom
                </span>
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
                <button onClick={handleDownloadSource} disabled={downloadingSource}
                  title={`Download ${session.original_filename || 'original file'}`}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 disabled:opacity-50 transition-all">
                  {downloadingSource ? <Loader2 size={10} className="animate-spin" /> : <FileDown size={10} />}
                  {downloadingSource ? 'Getting link…' : `Download ${(session.file_type || 'file').toUpperCase()}`}
                </button>
              </div>
            </div>

            {/* Action buttons — only when complete */}
            {isComplete && (() => {
              return (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Re-analyse */}
                  <button onClick={handleReAnalyse} disabled={reAnalysing}
                    title="Clear results and re-run the full custom pipeline"
                    className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {reAnalysing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    <span className="hidden sm:inline">{reAnalysing ? 'Starting…' : 'Re-analyse'}</span>
                  </button>

                  {/* Chat toggle */}
                  <ChatToggleButton onClick={() => setChatOpen(o => !o)} active={chatOpen} />

                  {/* Split download button */}
                  <div className="relative" ref={downloadMenuRef}>
                    <div className="flex items-stretch rounded-lg border border-teal-700/60"
                      style={{ boxShadow: '0 0 14px rgba(20,184,166,0.2)' }}>
                      <button
                        onClick={() => { setShowDownloadMenu(false); handleCustomDownload({ format: defFmt }) }}
                        className="flex items-center gap-2 text-sm font-medium px-3.5 py-2 text-white transition-all"
                        style={{ background: 'linear-gradient(135deg,#0d9488,#0e7490)' }}
                        title={defFmt === 'pdf' ? 'Opens print dialog — Save as PDF' : `Download as ${defFmt.toUpperCase()}`}>
                        <Download size={13} />
                        <span>{fmtInfo.label}</span>
                        <span className="text-[9px] opacity-55 font-mono hidden sm:inline">({meta.label})</span>
                      </button>
                      <button ref={downloadBtnRef}
                        onClick={() => {
                          if (!showDownloadMenu && downloadBtnRef.current) {
                            const rect = downloadBtnRef.current.getBoundingClientRect()
                            const DROPDOWN_W = 208
                            const rawRight = window.innerWidth - rect.right
                            setDownloadMenuPos({ top: rect.bottom + 6, right: Math.max(8, Math.min(rawRight, window.innerWidth - DROPDOWN_W - 8)) })
                          }
                          setShowDownloadMenu(v => !v)
                        }}
                        className="flex items-center justify-center w-8 text-white/70 hover:text-white border-l border-teal-700/50 transition-colors"
                        style={{ background: 'linear-gradient(135deg,#0f766e,#155e75)' }}
                        title="More formats">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
                      </button>
                    </div>

                    {/* Format dropdown */}
                    {showDownloadMenu && createPortal(
                      <div ref={downloadDropdownRef}
                        className="fixed bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
                        style={{ top: downloadMenuPos.top, right: downloadMenuPos.right, width: Math.min(208, window.innerWidth - 16), zIndex: 9999, animation: 'slide-up-fade 0.18s cubic-bezier(0.16,1,0.3,1) both' }}>
                        <div className="px-3 py-2 border-b border-gray-800">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Download Format</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{meta.label}</p>
                        </div>
                        {meta.formats.map(fmt => {
                          const info   = FORMAT_LABELS?.[fmt] || { label: fmt.toUpperCase(), icon: '📄', hint: '' }
                          const isCurr = fmt === defFmt
                          return (
                            <button key={fmt}
                              onClick={() => { setShowDownloadMenu(false); handleCustomDownload({ format: fmt }) }}
                              className={clsx(
                                'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                                isCurr ? 'bg-teal-950/50 text-teal-300' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                              )}>
                              <span className="text-base leading-none w-5 text-center">{info.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs">{info.label}</div>
                                <div className="text-[10px] text-gray-400">{info.hint}</div>
                              </div>
                              {isCurr && <span className="text-[9px] text-teal-500 font-mono">default</span>}
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

          {/* ── Session metadata ─────────────────────────────────────────────── */}
          <div className={clsx(
            'bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5 transition-all duration-300',
            sidebarMode === 'compare_all' && 'hidden'
          )} style={{ animation: 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) 0.06s both' }}>
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Session Details — NC1 Auto-Detected</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              {[
                { label: 'Client',        value: nc1Output?.auto_detected?.client_name },
                { label: 'Project',       value: nc1Output?.auto_detected?.project_name },
                { label: 'Proposal Type', value: nc1Output?.auto_detected?.proposal_type },
                { label: 'Industries',    value: (nc1Output?.auto_detected?.client_industry || []).join(', ') || '—' },
                { label: 'Timeline',      value: nc1Output?.auto_detected?.proposed_timeline },
                { label: 'Budget',        value: nc1Output?.auto_detected?.budget_range },
                { label: 'Team Size',     value: nc1Output?.auto_detected?.team_size ? `${nc1Output.auto_detected.team_size} people` : null },
                {
                  label: nc1Output?.user_confirmed ? 'Context' : 'NC1 Confidence',
                  value: nc1Output?.user_confirmed
                    ? `User-confirmed (was ${Math.round((nc1Output.original_confidence || nc1Output.confidence || 0) * 100)}%)`
                    : nc1Output?.confidence != null
                    ? `${Math.round(nc1Output.confidence * 100)}%`
                    : null,
                },
                { label: 'Checklist Items', value: nc2Output?.total_items ? `${nc2Output.total_items} items` : null },
                { label: 'Categories',    value: nc2Output?.categories?.length ? `${nc2Output.categories.length} categories` : null },
                { label: 'File Type',     value: session.file_type?.toUpperCase() },
                { label: 'Pages',         value: session.page_count ?? null },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label}>
                  <span className="text-gray-500 text-xs">{label}</span>
                  <p className="text-white mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Analysis section ─────────────────────────────────────────────── */}
          <div key={`${session.status}-${sidebarMode}`} className="space-y-4"
            style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) 0.12s both' }}>

            {/* Running */}
            {isPolling && (
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
                <p className="text-xs text-gray-400 mb-4">You stopped this analysis. Re-run to see results.</p>
                <button onClick={handleReAnalyse} disabled={reAnalysing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                  {reAnalysing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Re-run Analysis
                </button>
              </div>
            )}

            {/* Failed */}
            {session.status === 'pipeline_failed' && (
              <div className="bg-red-950 border border-red-800 rounded-xl p-6 text-center">
                <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-white mb-1">Analysis failed</p>
                <p className="text-xs text-red-300 mb-4">One or more agents encountered an error.</p>
                <button onClick={handleReAnalyse} disabled={reAnalysing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                  {reAnalysing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Retry Analysis
                </button>
              </div>
            )}

            {/* ── Complete — multi-view report ──────────────────────────────── */}
            {isComplete && sidebarMode === 'report' && (
              <div>
                {/* View switcher — exact same structure as ResultsPage */}
                <div className="mb-5 animate-fade-in space-y-1.5">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>

                    {/* Analysis Views group */}
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
                              className={clsx(
                                'flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 text-xs font-medium transition-all duration-150 border-r border-gray-800 last:border-0 whitespace-nowrap',
                                isActive ? active : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40'
                              )}>
                              <Icon size={13} /><span className="hidden xs:inline sm:inline">{label}</span>
                              {isActive && <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Working Views group */}
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
                              className={clsx(
                                'flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 text-xs font-medium transition-all duration-150 border-r border-gray-800 last:border-0 whitespace-nowrap',
                                isActive ? active : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40',
                                key === 'comparison' && !isActive && 'border border-dashed border-violet-900/40'
                              )}>
                              <Icon size={13} /><span className="hidden xs:inline sm:inline">{label}</span>
                              {isActive && <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Export group */}
                    <div className="flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
                      <div className="px-3 py-1.5 border-b border-gray-800">
                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest whitespace-nowrap">Export</span>
                      </div>
                      <div className="flex flex-1 items-center gap-1 px-2">
                        <button onClick={() => downloadJson(nc4Raw, `nc4_${slug}.json`)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors whitespace-nowrap">
                          <FileJson size={11} /> JSON
                        </button>
                        <button onClick={() => downloadMarkdown(nc4ToMarkdown(nc4Raw, sessionMeta, nc2Output, nc3Results), `nc4_${slug}.md`)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors whitespace-nowrap">
                          <FileType size={11} /> MD
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active view */}
                {(() => {
                  const prevSession = prevVersion
                  const prevAdapted = prevSession?.agent4_output
                    ? adaptNc4ToAgent4(prevSession.agent4_output, [], {}, {})
                    : prevSession?.agent4_output
                  const prevEnriched = prevSession ? { ...prevSession, agent4_output: prevAdapted } : null

                  return (
                    <div key={activeView} style={{ animation: 'slide-up-fade 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
                      {activeView === 'executive' && (
                        <ExecutiveView output={adapted} session={enrichedSession} />
                      )}
                      {activeView === 'dashboard' && (
                        <CustomDashboardView output={adapted} session={enrichedSession} />
                      )}
                      {activeView === 'indepth' && (
                        <CustomInDepthView output={nc4Raw} session={enrichedSession} />
                      )}
                      {activeView === 'storyboard' && (
                        <CustomStoryboardView output={nc4Raw} session={enrichedSession} />
                      )}
                      {activeView === 'actionplan' && (
                        <ActionPlanView output={adapted} session={enrichedSession} />
                      )}
                      {activeView === 'presentation' && (
                        <PresentationView output={adapted} session={enrichedSession} />
                      )}
                      {activeView === 'comparison' && prevSession && (
                        <ComparisonView
                          currentSession={{ ...enrichedSession, agent4_output: adapted }}
                          prevSession={prevEnriched || prevSession}
                        />
                      )}
                    </div>
                  )
                })()}

                {/* Upload revision panel */}
                <div id="upload-revision-panel">
                  <UploadRevisionPanel
                    sessionId={sessionId}
                    versionNumber={session.version_number || history.length || 1}
                    parentFilename={session.original_filename}
                    reviewMode="custom"
                  />
                </div>
              </div>
            )}

            {/* Comparison dashboard */}
            {sidebarMode === 'compare_all' && (
              <div key="compare_all" style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
                <ComparisonDashboard versions={history} />
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Chat Panel */}
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
