import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'

// ── Complete checklist data — all 57 items ────────────────────────────────────

const CHECKLIST = {
  Proposal: [
    { id: 'P-01',  topic: 'Functional requirements understanding',       mandatory: true,  agent: 'A1', skill: '1.1' },
    { id: 'P-02',  topic: 'Non-functional requirements',                 mandatory: true,  agent: 'A1', skill: '1.1' },
    { id: 'P-03',  topic: 'Clarification areas & assumptions',           mandatory: false, agent: 'A1', skill: '1.1' },
    { id: 'P-04',  topic: 'Requirements prioritisation criteria',        mandatory: false, agent: 'A1', skill: '1.1' },
    { id: 'P-05',  topic: 'Proposed scope of work',                      mandatory: true,  agent: 'A1', skill: '1.1 · 1.3' },
    { id: 'P-06',  topic: 'Areas outside proposed scope',                mandatory: true,  agent: 'A1', skill: '1.3' },
    { id: 'P-07',  topic: 'Requirements matrix (colour-coded)',          mandatory: false, agent: 'A1', skill: '1.3' },
    { id: 'P-08',  topic: 'Work responsibility distribution',            mandatory: true,  agent: 'A3', skill: '3.4' },
    { id: 'P-09',  topic: 'Logical / functional solution architecture',  mandatory: true,  agent: 'A3', skill: '3.2' },
    { id: 'P-10',  topic: 'Technical solution architecture',             mandatory: true,  agent: 'A3', skill: '3.2' },
    { id: 'P-11',  topic: 'Sample solution screens',                     mandatory: false, agent: 'A1', skill: '1.1' },
    { id: 'P-12',  topic: 'Technology stack with role justification',    mandatory: true,  agent: 'A3', skill: '3.2' },
    { id: 'P-13',  topic: 'Benefits framed as client outcomes',          mandatory: true,  agent: 'A3', skill: '3.1' },
    { id: 'P-14',  topic: 'Dependencies on customer / third parties',    mandatory: true,  agent: 'A3', skill: '3.3' },
    { id: 'P-15',  topic: 'Schedule & delivery milestones',              mandatory: true,  agent: 'A1', skill: '1.1 · 2.2' },
    { id: 'P-16',  topic: 'Assumptions + impact if wrong',               mandatory: true,  agent: 'A3', skill: '3.3' },
    { id: 'P-17',  topic: 'Deliverables list with description',          mandatory: true,  agent: 'A1', skill: '1.1' },
    { id: 'P-18',  topic: 'Case studies of similar work',                mandatory: true,  agent: 'A3', skill: '3.4' },
    { id: 'P-19',  topic: 'Commercial plan overview',                    mandatory: true,  agent: 'A2', skill: '2.4' },
    { id: 'P-20',  topic: 'Risk register with mitigation',               mandatory: true,  agent: 'A3', skill: '3.3' },
    { id: 'P-21',  topic: 'What vendor needs from client before start',  mandatory: true,  agent: 'A3', skill: '3.3' },
    { id: 'P-22',  topic: 'Reference documents cited',                   mandatory: true,  agent: 'A1', skill: '1.1' },
  ],
  Estimation: [
    { id: 'E-01',  topic: 'Work breakdown structure',                    mandatory: true,  agent: 'A2', skill: '2.1' },
    { id: 'E-02',  topic: 'Estimation assumptions',                      mandatory: true,  agent: 'A2', skill: '2.1' },
    { id: 'E-03',  topic: 'Clarity level per requirement',               mandatory: true,  agent: 'A2', skill: '2.1' },
    { id: 'E-04',  topic: 'Complexity level per requirement',            mandatory: true,  agent: 'A2', skill: '2.1' },
    { id: 'E-05',  topic: 'Reuse of pre-existing assets',                mandatory: true,  agent: 'A2', skill: '2.3' },
    { id: 'E-06',  topic: 'Effort: requirements detailing phase',        mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-07',  topic: 'Effort: technical design phase',              mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-08',  topic: 'Effort: coding & unit testing',               mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-09',  topic: 'Effort: component integration & testing',     mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-10',  topic: 'Effort: automation of dev/test activities',   mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-11',  topic: 'Contingency linked to clarity & complexity',  mandatory: true,  agent: 'A2', skill: '2.1' },
    { id: 'E-12',  topic: 'Reference baselines for projections',         mandatory: true,  agent: 'A2', skill: '2.1' },
    { id: 'E-13',  topic: 'Documentation effort',                        mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-14',  topic: 'Module integration effort',                   mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-15',  topic: 'External system integration effort',          mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-16',  topic: 'CI/CD & release management effort',           mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-17',  topic: 'System testing effort',                       mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-18',  topic: 'UAT & go-live support effort',                mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-19',  topic: 'Project management effort',                   mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-20',  topic: 'Team roles & headcount',                      mandatory: true,  agent: 'A2', skill: '2.6' },
    { id: 'E-21',  topic: 'External consultancy requirement',            mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-22',  topic: 'Duration & basis for duration',               mandatory: true,  agent: 'A2', skill: '2.2 · 2.6' },
    { id: 'E-23',  topic: 'Resource loading plan — solution delivery',   mandatory: true,  agent: 'A2', skill: '2.2' },
    { id: 'E-24',  topic: 'Resource loading plan — sales & management',  mandatory: true,  agent: 'A2', skill: '2.2' },
  ],
  Pricing: [
    { id: 'PR-01',  topic: 'Rate card for all delivery roles',           mandatory: true,  agent: 'A2', skill: '2.5' },
    { id: 'PR-02',  topic: 'Commercial model (T&M / fixed / hybrid)',    mandatory: true,  agent: 'A2', skill: '2.5' },
    { id: 'PR-03a', topic: 'Solution development & delivery cost',       mandatory: true,  agent: 'A2', skill: '2.4' },
    { id: 'PR-03b', topic: 'Warranty phase cost',                        mandatory: true,  agent: 'A2', skill: '2.4' },
    { id: 'PR-03c', topic: 'IP / reusable component cost',               mandatory: true,  agent: 'A2', skill: '2.3' },
    { id: 'PR-03d', topic: 'Margin targets',                             mandatory: true,  agent: 'A2', skill: '2.7', internal: true },
    { id: 'PR-03e', topic: 'Contingency cost in pricing',                mandatory: true,  agent: 'A2', skill: '2.4' },
    { id: 'PR-04',  topic: 'S&M price workings + margin',                mandatory: true,  agent: 'A2', skill: '2.4 · 2.7', internal: true },
    { id: 'PR-05',  topic: 'Infrastructure cost — development env',      mandatory: true,  agent: 'A2', skill: '2.4' },
    { id: 'PR-06',  topic: 'Infrastructure cost — test/QA env',          mandatory: true,  agent: 'A2', skill: '2.4' },
    { id: 'PR-07',  topic: 'Infrastructure cost — staging env',          mandatory: true,  agent: 'A2', skill: '2.4' },
    { id: 'PR-08',  topic: 'Infrastructure cost — production env',       mandatory: true,  agent: 'A2', skill: '2.4' },
    { id: 'PR-09',  topic: 'Reseller discounts / charges',               mandatory: true,  agent: 'A2', skill: '2.4' },
    { id: 'PR-10',  topic: 'External consultancy cost workings',         mandatory: true,  agent: 'A2', skill: '2.2 · 2.4' },
    { id: 'PR-11',  topic: 'Invoicing / payment schedule',               mandatory: true,  agent: 'A2', skill: '2.5' },
  ],
}

const SHEET_META = {
  Proposal:   { color: '#818cf8', bg: 'bg-indigo-950/40', border: 'border-indigo-800/50', idColor: 'text-indigo-300',  idBg: 'bg-indigo-950 border-indigo-800' },
  Estimation: { color: '#c084fc', bg: 'bg-purple-950/40', border: 'border-purple-800/50', idColor: 'text-purple-300', idBg: 'bg-purple-950 border-purple-800' },
  Pricing:    { color: '#34d399', bg: 'bg-teal-950/40',   border: 'border-teal-800/50',   idColor: 'text-teal-300',   idBg: 'bg-teal-950 border-teal-800'   },
}

const AGENT_META = {
  A1: { color: '#818cf8', bg: 'bg-indigo-950 border-indigo-800', text: 'text-indigo-300' },
  A2: { color: '#c084fc', bg: 'bg-purple-950 border-purple-800', text: 'text-purple-300' },
  A3: { color: '#34d399', bg: 'bg-teal-950 border-teal-800',     text: 'text-teal-300'   },
}

// ── Scroll-reveal hook ────────────────────────────────────────────────────────

function useInView(threshold = 0.08) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

// ── Reveal wrapper — fades + slides in when scrolled into view ────────────────

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ── Skeleton primitives ───────────────────────────────────────────────────────

function Sk({ w = 'w-full', h = 'h-4', rounded = 'rounded', className = '' }) {
  return <div className={`${w} ${h} ${rounded} bg-gray-800/70 animate-shimmer ${className}`} />
}

function PageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-14 animate-pulse">
      {/* Hero */}
      <div className="text-center space-y-4">
        <Sk w="w-32" h="h-6" className="mx-auto rounded-full" />
        <Sk w="w-2/3" h="h-10" className="mx-auto rounded-xl" />
        <Sk w="w-1/2" h="h-5" className="mx-auto rounded-lg" />
      </div>
      {/* Pipeline */}
      <div className="flex gap-4 justify-center">
        {[1,2,3,4].map(i => <Sk key={i} w="w-36" h="h-28" rounded="rounded-2xl" />)}
      </div>
      {/* Agent cards */}
      <div className="grid grid-cols-2 gap-4">
        {[1,2,3,4].map(i => <Sk key={i} w="w-full" h="h-48" rounded="rounded-2xl" />)}
      </div>
      {/* Checklist */}
      <div className="space-y-3">
        <Sk w="w-48" h="h-5" rounded="rounded-lg" />
        <Sk w="w-full" h="h-10" rounded="rounded-xl" />
        {[...Array(6)].map((_, i) => <Sk key={i} w="w-full" h="h-10" rounded="rounded-lg" />)}
      </div>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ number, children }) {
  return (
    <div className="flex items-center gap-3 mb-7">
      <div className="w-7 h-7 rounded-full bg-blue-950 border border-blue-800/70 flex items-center justify-center flex-shrink-0">
        <span className="text-blue-400 text-xs font-bold font-mono">{number}</span>
      </div>
      <h2 className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-[0.2em]">{children}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-gray-800 to-transparent" />
    </div>
  )
}

// ── Pipeline step ─────────────────────────────────────────────────────────────

function PipelineStep({ icon, label, sub, color, delay }) {
  const [ref, visible] = useInView()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(16px)',
      transition: `opacity 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
    }}>
      <div className="flex flex-col items-center text-center px-5 py-5 rounded-2xl border border-gray-800 bg-gray-900/80 hover:border-gray-700 hover:-translate-y-1 transition-all duration-300"
        style={{ minWidth: 130, boxShadow: `0 0 28px ${color}18` }}>
        <div className="text-3xl mb-3">{icon}</div>
        <div className="text-sm font-semibold text-white mb-1">{label}</div>
        <div className="text-[10px] text-gray-500 leading-snug">{sub}</div>
      </div>
    </div>
  )
}

function PipelineDiagram() {
  const steps = [
    { icon: '📄', label: 'Upload Proposal',          sub: 'PDF or Word document',      color: '#60a5fa' },
    { icon: '🤖', label: '3 Agents in Parallel',     sub: 'Completeness · Commercial · Competitive', color: '#818cf8' },
    { icon: '👁',  label: 'Chief Review Officer',     sub: 'Synthesises all findings',  color: '#fb923c' },
    { icon: '📊', label: 'Multi-View Report',         sub: '6 views + action plan',     color: '#34d399' },
  ]
  return (
    <div className="flex items-center justify-center flex-wrap gap-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <PipelineStep {...step} delay={i * 120} />
          {i < steps.length - 1 && (
            <div className="flex items-center px-1.5 text-gray-700">
              <div className="w-4 h-px bg-gray-700" />
              <svg width="7" height="7" viewBox="0 0 7 7" fill="currentColor"><path d="M0 0l7 3.5-7 3.5z"/></svg>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Agent card ────────────────────────────────────────────────────────────────

const AGENT_THEME = {
  a1: { border: 'border-indigo-800/60', bg: 'bg-indigo-950/25', accent: 'bg-indigo-500', text: 'text-indigo-300', glow: 'rgba(99,102,241,0.12)' },
  a2: { border: 'border-purple-800/60', bg: 'bg-purple-950/25', accent: 'bg-purple-500', text: 'text-purple-300', glow: 'rgba(168,85,247,0.12)'  },
  a3: { border: 'border-teal-800/60',   bg: 'bg-teal-950/25',   accent: 'bg-teal-500',   text: 'text-teal-300',  glow: 'rgba(20,184,166,0.12)'  },
  a4: { border: 'border-orange-800/60', bg: 'bg-orange-950/25', accent: 'bg-orange-500', text: 'text-orange-300',glow: 'rgba(249,115,22,0.12)'  },
}

function AgentCard({ id, number, name, role, description, checks, outputs, delay }) {
  const t = AGENT_THEME[id]
  const [ref, visible] = useInView()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>
      <div className={`rounded-2xl border ${t.border} ${t.bg} overflow-hidden h-full hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300`}
        style={{ boxShadow: `0 0 32px ${t.glow}` }}>
        <div className={`h-0.5 ${t.accent}`} />
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-9 h-9 rounded-xl ${t.accent} flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <span className="text-white text-xs font-bold font-mono">{number}</span>
            </div>
            <div>
              <h3 className={`text-sm font-bold ${t.text}`}>{name}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">{role}</p>
            </div>
          </div>
          <p className="text-[13px] text-gray-300 leading-relaxed mb-4">{description}</p>
          <div className="mb-3">
            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-2">Evaluates</p>
            <div className="flex flex-wrap gap-1.5">
              {checks.map(c => (
                <span key={c} className={`text-[10px] px-2 py-0.5 rounded-full border ${t.border} ${t.text} font-medium`}>{c}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-2">Output</p>
            <ul className="space-y-1">
              {outputs.map(o => (
                <li key={o} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                  <span className={`mt-0.5 ${t.text} flex-shrink-0`}>›</span>{o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Checklist section ─────────────────────────────────────────────────────────

function ChecklistSection() {
  const [activeSheet, setActiveSheet]   = useState('Proposal')
  const [agentFilter, setAgentFilter]   = useState([])
  const [mandatoryOnly, setMandatoryOnly] = useState(false)
  const [search, setSearch]             = useState('')
  const [prevSheet, setPrevSheet]       = useState('Proposal')
  const [animKey, setAnimKey]           = useState(0)

  const meta = SHEET_META[activeSheet]

  const switchSheet = (sheet) => {
    if (sheet === activeSheet) return
    setPrevSheet(activeSheet)
    setActiveSheet(sheet)
    setAgentFilter([])
    setAnimKey(k => k + 1)
  }

  const toggle = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

  const allItems   = CHECKLIST[activeSheet] || []
  const filtered   = allItems
    .filter(i => agentFilter.length === 0 || agentFilter.includes(i.agent))
    .filter(i => !mandatoryOnly || i.mandatory)
    .filter(i => !search.trim() || i.topic.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()))

  const mandCount = allItems.filter(i => i.mandatory).length
  const totalAll  = Object.values(CHECKLIST).flat().length

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800"
        style={{ background: 'linear-gradient(135deg, rgba(30,27,75,0.3) 0%, transparent 100%)' }}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-base font-bold text-white">Complete Evaluation Checklist</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalAll} items across 3 sheets · {Object.values(CHECKLIST).flat().filter(i => i.mandatory).length} mandatory
            </p>
          </div>
          <div className="flex gap-3 text-xs font-mono">
            {Object.entries(CHECKLIST).map(([sheet, items]) => (
              <span key={sheet} style={{ color: SHEET_META[sheet].color }}>
                {items.length} {sheet.toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Sheet tabs */}
        <div className="flex gap-1 mt-4 flex-wrap">
          {Object.keys(CHECKLIST).map(sheet => {
            const m = SHEET_META[sheet]
            const active = sheet === activeSheet
            return (
              <button key={sheet} onClick={() => switchSheet(sheet)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 border ${
                  active ? `${m.bg} ${m.border} text-white` : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
                }`}
              >
                {active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.color }} />}
                {sheet}
                <span className="font-mono text-[10px]" style={{ color: active ? m.color : '#4b5563' }}>
                  ({CHECKLIST[sheet].length})
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ background: m.color }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" width="11" height="11" viewBox="0 0 11 11" fill="none">
              <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
              <line x1="7.5" y1="7.5" x2="10" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-lg pl-7 pr-6 py-1.5 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-700/60 transition-colors w-36"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 text-[10px]">✕</button>}
          </div>

          {/* Agent chips */}
          {['A1','A2','A3'].map(ag => {
            const m = AGENT_META[ag]
            const active = agentFilter.includes(ag)
            // Only show agents present in current sheet
            if (!allItems.some(i => i.agent === ag)) return null
            return (
              <button key={ag} onClick={() => setAgentFilter(prev => toggle(prev, ag))}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all duration-150 ${
                  active ? `${m.bg} ${m.text}` : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
                }`}
              >{ag}</button>
            )
          })}

          <button onClick={() => setMandatoryOnly(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-medium transition-all duration-150 ${
              mandatoryOnly ? 'bg-amber-950/60 border-amber-700/60 text-amber-300' : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
            }`}
          >★ Mandatory only</button>

          {(agentFilter.length > 0 || mandatoryOnly || search) && (
            <button onClick={() => { setAgentFilter([]); setMandatoryOnly(false); setSearch('') }}
              className="ml-1 text-[10px] text-gray-600 hover:text-red-400 transition-colors">
              Clear ✕
            </button>
          )}

          <span className="ml-auto text-[10px] font-mono text-gray-600">
            {filtered.length} / {allItems.length} items
          </span>
        </div>
      </div>

      {/* Items list */}
      <div key={animKey} className="divide-y divide-gray-800/60">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600 text-sm">No items match the current filters</p>
            <button onClick={() => { setAgentFilter([]); setMandatoryOnly(false); setSearch('') }}
              className="mt-2 text-xs text-blue-500 hover:text-blue-400 underline underline-offset-2">Clear filters</button>
          </div>
        ) : (
          filtered.map((item, i) => {
            const m = AGENT_META[item.agent] || {}
            return (
              <div key={item.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/40 transition-colors group"
                style={{
                  animation: `slide-up-fade 0.35s cubic-bezier(0.16,1,0.3,1) ${Math.min(i * 22, 400)}ms both`,
                }}
              >
                {/* ID badge */}
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0 ${meta.idBg} ${meta.idColor}`}>
                  {item.id}
                </span>

                {/* Topic */}
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] text-gray-200 leading-snug">{item.topic}</span>
                  {item.internal && (
                    <span className="ml-2 text-[9px] text-amber-600 border border-amber-900/70 px-1.5 py-0.5 rounded">INTERNAL</span>
                  )}
                  <span className="ml-2 text-[9px] text-gray-700 font-mono hidden group-hover:inline">{item.skill}</span>
                </div>

                {/* Mandatory */}
                <span className={`text-[11px] flex-shrink-0 ${item.mandatory ? 'text-amber-400' : 'text-gray-700'}`}>
                  {item.mandatory ? '★' : '☆'}
                </span>

                {/* Agent pill */}
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0 ${m.bg || 'bg-gray-800 border-gray-700'} ${m.text || 'text-gray-500'}`}>
                  {item.agent}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-gray-800 flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <span className="text-amber-400">★</span> Mandatory item
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <span className="text-gray-700">☆</span> Optional item
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <span className="font-mono text-gray-600 border border-gray-800 px-1 rounded">skill</span> Visible on hover
        </div>
        {['A1','A2','A3'].map(ag => {
          const m = AGENT_META[ag]
          return <div key={ag} className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <span className={`font-mono font-bold px-1.5 rounded border ${m.bg} ${m.text} text-[9px]`}>{ag}</span>
            {ag === 'A1' ? 'Completeness' : ag === 'A2' ? 'Commercial' : 'Competitive'}
          </div>
        })}
      </div>
    </div>
  )
}

// ── Scoring table ─────────────────────────────────────────────────────────────

function ScoringTable() {
  const rows = [
    { range: '7.0 – 10.0', verdict: 'READY TO SEND',         color: '#34d399', bg: 'rgba(6,78,59,0.3)',  border: '#065f46', meaning: 'Proposal is strong enough to submit. Minor polish improves the score but should not delay submission.' },
    { range: '5.0 – 6.9',  verdict: 'REVISE BEFORE SENDING', color: '#fbbf24', bg: 'rgba(78,60,6,0.3)',  border: '#78350f', meaning: 'Proposal has merit but issues that will weaken the bid. Address priority actions before sending.' },
    { range: '0.0 – 4.9',  verdict: 'NEEDS MAJOR REVISION',  color: '#f87171', bg: 'rgba(69,10,10,0.3)', border: '#7f1d1d', meaning: 'Significant gaps or commercial weaknesses. Submitting as-is carries high risk of rejection.' },
  ]
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-950/60">
            {['Score Range','Verdict','What it means'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.verdict} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors"
              style={{ animation: `slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 100}ms both` }}>
              <td className="px-4 py-3.5 font-mono font-bold text-sm" style={{ color: r.color }}>{r.range}</td>
              <td className="px-4 py-3.5">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full border" style={{ color: r.color, background: r.bg, borderColor: r.border }}>
                  {r.verdict}
                </span>
              </td>
              <td className="px-4 py-3.5 text-xs text-gray-400 leading-relaxed">{r.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Dimension grid ────────────────────────────────────────────────────────────

function DimensionGrid() {
  const dims = [
    { key: 'Section Completeness', agent: 'A1', desc: 'Are all mandatory proposal sections present and adequately filled?' },
    { key: 'Writing Quality',      agent: 'A1', desc: 'Is the language clear, professional, and free of jargon overuse?' },
    { key: 'Scope Clarity',        agent: 'A1', desc: 'Is the project scope unambiguous and well-defined?' },
    { key: 'Estimation Rigour',    agent: 'A2', desc: 'Are effort estimates backed by methodology and evidence?' },
    { key: 'Phase Coverage',       agent: 'A2', desc: 'Are all project phases (discovery, delivery, support) represented?' },
    { key: 'Pricing Completeness', agent: 'A2', desc: 'Are all cost components documented without gaps?' },
    { key: 'Client Fit',           agent: 'A3', desc: "Does the proposal address the client's specific stated priorities?" },
    { key: 'Differentiation',      agent: 'A3', desc: 'Does the proposal stand out from a generic template response?' },
    { key: 'Risk Transparency',    agent: 'A3', desc: 'Are risks, assumptions, and mitigations clearly surfaced?' },
    { key: 'Credibility',          agent: 'A3', desc: 'Are past experience and team credentials effectively presented?' },
    { key: 'Narrative',            agent: 'A3', desc: 'Does the proposal tell a coherent and compelling story?' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {dims.map((d, i) => {
        const m = AGENT_META[d.agent] || {}
        return (
          <div key={d.key}
            className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 hover:border-gray-700 hover:-translate-y-0.5 transition-all duration-200"
            style={{ animation: `card-enter-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 40}ms both` }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-white">{d.key}</span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${m.bg} ${m.text}`}>{d.agent}</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-snug">{d.desc}</p>
          </div>
        )
      })}
    </div>
  )
}

// ── Report views grid ─────────────────────────────────────────────────────────

function ReportViewsGrid() {
  const views = [
    { icon: '📋', name: 'Executive',    desc: 'Traffic light verdict, score ring, top strengths & critical fixes. For decision-makers.' },
    { icon: '📊', name: 'Dashboard',    desc: 'KPI cards, radar chart, gauge, checklist donut, priority column chart. For analysts.' },
    { icon: '📖', name: 'Storyboard',   desc: 'Narrative chapters walking through each dimension. Easy to read and share.' },
    { icon: '🔍', name: 'In-Depth',     desc: 'Full per-agent output with all issues, suggestions, and checklist items tabbed.' },
    { icon: '✅', name: 'Action Plan',  desc: 'Checkbox task list saved to browser. Export to CSV. Tracks revision progress.' },
    { icon: '🖥',  name: 'Presentation',desc: 'Fullscreen slide deck — 8 slides, keyboard navigation. Ready to present.' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {views.map((v, i) => (
        <div key={v.name}
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"
          style={{ animation: `stat-enter 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms both` }}
        >
          <div className="text-2xl mb-2">{v.icon}</div>
          <div className="text-sm font-semibold text-white mb-1">{v.name} View</div>
          <p className="text-[11px] text-gray-500 leading-snug">{v.desc}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      {loading ? (
        <PageSkeleton />
      ) : (
        <>
          {/* ── Hero ─────────────────────────────────────────────────── */}
          <div className="relative overflow-hidden"
            style={{ background: 'linear-gradient(180deg, rgba(30,27,75,0.45) 0%, rgba(9,11,17,0) 100%)' }}>
            {/* Subtle orb */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full opacity-20"
                style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.4) 0%, transparent 70%)', filter: 'blur(32px)' }} />
            </div>

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-400 text-xs font-mono uppercase tracking-widest mb-6"
                style={{ animation: 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) 0ms both' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Intelligence Engine
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight"
                style={{ animation: 'slide-up-fade 0.6s cubic-bezier(0.16,1,0.3,1) 80ms both' }}>
                How NaviSpark<br />
                <span style={{
                  background: 'linear-gradient(90deg,#60a5fa,#818cf8,#c084fc)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>Reviews Your Proposals</span>
              </h1>
              <p className="text-gray-400 text-base max-w-xl mx-auto leading-relaxed"
                style={{ animation: 'slide-up-fade 0.6s cubic-bezier(0.16,1,0.3,1) 160ms both' }}>
                Four specialised AI agents analyse your proposal in parallel, then a Chief Review Officer synthesises their findings into a structured, actionable report.
              </p>

              {/* Quick stats */}
              <div className="flex justify-center gap-6 mt-8"
                style={{ animation: 'slide-up-fade 0.6s cubic-bezier(0.16,1,0.3,1) 240ms both' }}>
                {[
                  { val: '4', label: 'AI Agents' },
                  { val: '57', label: 'Checklist Items' },
                  { val: '11', label: 'Scored Dimensions' },
                  { val: '6',  label: 'Report Views' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl font-bold font-mono text-white">{s.val}</div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Content ──────────────────────────────────────────────── */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 space-y-16">

            {/* 1. Pipeline */}
            <Reveal>
              <SectionLabel number="1">The Analysis Pipeline</SectionLabel>
              <PipelineDiagram />
            </Reveal>

            {/* 2. Agents */}
            <section>
              <Reveal>
                <SectionLabel number="2">Meet the Agents</SectionLabel>
              </Reveal>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AgentCard id="a1" number="A1" delay={0}
                  name="Completeness & Clarity Analyst"
                  role="Structural review · Writing quality"
                  description="Reads the entire proposal and evaluates it against the completeness checklist. Flags missing sections, unclear language, scope gaps, unquantified assumptions, and unexplained jargon."
                  checks={['Section Completeness','Writing Quality','Scope Clarity','Jargon Usage','Assumption Coverage']}
                  outputs={['Section-by-section audit','Writing issues list','Scope gap flags','Completeness score (0–10)']}
                />
                <AgentCard id="a2" number="A2" delay={80}
                  name="Commercial Integrity Analyst"
                  role="Pricing · Estimation · Commercial terms"
                  description="Scrutinises commercial and financial elements. Checks whether all project phases are costed, estimates are justifiable, and pricing tables are arithmetically consistent."
                  checks={['Phase Coverage','Estimation Rigour','Pricing Completeness','Arithmetic Checks','Commercial Model']}
                  outputs={['Missing phases list','Pricing gap flags','Arithmetic anomalies','Commercial score (0–10)']}
                />
                <AgentCard id="a3" number="A3" delay={160}
                  name="Competitive Strength Analyst"
                  role="Positioning · Differentiation · Client fit"
                  description="Evaluates whether this proposal would actually win the business. Checks differentiation, alignment with client priorities, and whether risks are surfaced honestly."
                  checks={['Client Fit','Differentiation','Risk Transparency','Credibility','Narrative Flow']}
                  outputs={['Differentiation assessment','Client alignment gaps','Risk flags','Competitive score (0–10)']}
                />
                <AgentCard id="a4" number="A4" delay={240}
                  name="Chief Proposal Review Officer"
                  role="Synthesis · Weighting · Final verdict"
                  description="Orchestrator that reads all three specialist reports, applies industry-appropriate weights, identifies cross-agent double-flagged issues, checks consistency, and delivers the final verdict."
                  checks={['Cross-consistency','Double-flagged issues','Dynamic weighting','Score calibration']}
                  outputs={['Overall score (0–10)','Verdict + plain-English summary','Priority action plan','Top 3 strengths','Rewrite suggestions']}
                />
              </div>
            </section>

            {/* 3. Complete Checklist */}
            <Reveal>
              <SectionLabel number="3">The Complete Evaluation Checklist</SectionLabel>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                Every proposal is evaluated against 57 structured checklist items across three sheets.
                Each item is marked <span className="text-green-400 font-medium">Covered</span>, <span className="text-yellow-400 font-medium">Partial</span>, or <span className="text-red-400 font-medium">Missing</span> and tracked in your report.
              </p>
              <ChecklistSection />
            </Reveal>

            {/* 4. Scoring */}
            <section>
              <Reveal>
                <SectionLabel number="4">Scoring Mechanism</SectionLabel>
              </Reveal>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-6">
                <Reveal delay={0}>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-full">
                    <h3 className="text-sm font-semibold text-white mb-4">How the Overall Score is Built</h3>
                    <ol className="space-y-3">
                      {[
                        ['Each agent scores 0–10','A1 scores completeness, A2 commercial integrity, A3 competitive strength.'],
                        ['11 sub-dimensions scored','Granular scores (Writing Quality, Estimation Rigour…) feed the agent totals.'],
                        ['Dynamic weights applied','Industry-specific weights — e.g. Government bids weight compliance higher.'],
                        ['Weighted average → Overall','Three agent scores combine into a single 0–10 overall score.'],
                      ].map(([title, desc], i) => (
                        <li key={title} className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-blue-950 border border-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-blue-400 text-[9px] font-bold">{i+1}</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-200">{title}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{desc}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </Reveal>
                <Reveal delay={100}>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-full">
                    <h3 className="text-sm font-semibold text-white mb-3">Dynamic Weighting by Sector</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4">When Agent 4 detects an industry, it adjusts weights so the verdict reflects what matters for that type of bid.</p>
                    <div className="space-y-2">
                      {[
                        ['Government / Public Sector','Compliance and completeness carry extra weight'],
                        ['Technology / Software','Technical scope and estimation rigour boosted'],
                        ['Professional Services','Competitive differentiation and credibility elevated'],
                        ['Healthcare / Regulated','Risk transparency and assumptions weighted higher'],
                      ].map(([sector, note]) => (
                        <div key={sector} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5 text-xs flex-shrink-0">▸</span>
                          <div>
                            <span className="text-xs font-medium text-gray-300">{sector}: </span>
                            <span className="text-[11px] text-gray-500">{note}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              </div>
              <Reveal delay={150}>
                <h3 className="text-sm font-semibold text-white mb-3">The 11 Scored Dimensions</h3>
                <DimensionGrid />
              </Reveal>
            </section>

            {/* 5. Verdicts */}
            <Reveal>
              <SectionLabel number="5">Verdict Thresholds</SectionLabel>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                After computing the overall score, Agent 4 maps it to one of three verdicts. These thresholds are fixed and do not vary by industry or proposal type.
              </p>
              <ScoringTable />
            </Reveal>

            {/* 6. Report views */}
            <Reveal>
              <SectionLabel number="6">The 6 Report Views</SectionLabel>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                Every completed analysis generates a report with 6 views — each designed for a different audience or use case.
              </p>
              <ReportViewsGrid />
            </Reveal>

            {/* Footer note */}
            <Reveal>
              <div className="border-t border-gray-800 pt-8 text-center">
                <p className="text-sm text-gray-700">
                  NaviSpark uses large language models to perform analysis. All verdicts should be reviewed by the proposal team before submission decisions are made.
                </p>
              </div>
            </Reveal>

          </div>
        </>
      )}
    </div>
  )
}
