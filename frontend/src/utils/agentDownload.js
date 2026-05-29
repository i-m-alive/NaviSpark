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
    ['Client Specificity', 'client_specificity'],
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
      '| Factor | Finding | Severity |',
      '|--------|---------|----------|']
    gaps.forEach(g => {
      lines.push(`| ${g.factor || '—'} | ${g.finding || '—'} | ${severityLabel(g.severity)} |`)
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
