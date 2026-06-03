/**
 * CustomDashboardView — Dashboard view for the Custom Checklist Pipeline.
 *
 * Uses the same agent4 sub-components as the standard DashboardView
 * (VerdictBanner, ScoreRadar, PriorityActionList, CrossConsistencyPanel,
 * DoubleFlaggedIssues, TopStrengths) but replaces FullChecklistGrid with
 * CustomChecklistGrid so the category-based checklist data displays correctly.
 */

import { clsx } from 'clsx'
import {
  CheckCircle2, XCircle, Minus, AlertTriangle, BarChart3, Layers,
} from 'lucide-react'
import VerdictBanner        from '../../agent4/VerdictBanner'
import ScoreRadar           from '../../agent4/ScoreRadar'
import PriorityActionList   from '../../agent4/PriorityActionList'
import CrossConsistencyPanel from '../../agent4/CrossConsistencyPanel'
import DoubleFlaggedIssues  from '../../agent4/DoubleFlaggedIssues'
import TopStrengths         from '../../agent4/TopStrengths'
import CustomChecklistGrid  from '../CustomChecklistGrid'

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-2xl font-bold mb-0.5" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function scoreColor(s) {
  if (s >= 7) return '#34d399'
  if (s >= 5) return '#fbbf24'
  return '#f87171'
}

export default function CustomDashboardView({ output, session }) {
  if (!output) return null

  // output is the adapted NC4 output from adaptNc4ToAgent4()
  const {
    overall_score  = 0,
    verdict        = '',
    section_scorecard = {},
    category_scores   = {},
    priority_actions  = {},
    cross_consistency_issues = [],
    double_flagged_issues    = [],
    top_3_strengths          = [],
    checklist_coverage: coverage = [],
    error_categories           = [],
    agent1_score, agent2_score, agent3_score,
    weight_label, weight_adjusted, weight_reason,
  } = output

  const nc3Results = session?.agent3_output || []
  const nc2Output  = session?.agent2_output || {}

  const { must_fix = [], should_fix = [], next_time = [] } = priority_actions

  // Coverage stats — prefer the raw NC4 dict (via adapter's _nc4 passthrough);
  // fall back to counting from the adapted array.
  const rawCoverage  = output?._nc4?.checklist_coverage || {}
  const covArr       = coverage || []
  const totalItems   = rawCoverage.total_items != null ? rawCoverage.total_items : covArr.length
  const passed       = rawCoverage.passed  != null ? rawCoverage.passed  : covArr.filter(i => i.status === 'COVERED').length
  const partial      = rawCoverage.partial != null ? rawCoverage.partial : covArr.filter(i => i.status === 'PARTIAL').length
  const failed       = rawCoverage.failed  != null ? rawCoverage.failed  : covArr.filter(i => i.status === 'MISSING').length
  const passRate     = rawCoverage.pass_rate != null ? rawCoverage.pass_rate : (totalItems > 0 ? passed / totalItems : 0)

  const verdictColor = verdict === 'READY TO SEND' ? '#34d399'
    : verdict === 'DO NOT SEND' ? '#f87171' : '#fbbf24'

  const catEntries = Object.entries(category_scores || {}).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-5" style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>

      {/* ── Verdict Banner ────────────────────────────────────────────────── */}
      <VerdictBanner
        overallScore={overall_score}
        verdict={verdict}
        agent1Score={agent1_score}
        agent2Score={agent2_score}
        agent3Score={agent3_score}
        weightLabel={weight_label}
        weightAdjusted={weight_adjusted}
        weightReason={weight_reason}
      />

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Overall Score"  value={`${overall_score.toFixed(1)}/10`} color={scoreColor(overall_score)} />
        <KpiCard label="Pass Rate"      value={`${Math.round(passRate * 100)}%`} sub={`${passed}/${totalItems} items`} color={scoreColor(passRate * 10)} />
        <KpiCard label="Must Fix"       value={must_fix.length} color={must_fix.length > 0 ? '#f87171' : '#34d399'} />
        <KpiCard label="Verdict"        value={verdict === 'READY TO SEND' ? 'READY' : verdict === 'DO NOT SEND' ? 'DO NOT SEND' : 'REVISION'} color={verdictColor} />
      </div>

      {/* ── Coverage summary row ──────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: 'Passed',  value: passed,  Icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-950/30 border-green-900/40' },
          { label: 'Partial', value: partial, Icon: Minus,        color: 'text-yellow-400', bg: 'bg-yellow-950/30 border-yellow-900/40' },
          { label: 'Failed',  value: failed,  Icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-950/30 border-red-900/40' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className={clsx('border rounded-xl p-4 flex items-center gap-3', bg)}>
            <Icon size={28} className={color} />
            <div>
              <div className={clsx('text-2xl font-bold', color)}>{value}</div>
              <div className="text-xs text-gray-500">{label} items</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Top Strengths ─────────────────────────────────────────────────── */}
      {top_3_strengths.length > 0 && (
        <TopStrengths strengths={top_3_strengths} />
      )}

      {/* ── Double Flagged ────────────────────────────────────────────────── */}
      <DoubleFlaggedIssues issues={double_flagged_issues} />

      {/* ── Priority Action List ─────────────────────────────────────────── */}
      <PriorityActionList priorityActions={priority_actions} />

      {/* ── Score Radar (NC4.7 standard dimensions) ──────────────────────── */}
      {Object.keys(section_scorecard).length > 0 && (
        <ScoreRadar sectionScorecard={section_scorecard} />
      )}

      {/* ── Category score bars ──────────────────────────────────────────── */}
      {catEntries.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-purple-400" />
            <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Custom Checklist — Category Scores
            </h3>
          </div>
          {catEntries.map(([name, score]) => {
            const pct   = (score / 10) * 100
            const color = scoreColor(score)
            return (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 truncate">{name}</span>
                  <span className="font-mono flex-shrink-0 ml-2" style={{ color }}>
                    {score.toFixed(1)}/10
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Cross Consistency Panel ───────────────────────────────────────── */}
      <CrossConsistencyPanel issues={cross_consistency_issues} />

      {/* ── Checklist Coverage by Category (CustomChecklistGrid) ─────────── */}
      {nc3Results.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers size={14} className="text-teal-400" />
            <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
              Checklist Coverage by Category
            </h3>
          </div>
          <CustomChecklistGrid nc3Results={nc3Results} nc2Output={nc2Output} />
        </div>
      )}

      {/* ── Error categories ─────────────────────────────────────────────── */}
      {error_categories.length > 0 && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" />
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Evaluation Errors
            </h4>
          </div>
          {error_categories.map((c, i) => (
            <p key={i} className="text-xs text-red-300">• {c}</p>
          ))}
        </div>
      )}
    </div>
  )
}
