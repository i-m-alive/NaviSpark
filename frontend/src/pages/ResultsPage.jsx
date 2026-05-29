import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSession, getReportUrl, runAgent1, runAgent2 } from '../api/client'
import Navbar from '../components/Navbar'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import Agent1ScoreCard from '../components/agent1/Agent1ScoreCard'
import ChecklistTable from '../components/agent1/ChecklistTable'
import WritingIssues from '../components/agent1/WritingIssues'
import ScopeIssues from '../components/agent1/ScopeIssues'
import IndustryGaps from '../components/agent1/IndustryGaps'
import JargonFlags from '../components/agent1/JargonFlags'
import RewriteSuggestion from '../components/agent1/RewriteSuggestion'
import { FileText, Clock, Download, ArrowLeft, Cpu, Play, Loader2 } from 'lucide-react'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function AgentPlaceholder({ agentNum, label }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-gray-800 rounded-lg">
          <Cpu size={15} className="text-gray-500" />
        </div>
        <span className="text-sm font-medium text-gray-400">Agent {agentNum}: {label}</span>
        <span className="ml-auto text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">Pending</span>
      </div>
      <p className="text-xs text-gray-600 italic">
        Analysis will appear here once previous agents have completed.
      </p>
    </div>
  )
}

function SeverityPill({ severity }) {
  const colours = {
    CRITICAL: 'bg-red-900 text-red-300 border-red-700',
    MAJOR: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    MINOR: 'bg-blue-900 text-blue-300 border-blue-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colours[severity] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {severity}
    </span>
  )
}

function ScoreBar({ label, score }) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100))
  const colour = score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-44 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white w-8 text-right">{score?.toFixed(1)}</span>
    </div>
  )
}

function Agent2Results({ output }) {
  const a2 = output
  const scores = a2.scores || {}
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-1 border-b border-gray-800">
        <Cpu size={14} className="text-purple-400" />
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
          Agent 2 — Estimation & Commercial Integrity
        </span>
      </div>

      {/* Score Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Score Card</h3>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{scores.overall?.toFixed(1)}</p>
            <p className="text-xs text-gray-500">/ 10</p>
          </div>
        </div>
        <div className="space-y-2.5">
          <ScoreBar label="Estimation Rigour (30%)" score={scores.estimation_rigour} />
          <ScoreBar label="Phase Coverage (30%)" score={scores.phase_coverage} />
          <ScoreBar label="Pricing Completeness (20%)" score={scores.pricing_completeness} />
          <ScoreBar label="Commercial Model Fit (10%)" score={scores.commercial_model_fit} />
          <ScoreBar label="Arithmetic Accuracy (10%)" score={scores.arithmetic_accuracy} />
        </div>
      </div>

      {/* Commercial Model Assessment */}
      {a2.commercial_model_assessment && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Commercial Model</h3>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-white font-medium">{a2.commercial_model_assessment.model_stated}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${a2.commercial_model_assessment.appropriate_for_scope ? 'bg-green-900 text-green-300 border-green-700' : 'bg-red-900 text-red-300 border-red-700'}`}>
              {a2.commercial_model_assessment.appropriate_for_scope ? 'Appropriate' : 'Mismatched'}
            </span>
          </div>
          {a2.commercial_model_assessment.concerns?.length > 0 && (
            <ul className="space-y-1.5">
              {a2.commercial_model_assessment.concerns.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                  <span className="text-yellow-500 mt-0.5 shrink-0">▸</span>{c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Missing Phases */}
      {a2.missing_phases?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Missing / Uncosted Phases ({a2.missing_phases.length})
          </h3>
          <div className="space-y-2">
            {a2.missing_phases.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-mono w-8">{p.gsk_item}</span>
                  <span className="text-xs text-gray-200">{p.phase}</span>
                </div>
                <SeverityPill severity={p.severity} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estimation Issues */}
      {a2.estimation_issues?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Estimation Issues ({a2.estimation_issues.length})
          </h3>
          <div className="space-y-3">
            {a2.estimation_issues.map((issue, i) => (
              <div key={i} className="border border-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <SeverityPill severity={issue.severity} />
                  <span className="text-xs text-gray-500 font-mono">{issue.gsk_item}</span>
                  <span className="text-xs text-gray-600">Skill {issue.skill}</span>
                </div>
                <p className="text-xs text-gray-300 mb-1.5">{issue.issue}</p>
                {issue.recommendation && (
                  <p className="text-xs text-blue-400 italic">→ {issue.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Issues */}
      {a2.pricing_issues?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Pricing Issues ({a2.pricing_issues.length})
          </h3>
          <div className="space-y-3">
            {a2.pricing_issues.map((issue, i) => (
              <div key={i} className="border border-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <SeverityPill severity={issue.severity} />
                  <span className="text-xs text-gray-500 font-mono">{issue.gsk_item}</span>
                  <span className="text-xs text-gray-600">Skill {issue.skill}</span>
                </div>
                <p className="text-xs text-gray-300 mb-1.5">{issue.issue}</p>
                {issue.recommendation && (
                  <p className="text-xs text-blue-400 italic">→ {issue.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arithmetic Flags */}
      {a2.arithmetic_flags?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Arithmetic Checks ({a2.arithmetic_flags.length})
          </h3>
          <div className="space-y-2">
            {a2.arithmetic_flags.map((flag, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-800 last:border-0">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{flag.check}</p>
                  <p className="text-xs text-gray-200">{flag.finding}</p>
                </div>
                <SeverityPill severity={flag.severity} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResultsPage() {
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [runningAgent1, setRunningAgent1] = useState(false)
  const [agent1Error, setAgent1Error] = useState('')
  const [runningAgent2, setRunningAgent2] = useState(false)
  const [agent2Error, setAgent2Error] = useState('')

  useEffect(() => {
    getSession(sessionId)
      .then(data => setSession(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

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

  const handleRunAgent1 = async () => {
    setRunningAgent1(true)
    setAgent1Error('')
    try {
      const result = await runAgent1(sessionId)
      setSession(prev => ({
        ...prev,
        agent1_output: result.agent1_output,
        status: 'agent1_complete',
      }))
    } catch (err) {
      setAgent1Error(err.message)
    } finally {
      setRunningAgent1(false)
    }
  }

  const handleRunAgent2 = async () => {
    setRunningAgent2(true)
    setAgent2Error('')
    try {
      const result = await runAgent2(sessionId)
      setSession(prev => ({
        ...prev,
        agent2_output: result.agent2_output,
        status: 'agent2_complete',
      }))
    } catch (err) {
      setAgent2Error(err.message)
    } finally {
      setRunningAgent2(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-red-400">{error || 'Session not found.'}</p>
          <Link to="/dashboard" className="btn-secondary mt-4 inline-flex items-center gap-2 text-sm">
            <ArrowLeft size={15} /> Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const a1 = session.agent1_output

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link to="/dashboard" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-2 transition-colors">
              <ArrowLeft size={12} /> Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-blue-400" />
              <h1 className="text-lg font-semibold text-white truncate max-w-md">
                {session.original_filename || 'Untitled Document'}
              </h1>
              <StatusBadge status={session.status} />
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Clock size={11} /> {formatDate(session.created_at)}
            </p>
          </div>

          {session.status === 'complete' && session.report_storage_path && (
            <button onClick={handleDownload} disabled={downloading} className="btn-secondary flex items-center gap-2 text-sm">
              <Download size={14} />
              {downloading ? 'Loading...' : 'Download Report'}
            </button>
          )}
        </div>

        {/* Session metadata */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
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

        {/* Analysis Results */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-gray-400">Analysis Results</h2>

          {/* Agent 1 */}
          {a1 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-800">
                <Cpu size={14} className="text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Agent 1 — Completeness & Clarity
                </span>
              </div>

              <Agent1ScoreCard scores={a1.scores} />
              <ChecklistTable sectionAudit={a1.section_audit} />
              <WritingIssues issues={a1.writing_issues} />
              <ScopeIssues scopeIssues={a1.scope_clarity_issues} highRiskAssumptions={a1.high_risk_assumptions} />
              <IndustryGaps gaps={a1.client_specific_gaps} />
              {a1.jargon_flags?.length > 0 && <JargonFlags flags={a1.jargon_flags} />}
              {a1.rewrite && <RewriteSuggestion rewrite={a1.rewrite} />}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-950 rounded-lg">
                  <Cpu size={16} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Agent 1 — Completeness & Clarity</p>
                  <p className="text-xs text-gray-500">Audits 22 checklist items, writing quality, scope clarity, and more</p>
                </div>
              </div>

              {agent1Error && (
                <div className="mb-4 px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-xs text-red-300">
                  {agent1Error}
                </div>
              )}

              <button
                onClick={handleRunAgent1}
                disabled={runningAgent1}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {runningAgent1 ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Analysing proposal… (10–20s)
                  </>
                ) : (
                  <>
                    <Play size={15} />
                    Run Agent 1 Analysis
                  </>
                )}
              </button>

              {runningAgent1 && (
                <p className="text-xs text-gray-500 mt-3">
                  Sending proposal to AWS Bedrock Claude Sonnet 4. Please wait…
                </p>
              )}
            </div>
          )}

          {/* Agent 2 */}
          {session.agent2_output ? (
            <Agent2Results output={session.agent2_output} />
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-950 rounded-lg">
                  <Cpu size={16} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Agent 2 — Estimation & Commercial Integrity</p>
                  <p className="text-xs text-gray-500">Checks 24 estimation items, 17 phases, pricing completeness, arithmetic, and commercial model fit</p>
                </div>
              </div>

              {agent2Error && (
                <div className="mb-4 px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-xs text-red-300">
                  {agent2Error}
                </div>
              )}

              <button
                onClick={handleRunAgent2}
                disabled={runningAgent2}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {runningAgent2 ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Analysing proposal… (10–20s)
                  </>
                ) : (
                  <>
                    <Play size={15} />
                    Run Agent 2 Analysis
                  </>
                )}
              </button>

              {runningAgent2 && (
                <p className="text-xs text-gray-500 mt-3">
                  Sending proposal to AWS Bedrock Claude Sonnet 4. Please wait…
                </p>
              )}
            </div>
          )}

          {/* Agent 3 placeholder */}
          {session.agent3_output ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-teal-400 mb-2">Agent 3 — Competitive Analysis</h3>
              <pre className="text-xs text-gray-300 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(session.agent3_output, null, 2)}
              </pre>
            </div>
          ) : (
            <AgentPlaceholder agentNum={3} label="Competitive Positioning" />
          )}

          {/* Agent 4 placeholder */}
          {session.agent4_output ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-green-400 mb-2">Agent 4 — Final Verdict</h3>
              {session.agent4_output.verdict && (
                <div className="mb-3">
                  <span className={`text-sm font-bold px-3 py-1.5 rounded-full border
                    ${session.agent4_output.verdict === 'READY TO SEND'
                      ? 'bg-green-900 text-green-300 border-green-700'
                      : session.agent4_output.verdict === 'REVISE BEFORE SENDING'
                      ? 'bg-yellow-900 text-yellow-300 border-yellow-700'
                      : 'bg-red-900 text-red-300 border-red-700'
                    }`}>
                    {session.agent4_output.verdict}
                  </span>
                </div>
              )}
              <pre className="text-xs text-gray-300 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(session.agent4_output, null, 2)}
              </pre>
            </div>
          ) : (
            <AgentPlaceholder agentNum={4} label="Final Verdict & Report" />
          )}
        </div>
      </main>
    </div>
  )
}
