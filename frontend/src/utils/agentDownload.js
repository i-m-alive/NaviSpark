// ── Trigger helpers ───────────────────────────────────────────────────────────

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJson(data, filename) {
  triggerDownload(JSON.stringify(data, null, 2), filename, 'application/json')
}

export function downloadMarkdown(content, filename) {
  triggerDownload(content, filename, 'text/markdown')
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function statusEmoji(status) {
  if (!status) return '—'
  const s = status.toUpperCase()
  if (s === 'COVERED' || s === 'PRESENT') return '✅'
  if (s === 'PARTIAL' || s === 'WEAK') return '🟡'
  return '❌'
}

function severityLabel(s) {
  if (!s) return ''
  if (s === 'CRITICAL') return '🔴 CRITICAL'
  if (s === 'MAJOR') return '🟠 MAJOR'
  return '🔵 MINOR'
}

function metaBlock(agentLabel, meta) {
  const lines = [`# ${agentLabel}\n`]
  if (meta?.filename) lines.push(`**Document:** ${meta.filename}`)
  if (meta?.proposalType) lines.push(`**Proposal Type:** ${meta.proposalType}`)
  if (meta?.industry?.length) lines.push(`**Industry:** ${meta.industry.join(', ')}`)
  if (meta?.priorities?.length) lines.push(`**Client Priorities:** ${meta.priorities.join(', ')}`)
  if (meta?.date) lines.push(`**Date:** ${meta.date}`)
  return lines.join('  \n') + '\n\n---\n'
}

function scoresTable(scores, rows) {
  const lines = ['## Scores\n', '| Dimension | Score |', '|-----------|-------|']
  rows.forEach(([label, key]) => {
    const val = scores?.[key]
    lines.push(`| ${label} | ${val != null ? val.toFixed(1) : '—'} / 10 |`)
  })
  lines.push(`| **Overall** | **${scores?.overall != null ? scores.overall.toFixed(1) : '—'} / 10** |`)
  return lines.join('\n') + '\n'
}

// ── Agent 1 → Markdown ────────────────────────────────────────────────────────

export function agent1ToMarkdown(output, meta) {
  const sections = []

  sections.push(metaBlock('Agent 1 — Completeness & Clarity Review', meta))

  // Scores
  sections.push(scoresTable(output.scores, [
    ['Section Completeness', 'section_completeness'],
    ['Writing Quality', 'writing_quality'],
    ['Scope Clarity', 'scope_clarity'],
    ['Client Specificity', 'client_coverage'],
  ]))

  // Section audit / checklist
  const audit = output.section_audit || output.checklist_coverage || []
  if (audit.length > 0) {
    const lines = ['\n## GSK Proposal Checklist Coverage\n',
      '| ID | Section | Mandatory | Status | Note |',
      '|----|---------|:---------:|--------|------|']
    audit.forEach(item => {
      const id = item.id || '—'
      const section = item.section || item.topic || '—'
      const mandatory = item.mandatory ? '✓' : ''
      const status = `${statusEmoji(item.status)} ${item.status || '—'}`
      const note = (item.note || '').replace(/\|/g, '\\|')
      lines.push(`| ${id} | ${section} | ${mandatory} | ${status} | ${note} |`)
    })
    const covered = audit.filter(i => i.status === 'COVERED').length
    const partial = audit.filter(i => i.status === 'PARTIAL').length
    const missing = audit.filter(i => i.status === 'MISSING').length
    lines.push(`\n**Summary:** ${covered} covered · ${partial} partial · ${missing} missing (of ${audit.length} items)`)
    sections.push(lines.join('\n'))
  }

  // Writing issues
  const writing = output.writing_issues || []
  if (writing.length > 0) {
    const lines = ['\n## Writing Issues\n']
    writing.forEach((issue, i) => {
      lines.push(`### ${i + 1}. ${severityLabel(issue.severity)} — ${issue.type || ''}`)
      if (issue.location) lines.push(`**Location:** ${issue.location}`)
      if (issue.quote) lines.push(`\n> "${issue.quote}"\n`)
      if (issue.recommendation) lines.push(`**Recommendation:** ${issue.recommendation}`)
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  // Scope issues
  const scope = output.scope_clarity_issues || output.scope_issues || []
  if (scope.length > 0) {
    const lines = ['\n## Scope Clarity Issues\n']
    scope.forEach((issue, i) => {
      lines.push(`### ${i + 1}. ${severityLabel(issue.severity)}`)
      lines.push(issue.issue || issue.description || '')
      if (issue.recommendation) lines.push(`\n**Recommendation:** ${issue.recommendation}`)
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  // Industry / client-specific gaps
  const gaps = output.client_specific_gaps || output.industry_gaps || []
  if (gaps.length > 0) {
    const lines = ['\n## Industry-Specific Gaps\n',
      '| Industry | Gap | Severity |',
      '|----------|-----|----------|']
    gaps.forEach(g => {
      const industry = g.industry_lens || '—'
      const gap = (g.gap || '—').replace(/\|/g, '\\|')
      const why = g.why_it_matters ? ` — _${g.why_it_matters.replace(/\|/g, '\\|')}_` : ''
      lines.push(`| ${industry} | ${gap}${why} | ${severityLabel(g.severity)} |`)
    })
    sections.push(lines.join('\n'))
  }

  // Jargon flags
  const jargon = output.jargon_flags || []
  if (jargon.length > 0) {
    const lines = ['\n## Jargon Flags\n']
    jargon.forEach((f, i) => {
      lines.push(`### ${i + 1}. Jargon-dense paragraph`)
      if (f.paragraph_snippet) lines.push(`> "${f.paragraph_snippet}…"`)
      if (f.jargon_terms?.length) lines.push(`**Terms flagged:** ${f.jargon_terms.join(', ')}`)
      if (f.suggestion) lines.push(`**Plain-language suggestion:** ${f.suggestion}`)
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  // Rewrite suggestion
  const rw = output.rewrite
  if (rw) {
    const lines = ['\n## Rewrite Suggestion\n']
    if (rw.section) lines.push(`**Section:** ${rw.section}\n`)
    lines.push('**Original:**')
    lines.push(`> ${(rw.original || '').replace(/\n/g, '\n> ')}\n`)
    lines.push('**Improved:**')
    lines.push(`> ${(rw.improved || '').replace(/\n/g, '\n> ')}\n`)
    if (rw.rationale) lines.push(`**Rationale:** ${rw.rationale}`)
    sections.push(lines.join('\n'))
  }

  return sections.join('\n')
}

// ── Agent 2 → Markdown ────────────────────────────────────────────────────────

export function agent2ToMarkdown(output, meta) {
  const sections = []

  sections.push(metaBlock('Agent 2 — Estimation & Commercial Integrity Review', meta))

  sections.push(scoresTable(output.scores, [
    ['Estimation Rigour (30%)', 'estimation_rigour'],
    ['Phase Coverage (30%)', 'phase_coverage'],
    ['Pricing Completeness (20%)', 'pricing_completeness'],
    ['Commercial Model Fit (10%)', 'commercial_model_fit'],
    ['Arithmetic Accuracy (10%)', 'arithmetic_accuracy'],
  ]))

  // Commercial model
  const cma = output.commercial_model_assessment
  if (cma) {
    const lines = ['\n## Commercial Model Assessment\n']
    lines.push(`**Model:** ${cma.model_stated || '—'}`)
    lines.push(`**Appropriate for scope:** ${cma.appropriate_for_scope ? '✅ Yes' : '❌ No'}`)
    if (cma.concerns?.length) {
      lines.push('\n**Concerns:**')
      cma.concerns.forEach(c => lines.push(`- ${c}`))
    }
    sections.push(lines.join('\n'))
  }

  // Missing phases
  const phases = output.missing_phases || []
  if (phases.length > 0) {
    const lines = ['\n## Missing / Uncosted Phases\n',
      '| GSK Item | Phase | Severity |',
      '|----------|-------|----------|']
    phases.forEach(p => {
      lines.push(`| ${p.gsk_item || '—'} | ${p.phase || '—'} | ${severityLabel(p.severity)} |`)
    })
    sections.push(lines.join('\n'))
  }

  // Estimation issues
  const estIssues = output.estimation_issues || []
  if (estIssues.length > 0) {
    const lines = ['\n## Estimation Issues\n']
    estIssues.forEach((issue, i) => {
      lines.push(`### ${i + 1}. ${severityLabel(issue.severity)} — ${issue.gsk_item || ''} (Skill ${issue.skill || ''})`)
      lines.push(issue.issue || '')
      if (issue.recommendation) lines.push(`\n**Recommendation:** ${issue.recommendation}`)
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  // Pricing issues
  const pricingIssues = output.pricing_issues || []
  if (pricingIssues.length > 0) {
    const lines = ['\n## Pricing Issues\n']
    pricingIssues.forEach((issue, i) => {
      lines.push(`### ${i + 1}. ${severityLabel(issue.severity)} — ${issue.gsk_item || ''} (Skill ${issue.skill || ''})`)
      lines.push(issue.issue || '')
      if (issue.recommendation) lines.push(`\n**Recommendation:** ${issue.recommendation}`)
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  // Arithmetic flags
  const arith = output.arithmetic_flags || []
  if (arith.length > 0) {
    const lines = ['\n## Arithmetic Checks\n',
      '| Check | Finding | Severity |',
      '|-------|---------|----------|']
    arith.forEach(f => {
      lines.push(`| ${(f.check || '').replace(/\|/g, '\\|')} | ${(f.finding || '').replace(/\|/g, '\\|')} | ${severityLabel(f.severity)} |`)
    })
    sections.push(lines.join('\n'))
  }

  // Internal flags (clearly marked)
  const internal = output.internal_flags || []
  if (internal.length > 0) {
    const lines = ['\n---\n\n## ⚠️ INTERNAL — NOT FOR CLIENT\n']
    internal.forEach((f, i) => {
      lines.push(`### ${i + 1}. ${f.check || ''} — ${severityLabel(f.severity)}`)
      lines.push(f.finding || '')
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  return sections.join('\n')
}

// ── Agent 4 → Markdown ────────────────────────────────────────────────────────

export function agent4ToMarkdown(output, meta) {
  const sections = []

  sections.push(metaBlock('Agent 4 — Chief Proposal Review Officer (Final Verdict)', meta))

  // ── Verdict block ──────────────────────────────────────────────────────────
  const verdictEmoji = output.verdict === 'READY TO SEND' ? '✅' : output.verdict === 'NEEDS MAJOR REVISION' ? '🔄' : '⚠️'
  sections.push(
    `## ${verdictEmoji} Verdict: ${output.verdict || '—'}\n\n` +
    `**Overall Score:** ${output.overall_score != null ? output.overall_score.toFixed(1) : '—'} / 10\n\n` +
    `| Agent | Score | Weight |\n|-------|-------|--------|\n` +
    `| Agent 1 — Completeness & Clarity | ${output.agent1_score?.toFixed(1) ?? '—'} | ${output.weights?.agent1 != null ? (output.weights.agent1 * 100).toFixed(0) + '%' : '—'} |\n` +
    `| Agent 2 — Estimation & Commercial | ${output.agent2_score?.toFixed(1) ?? '—'} | ${output.weights?.agent2 != null ? (output.weights.agent2 * 100).toFixed(0) + '%' : '—'} |\n` +
    `| Agent 3 — Competitive Strength | ${output.agent3_score?.toFixed(1) ?? '—'} | ${output.weights?.agent3 != null ? (output.weights.agent3 * 100).toFixed(0) + '%' : '—'} |\n` +
    (output.weight_adjusted ? `\n> **Weight adjustment:** ${output.weight_label} — ${output.weight_reason}` : '')
  )

  // ── Plain-English summary ──────────────────────────────────────────────────
  if (output.plain_english_summary) {
    sections.push(`\n## Executive Summary\n\n${output.plain_english_summary}`)
  }

  // ── Top strengths ──────────────────────────────────────────────────────────
  if (output.top_3_strengths?.length) {
    const lines = ['\n## Top Strengths\n']
    output.top_3_strengths.forEach((s, i) => lines.push(`${i + 1}. ${s}`))
    sections.push(lines.join('\n'))
  }

  // ── Double-flagged issues ─────────────────────────────────────────────────
  const doubleFlagged = output.double_flagged_issues || []
  if (doubleFlagged.length) {
    const lines = ['\n## ⚠️ Double-Flagged Issues (Highest Priority)\n',
      '_These issues were independently detected by two or more specialist agents._\n']
    doubleFlagged.forEach((issue, i) => {
      lines.push(`### ${i + 1}. ${issue.agents?.join(' + ')} — CRITICAL`)
      lines.push(issue.issue_summary || '')
      if (issue.shared_keywords?.length) lines.push(`\n**Shared signals:** ${issue.shared_keywords.join(', ')}`)
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  // ── Priority action list ──────────────────────────────────────────────────
  const pa = output.priority_actions || {}

  const renderActions = (items, heading) => {
    if (!items?.length) return ''
    const lines = [`\n## ${heading}\n`]
    items.forEach((item, i) => {
      lines.push(`### ${i + 1}. ${item.action || ''}`)
      if (item.why) lines.push(`**Why it matters:** ${item.why}`)
      if (item.source_agents?.length) lines.push(`**Source:** ${item.source_agents.join(', ')}`)
      lines.push('')
    })
    return lines.join('\n')
  }

  sections.push(renderActions(pa.must_fix, '🔴 Must Fix Before Sending'))
  sections.push(renderActions(pa.should_fix, '🟡 Should Fix If Time Allows'))
  sections.push(renderActions(pa.next_time, '🔵 Note for Next Proposal'))

  // ── Internal section ───────────────────────────────────────────────────────
  if (pa.internal?.length) {
    const lines = ['\n---\n\n## ⚠️ INTERNAL — NOT FOR CLIENT\n']
    pa.internal.forEach((item, i) => {
      lines.push(`### ${i + 1}. ${item.action || ''}`)
      if (item.why) lines.push(item.why)
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  // ── Cross-consistency issues ───────────────────────────────────────────────
  const cc = output.cross_consistency_issues || []
  if (cc.length) {
    const lines = ['\n## Cross-Agent Consistency Issues\n',
      '| Rule | Check | Severity | Finding |',
      '|------|-------|----------|---------|']
    cc.forEach(issue => {
      lines.push(`| ${issue.rule_id || '—'} | ${(issue.check || '').replace(/\|/g, '\\|')} | ${severityLabel(issue.severity)} | ${(issue.finding || '').replace(/\|/g, '\\|')} |`)
    })
    sections.push(lines.join('\n'))
  }

  // ── Section scorecard ──────────────────────────────────────────────────────
  const sc = output.section_scorecard
  if (sc) {
    const lines = ['\n## Dimension Scorecard\n',
      '| Dimension | Score |',
      '|-----------|-------|',
      `| Section Completeness | ${sc.section_completeness?.toFixed(1) ?? '—'} / 10 |`,
      `| Writing Quality | ${sc.writing_quality?.toFixed(1) ?? '—'} / 10 |`,
      `| Scope Clarity | ${sc.scope_clarity?.toFixed(1) ?? '—'} / 10 |`,
      `| Client Coverage | ${sc.client_coverage?.toFixed(1) ?? '—'} / 10 |`,
      `| Estimation Rigour | ${sc.estimation_rigour?.toFixed(1) ?? '—'} / 10 |`,
      `| Phase Coverage | ${sc.phase_coverage?.toFixed(1) ?? '—'} / 10 |`,
      `| Pricing Completeness | ${sc.pricing_completeness?.toFixed(1) ?? '—'} / 10 |`,
      `| Commercial Model Fit | ${sc.commercial_model_fit?.toFixed(1) ?? '—'} / 10 |`,
      `| Client Fit | ${sc.client_fit?.toFixed(1) ?? '—'} / 10 |`,
      `| Differentiation | ${sc.differentiation?.toFixed(1) ?? '—'} / 10 |`,
      `| Risk Transparency | ${sc.risk_transparency?.toFixed(1) ?? '—'} / 10 |`,
      `| Credibility | ${sc.credibility?.toFixed(1) ?? '—'} / 10 |`,
      `| Narrative | ${sc.narrative?.toFixed(1) ?? '—'} / 10 |`,
      `| Industry Factors | ${sc.industry_factors?.toFixed(1) ?? '—'} / 10 |`,
    ]
    sections.push(lines.join('\n'))
  }

  // ── Unified checklist grid ─────────────────────────────────────────────────
  const cl = output.checklist_coverage || []
  if (cl.length) {
    const covered = cl.filter(i => i.status === 'COVERED').length
    const partial  = cl.filter(i => i.status === 'PARTIAL').length
    const missing  = cl.filter(i => i.status === 'MISSING').length

    const lines = [
      `\n## GSK Checklist Coverage — All Three Sheets (${cl.length} items)\n`,
      `**Summary:** ${covered} covered · ${partial} partial · ${missing} missing\n`,
      '| ID | Sheet | Topic | Mandatory | Status | Agent |',
      '|----|-------|-------|:---------:|--------|-------|',
    ]
    cl.forEach(item => {
      if (item.internal) return
      const status = `${statusEmoji(item.status)} ${item.status || '—'}`
      lines.push(`| ${item.id || '—'} | ${item.sheet || '—'} | ${(item.topic || '').replace(/\|/g, '\\|')} | ${item.mandatory ? '✓' : ''} | ${status} | ${item.primary_agent || '—'} |`)
    })
    const internalItems = cl.filter(i => i.internal)
    if (internalItems.length) {
      lines.push('\n_Internal items omitted from client-facing grid._')
    }
    sections.push(lines.join('\n'))
  }

  // ── Rewrite suggestions ────────────────────────────────────────────────────
  const rw = output.rewrite_suggestions || []
  if (rw.length) {
    const lines = ['\n## Rewrite Suggestions\n']
    rw.forEach((r, i) => {
      lines.push(`### ${i + 1}. ${r.section || 'Rewrite'}`)
      lines.push('**Original:**')
      lines.push(`> ${(r.original || '').replace(/\n/g, '\n> ')}\n`)
      lines.push('**Improved:**')
      lines.push(`> ${(r.improved || '').replace(/\n/g, '\n> ')}\n`)
      if (r.what_changed) lines.push(`_${r.what_changed}_`)
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  return sections.filter(Boolean).join('\n')
}

// ── Agent 3 → Markdown ────────────────────────────────────────────────────────

export function agent3ToMarkdown(output, meta) {
  const sections = []

  sections.push(metaBlock('Agent 3 — Competitive Strength Review', meta))

  sections.push(scoresTable(output.scores, [
    ['Client Fit', 'client_fit'],
    ['Differentiation', 'differentiation'],
    ['Risk Transparency', 'risk_transparency'],
    ['Credibility', 'credibility'],
    ['Narrative', 'narrative'],
    ['Industry Factors', 'industry_factors'],
  ]))

  // Differentiation
  const diff = output.differentiation
  if (diff) {
    const lines = ['\n## Differentiation Assessment\n']
    lines.push(`**Verdict:** ${diff.sounds_generic ? '❌ Sounds generic' : '✅ Has genuine differentiators'}`)
    if (diff.differentiators_found?.length) {
      lines.push('\n**Genuine differentiators found:**')
      diff.differentiators_found.forEach(d => lines.push(`- ✅ ${d}`))
    }
    if (diff.generic_elements?.length) {
      lines.push('\n**Generic elements to fix:**')
      diff.generic_elements.forEach(g => lines.push(`- ⚠️ ${g}`))
    }
    sections.push(lines.join('\n'))
  }

  // Narrative flow
  const narr = output.narrative_assessment
  if (narr) {
    const lines = ['\n## Narrative Flow\n',
      '| Element | Status |',
      '|---------|--------|',
      `| Flows as a story | ${narr.flows_as_story ? '✅' : '❌'} |`,
      `| Executive summary compelling | ${narr.exec_summary_compelling ? '✅' : '❌'} |`,
      `| Clear "why us" | ${narr.clear_why_us ? '✅' : '❌'} |`,
      `| Clear next step | ${narr.clear_next_step ? '✅' : '❌'} |`,
    ]
    if (narr.narrative_gaps?.length) {
      lines.push('\n**Narrative gaps:**')
      narr.narrative_gaps.forEach(g => lines.push(`- ${g}`))
    }
    sections.push(lines.join('\n'))
  }

  // Client fit issues
  const clientFit = output.client_fit_issues || []
  if (clientFit.length > 0) {
    const lines = ['\n## Client Priority Gaps\n']
    clientFit.forEach((issue, i) => {
      lines.push(`### ${i + 1}. ${severityLabel(issue.severity)} — ${issue.priority || ''}`)
      lines.push(issue.issue || '')
      if (issue.recommendation) lines.push(`\n**Recommendation:** ${issue.recommendation}`)
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  // Risk transparency issues
  const riskIssues = output.risk_transparency_issues || []
  if (riskIssues.length > 0) {
    const lines = ['\n## Risk & Dependency Transparency Issues\n']
    riskIssues.forEach((issue, i) => {
      const gskRef = issue.gsk_item ? ` (${issue.gsk_item})` : ''
      lines.push(`### ${i + 1}. ${severityLabel(issue.severity)}${gskRef}`)
      lines.push(issue.issue || '')
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  // Credibility gaps
  const credGaps = output.credibility_gaps || []
  if (credGaps.length > 0) {
    const lines = ['\n## Credibility Gaps\n']
    credGaps.forEach((gap, i) => {
      const gskRef = gap.gsk_item ? ` (${gap.gsk_item})` : ''
      lines.push(`### ${i + 1}. ${severityLabel(gap.severity)}${gskRef}`)
      lines.push(gap.issue || '')
      lines.push('')
    })
    sections.push(lines.join('\n'))
  }

  // Overclaiming flags
  const overclaiming = output.overclaiming_flags || []
  if (overclaiming.length > 0) {
    const lines = ['\n## Overclaiming Flags\n',
      '| Claim | Location | Severity |',
      '|-------|----------|----------|']
    overclaiming.forEach(f => {
      lines.push(`| "${(f.claim || '').replace(/\|/g, '\\|')}" | ${f.location || '—'} | ${severityLabel(f.severity)} |`)
    })
    sections.push(lines.join('\n'))
  }

  // GSK Checklist Coverage
  const checklist = output.checklist_coverage || []
  if (checklist.length > 0) {
    const lines = ['\n## GSK Proposal Checklist Coverage\n',
      '| ID | Topic | Skill | Status | Note |',
      '|----|-------|-------|--------|------|']
    checklist.forEach(item => {
      const id = item.id || '—'
      const topic = (item.topic || '—').replace(/\|/g, '\\|')
      const skill = item.skill || '—'
      const status = `${statusEmoji(item.status)} ${item.status || '—'}`
      const note = (item.note || '').replace(/\|/g, '\\|')
      lines.push(`| ${id} | ${topic} | ${skill} | ${status} | ${note} |`)
    })
    const covered = checklist.filter(i => i.status === 'COVERED').length
    const partial = checklist.filter(i => i.status === 'PARTIAL').length
    const missing = checklist.filter(i => i.status === 'MISSING').length
    lines.push(`\n**Summary:** ${covered} covered · ${partial} partial · ${missing} missing (of ${checklist.length} items)`)
    sections.push(lines.join('\n'))
  }

  // Industry findings
  const industry = output.industry_findings || []
  if (industry.length > 0) {
    const lines = ['\n## Industry Win Factors\n',
      '| Factor | Finding | Severity |',
      '|--------|---------|----------|']
    industry.forEach(f => {
      lines.push(`| ${(f.factor || '').replace(/\|/g, '\\|')} | ${statusEmoji(f.finding)} ${f.finding || '—'} | ${severityLabel(f.severity)} |`)
    })
    sections.push(lines.join('\n'))
  }

  return sections.join('\n')
}
