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
      {/* Pipeline choice */}
      <div className="grid grid-cols-2 gap-4">
        <Sk w="w-full" h="h-24" rounded="rounded-2xl" />
        <Sk w="w-full" h="h-24" rounded="rounded-2xl" />
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

// ── Standard pipeline diagram ─────────────────────────────────────────────────

function PipelineDiagram() {
  const steps = [
    { icon: '📄', label: 'Upload Proposal',      sub: 'PDF, PPTX, or Word document',             color: '#60a5fa' },
    { icon: '⚡', label: 'Cache Agent',           sub: 'Seeds Bedrock cache — always runs first', color: '#fcd34d' },
    { icon: '🤖', label: '3 Agents in Parallel', sub: 'Completeness · Commercial · Competitive',  color: '#818cf8' },
    { icon: '👁',  label: 'Chief Review Officer', sub: 'Synthesises all findings',                color: '#fb923c' },
    { icon: '📊', label: 'Multi-View Report',     sub: '6 views + action plan',                   color: '#34d399' },
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

// ── Custom pipeline diagram — two-phase flow ──────────────────────────────────

function CustomPipelineDiagram() {
  const phase1 = [
    { icon: '📎', label: 'Upload Files',     sub: 'Proposal + your checklist file',           color: '#60a5fa' },
    { icon: '⚡', label: 'Cache Agent',       sub: 'Seeds Bedrock cache — always runs first',  color: '#fcd34d' },
    { icon: '🔍', label: 'NC1 + NC2',         sub: 'Document & checklist intel (parallel)',    color: '#818cf8' },
    { icon: '✅', label: 'Review & Confirm',  sub: 'Verify auto-detected context',             color: '#34d399' },
  ]
  const phase2 = [
    { icon: '🤖', label: 'NC3 Evaluation',   sub: 'Per-category fan-out (up to 8 parallel)', color: '#c084fc' },
    { icon: '🔬', label: 'NCR Specialists',  sub: 'NCR1 · NCR2 · NCR3 deep review',          color: '#f472b6' },
    { icon: '🧠', label: 'NC4 Synthesis',    sub: 'Weighted scoring + verdict engine',        color: '#fb923c' },
    { icon: '📊', label: 'Custom Report',    sub: 'Tailored entirely to your checklist',      color: '#34d399' },
  ]
  const Arrow = () => (
    <div className="flex items-center px-1.5 text-gray-700">
      <div className="w-4 h-px bg-gray-700" />
      <svg width="7" height="7" viewBox="0 0 7 7" fill="currentColor"><path d="M0 0l7 3.5-7 3.5z"/></svg>
    </div>
  )
  return (
    <div className="space-y-3">
      {/* Phase 1 */}
      <div className="bg-blue-950/20 border border-blue-900/40 rounded-2xl p-4">
        <div className="text-[9px] font-mono text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          Phase 1 · Preflight — runs automatically after upload
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {phase1.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <PipelineStep {...step} delay={i * 100} />
              {i < phase1.length - 1 && <Arrow />}
            </div>
          ))}
        </div>
      </div>
      {/* Human gate connector */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-1">
          <div className="w-px h-3 bg-gray-700" />
          <span className="text-[9px] font-mono text-gray-600 px-3 py-1 rounded-full border border-gray-800 bg-gray-900">
            user confirms or edits detected context
          </span>
          <div className="w-px h-3 bg-gray-700" />
        </div>
      </div>
      {/* Phase 2 */}
      <div className="bg-purple-950/20 border border-purple-900/40 rounded-2xl p-4">
        <div className="text-[9px] font-mono text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          Phase 2 · Evaluation — triggered by user
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {phase2.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <PipelineStep {...step} delay={(i + phase1.length) * 100} />
              {i < phase2.length - 1 && <Arrow />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Standard agent card ───────────────────────────────────────────────────────

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

// ── Custom pipeline agent card ────────────────────────────────────────────────

const NC_AGENT_THEME = {
  nc1:  { border: 'border-sky-800/60',    bg: 'bg-sky-950/25',    accent: 'bg-sky-500',    text: 'text-sky-300',    glow: 'rgba(14,165,233,0.12)'  },
  nc2:  { border: 'border-violet-800/60', bg: 'bg-violet-950/25', accent: 'bg-violet-500', text: 'text-violet-300', glow: 'rgba(139,92,246,0.12)'  },
  nc3:  { border: 'border-emerald-800/60',bg: 'bg-emerald-950/25',accent: 'bg-emerald-500',text: 'text-emerald-300',glow: 'rgba(16,185,129,0.12)'  },
  nc4:  { border: 'border-orange-800/60', bg: 'bg-orange-950/25', accent: 'bg-orange-500', text: 'text-orange-300', glow: 'rgba(249,115,22,0.12)'  },
  ncr1: { border: 'border-indigo-800/60', bg: 'bg-indigo-950/25', accent: 'bg-indigo-500', text: 'text-indigo-300', glow: 'rgba(99,102,241,0.12)'  },
  ncr2: { border: 'border-purple-800/60', bg: 'bg-purple-950/25', accent: 'bg-purple-500', text: 'text-purple-300', glow: 'rgba(168,85,247,0.12)'  },
  ncr3: { border: 'border-teal-800/60',   bg: 'bg-teal-950/25',   accent: 'bg-teal-500',   text: 'text-teal-300',  glow: 'rgba(20,184,166,0.12)'  },
}

function NcAgentCard({ id, number, name, role, description, checks, outputs, delay }) {
  const t = NC_AGENT_THEME[id]
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
            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-2">Responsibilities</p>
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
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="text-base font-bold text-white">Complete Evaluation Checklist</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalAll} items across 3 sheets · {Object.values(CHECKLIST).flat().filter(i => i.mandatory).length} mandatory
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 text-xs font-mono">
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
    <div className="overflow-x-auto rounded-2xl border border-gray-800 -mx-1 px-1">
      <table className="w-full min-w-[480px] text-sm">
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

// ── Chunking strategy fallback section ───────────────────────────────────────

function ChunkingSection() {
  return (
    <div className="space-y-5">

      {/* Three overview cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Reveal delay={0}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-full">
            <div className="text-2xl mb-3">📐</div>
            <h3 className="text-sm font-bold text-white mb-2">What Is the Chunking Fallback?</h3>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              When a proposal exceeds <span className="text-white font-medium">90 pages or slides</span>, sending the
              full document to Bedrock in a single call would exceed the model's context window. The chunking fallback
              automatically kicks in: it splits the document into overlapping segments, summarises each one individually,
              and merges the summaries into a single structured context that all analysis agents read instead.
            </p>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="bg-violet-950/20 border border-violet-900/40 rounded-2xl p-5 h-full">
            <div className="text-2xl mb-3">🔀</div>
            <h3 className="text-sm font-bold text-violet-300 mb-2">When Does It Trigger?</h3>
            <p className="text-[12px] text-gray-400 leading-relaxed mb-3">
              The system counts the pages (PDF) or slides (PPTX) in your uploaded file before starting any analysis:
            </p>
            <div className="space-y-2">
              {[
                { label: '≤ 90 pages', result: 'Normal flow — raw file sent directly to agents', color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-900/50' },
                { label: '> 90 pages', result: 'Chunking fallback activates automatically', color: 'text-violet-400', bg: 'bg-violet-950/30 border-violet-900/50' },
              ].map(({ label, result, color, bg }) => (
                <div key={label} className={`rounded-lg border px-3 py-2 ${bg}`}>
                  <p className={`text-[10px] font-mono font-bold ${color}`}>{label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{result}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={160}>
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-2xl p-5 h-full">
            <div className="text-2xl mb-3">⚠️</div>
            <h3 className="text-sm font-bold text-amber-300 mb-2">Impact on the Cache Agent</h3>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              When chunking is active, the <span className="font-mono text-amber-300">cache_agent</span> is automatically
              skipped. Bedrock prompt caching works on raw document bytes — chunking replaces those bytes with a merged
              JSON summary, so there is no single document object to cache. Instead, each chunk summarisation call goes
              directly to Bedrock at standard token rates.
            </p>
          </div>
        </Reveal>
      </div>

      {/* Normal flow vs Chunking flow */}
      <Reveal delay={0}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Normal flow */}
          <div className="bg-emerald-950/15 border border-emerald-900/30 rounded-2xl p-5">
            <div className="mb-4">
              <span className="text-[10px] font-mono font-bold text-emerald-400 px-2.5 py-1 rounded border border-emerald-900/50 bg-emerald-950/40">
                NORMAL FLOW — ≤ 90 PAGES
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { step: '1', label: 'Raw file → Cache Agent', desc: 'Full PDF/PPTX/DOCX seeded into Bedrock prompt cache.' },
                { step: '2', label: 'Agents read from cache', desc: 'A1, A2, A3 read the cached document at ~10 % token cost.' },
                { step: '3', label: 'A4 synthesises', desc: 'Chief Review Officer aggregates all agent findings.' },
              ].map(({ step, label, desc }) => (
                <div key={step} className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald-400 text-[9px] font-bold">{step}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-200">{label}</p>
                    <p className="text-[10px] text-gray-500 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chunking flow */}
          <div className="bg-violet-950/15 border border-violet-900/30 rounded-2xl p-5">
            <div className="mb-4">
              <span className="text-[10px] font-mono font-bold text-violet-400 px-2.5 py-1 rounded border border-violet-900/50 bg-violet-950/40">
                CHUNKING FALLBACK — &gt; 90 PAGES
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { step: '1', label: 'Document split into chunks', desc: '20-page overlapping segments created (3-page overlap to preserve context at boundaries).' },
                { step: '2', label: 'Each chunk summarised (serial)', desc: 'One Bedrock call per chunk, with a 3-second delay between calls to respect TPM limits.' },
                { step: '3', label: 'Summaries merged into context', desc: 'All chunk summaries combined into a single structured JSON — no Bedrock call is skipped.' },
                { step: '4', label: 'Agents receive merged context', desc: 'A1, A2, A3 read the unified JSON instead of raw bytes. A4 aggregates as normal.' },
              ].map(({ step, label, desc }) => (
                <div key={step} className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-violet-950 border border-violet-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-violet-400 text-[9px] font-bold">{step}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-200">{label}</p>
                    <p className="text-[10px] text-gray-500 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </Reveal>

      {/* Overlap detail */}
      <Reveal delay={60}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">How the Overlap Works — No Context Lost at Boundaries</h3>
          <p className="text-xs text-gray-400 leading-relaxed mb-5">
            Chunks are not cut at hard page boundaries. Every chunk overlaps the previous one by 3 pages so that
            content that spans a boundary (a table that starts on page 19 and ends on page 21, for example) is
            fully captured in at least one chunk's summary. The overlap prevents information loss that would occur
            with strict non-overlapping splits.
          </p>
          <div className="overflow-x-auto">
            <div className="min-w-[420px] space-y-1.5">
              {[
                { label: 'Chunk 1', pages: 'Pages 1 – 20',  overlap: null },
                { label: 'Chunk 2', pages: 'Pages 18 – 37', overlap: 'Pages 18–20 shared with Chunk 1' },
                { label: 'Chunk 3', pages: 'Pages 35 – 54', overlap: 'Pages 35–37 shared with Chunk 2' },
                { label: 'Chunk 4', pages: 'Pages 52 – 71', overlap: 'Pages 52–54 shared with Chunk 3' },
                { label: '…',       pages: 'continues',     overlap: null },
              ].map(({ label, pages, overlap }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-gray-500 w-14 flex-shrink-0">{label}</span>
                  <div className="flex-1 flex items-center gap-1 min-w-0">
                    {overlap && (
                      <div className="w-12 h-6 bg-violet-900/40 border border-violet-800/50 rounded-l flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] text-violet-400 font-mono">overlap</span>
                      </div>
                    )}
                    <div className={`flex-1 h-6 bg-blue-900/30 border border-blue-800/40 ${overlap ? 'rounded-r' : 'rounded'} flex items-center px-2`}>
                      <span className="text-[10px] text-blue-300">{pages}</span>
                    </div>
                  </div>
                  {overlap && (
                    <span className="text-[9px] text-gray-700 hidden sm:block flex-shrink-0">{overlap}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* What each chunk summary preserves */}
      <Reveal delay={80}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">What Each Chunk Summary Preserves</h3>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            When Bedrock summarises a chunk it is instructed to capture specific structured fields — not a free-form
            paragraph — so the merged context is machine-readable and analysis agents can reliably extract data from it.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { field: 'sections_found',       desc: 'All headings and slide titles in the chunk' },
              { field: 'key_claims',            desc: 'Every assertion with its location in the doc' },
              { field: 'figures_and_numbers',   desc: 'Costs, estimates, timelines, percentages — exact values preserved' },
              { field: 'scope_items',           desc: 'Every deliverable, feature, and work item' },
              { field: 'risks',                 desc: 'All risk mentions, even passing ones, with mitigation flag' },
              { field: 'commercial_terms',      desc: 'Pricing model, payment terms, margin references' },
            ].map(({ field, desc }) => (
              <div key={field} className="bg-gray-950 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors">
                <p className="text-[10px] font-mono text-violet-400 mb-1">{field}</p>
                <p className="text-[10px] text-gray-500 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* NC3 own chunking note */}
      <Reveal delay={0}>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-gray-600 text-xs flex-shrink-0 mt-0.5">ℹ</span>
          <div>
            <p className="text-[11px] font-semibold text-gray-300 mb-1">NC3 has its own lightweight context-window chunking (Custom Pipeline only)</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              The Custom Pipeline's <span className="font-mono text-gray-400">NC3</span> agent uses a separate, simpler chunking
              strategy that is not about summarisation — it is about <span className="text-gray-300">context-window safety</span>.
              NC3 splits the proposal text into ~3,000-character segments, scores each segment for relevance to the checklist
              category being evaluated, and selects the highest-scoring segments up to an 80,000-character limit. Non-contiguous
              segments are separated with a <span className="font-mono text-gray-400">[...section omitted...]</span> marker so the
              agent knows text was skipped. This means NC3 always reads the most relevant parts of the proposal for each category,
              regardless of how long the document is — without ever summarising or losing the original wording.
            </p>
          </div>
        </div>
      </Reveal>

    </div>
  )
}

// ── Cache agent dedicated section ─────────────────────────────────────────────

function CacheAgentSection() {
  return (
    <div className="space-y-5">

      {/* Three-card overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Reveal delay={0}>
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-2xl p-5 h-full">
            <div className="text-2xl mb-3">⚡</div>
            <h3 className="text-sm font-bold text-amber-300 mb-2">What is the Cache Agent?</h3>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              A dedicated pre-flight agent that runs <span className="text-white font-medium">before any analysis agent</span> in
              both the Standard and Custom pipelines. Its only job is to send your proposal document to AWS Bedrock with a
              special "cache this" instruction — so every analysis agent that follows never has to re-send the full document.
            </p>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-full">
            <div className="text-2xl mb-3">🔧</div>
            <h3 className="text-sm font-bold text-white mb-2">How Does It Work?</h3>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              AWS Bedrock supports <span className="text-white font-medium">prompt caching</span> — you can mark part of a prompt
              as cacheable and Bedrock stores it server-side. The Cache Agent sends your document with this cache-control marker,
              priming the cache before A1–A4 (or NC1–NC4 + NCR1–3) start. Each subsequent agent then sends only its
              question; Bedrock fetches the document from cache automatically.
            </p>
          </div>
        </Reveal>
        <Reveal delay={160}>
          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-2xl p-5 h-full">
            <div className="text-2xl mb-3">💰</div>
            <h3 className="text-sm font-bold text-emerald-300 mb-2">Why Does This Save Cost?</h3>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              Without caching, every agent re-sends the full document with its prompt — paying full input token rates every
              single time. With the Cache Agent, the document is sent once and cached; all subsequent agents read from cache
              at <span className="text-emerald-400 font-medium">approximately 10 % of the normal input price</span> per token.
            </p>
          </div>
        </Reveal>
      </div>

      {/* Before / After visual cost comparison */}
      <Reveal delay={0}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Without cache */}
          <div className="bg-red-950/15 border border-red-900/30 rounded-2xl p-5">
            <div className="mb-4">
              <span className="text-[10px] font-mono font-bold text-red-400 px-2.5 py-1 rounded border border-red-900/50 bg-red-950/40">
                WITHOUT CACHE AGENT
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
              Every agent independently sends the full proposal document along with its own prompt. Each one is billed at full input token rates.
            </p>
            <div className="space-y-2">
              {['A1 / NC1', 'A2 / NC2', 'A3 / NC3', 'A4 / NC4'].map(agent => (
                <div key={agent} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500 w-16 flex-shrink-0">{agent}</span>
                  <div className="flex gap-1 flex-1 min-w-0">
                    <div className="flex-1 h-7 bg-red-900/35 border border-red-800/40 rounded flex items-center px-2 min-w-0">
                      <span className="text-[9px] text-red-400 truncate">Full document — 50,000 tokens</span>
                    </div>
                    <div className="w-16 h-7 bg-gray-800/60 border border-gray-700/60 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] text-gray-500">+ prompt</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-red-900/30">
              <p className="text-sm font-bold text-red-400">≈ 200,000 document tokens billed</p>
              <p className="text-[10px] text-gray-600 mt-0.5">4 agents × 50,000 tokens each, all at full price</p>
            </div>
          </div>

          {/* With cache */}
          <div className="bg-emerald-950/15 border border-emerald-900/30 rounded-2xl p-5">
            <div className="mb-4">
              <span className="text-[10px] font-mono font-bold text-emerald-400 px-2.5 py-1 rounded border border-emerald-900/50 bg-emerald-950/40">
                WITH CACHE AGENT
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
              Cache Agent sends the document once and marks it as cached. Every other agent only sends its prompt and reads the document from cache at ~10% cost.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-amber-400 w-16 flex-shrink-0 font-bold">⚡ cache</span>
                <div className="flex-1 h-7 bg-amber-900/30 border border-amber-800/40 rounded flex items-center px-2">
                  <span className="text-[9px] text-amber-300">Document sent once → cached in Bedrock</span>
                </div>
              </div>
              {['A1 / NC1', 'A2 / NC2', 'A3 / NC3', 'A4 / NC4'].map(agent => (
                <div key={agent} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500 w-16 flex-shrink-0">{agent}</span>
                  <div className="flex gap-1 flex-1 min-w-0">
                    <div className="w-24 h-7 bg-emerald-900/30 border border-emerald-800/40 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] text-emerald-400 font-medium">cache read</span>
                    </div>
                    <div className="flex-1 h-7 bg-gray-800/60 border border-gray-700/60 rounded flex items-center px-2 min-w-0">
                      <span className="text-[9px] text-gray-500 truncate">+ prompt only</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-900/30">
              <p className="text-sm font-bold text-emerald-400">≈ 70,000 document tokens billed</p>
              <p className="text-[10px] text-gray-600 mt-0.5">50k (cache create) + 4 × 5k (reads at 10%) — 65 % cheaper</p>
            </div>
          </div>

        </div>
      </Reveal>

      {/* First run vs re-run */}
      <Reveal delay={60}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-5">First Analysis vs. Re-analysis</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-900/50 bg-blue-950/30 text-blue-400 mb-3">
                FIRST RUN
              </div>
              <ol className="space-y-3">
                {[
                  ['Cache Agent fires', 'Proposal is sent to Bedrock with a cache-control header. Bedrock creates the cache entry. cache_creation_input_tokens are recorded at full standard input rate.'],
                  ['Analysis agents run', 'A1, A2, A3 (or NC1, NC2, NC3 fan-out, NCR1–3) each read the document from the newly created cache. cache_read_input_tokens are billed at ~10 % of the input rate.'],
                  ['Net cost', '1× full price for the cache creation + N× 10 % price for all agent cache reads. Significant saving even on the very first run.'],
                ].map(([step, desc], i) => (
                  <li key={step} className="flex gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-blue-950 border border-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-400 text-[9px] font-bold">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-200">{step}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-900/50 bg-emerald-950/30 text-emerald-400 mb-3">
                RE-ANALYSIS (SAME PROPOSAL)
              </div>
              <ol className="space-y-3">
                {[
                  ['Cache Agent fires again', "If Bedrock's cache is still warm (within its TTL), the document is already stored — no re-creation charge at all. The Cache Agent simply reads from the existing cache."],
                  ['All agents read from cache', 'Every agent — A1–A4 or NC1–NC4 + NCR1–3 — gets its document tokens from the warm cache at 10 % cost. No agent ever resends the full document.'],
                  ['Net cost', 'N× 10 % only. Maximum savings on every re-run — ideal for iterative proposal revision cycles.'],
                ].map(([step, desc], i) => (
                  <li key={step} className="flex gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-400 text-[9px] font-bold">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-200">{step}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

          </div>
        </div>
      </Reveal>

      {/* Token tracking note */}
      <Reveal delay={0}>
        <div className="flex items-start gap-3 px-4 py-3.5 bg-gray-900/50 border border-gray-800 rounded-xl">
          <span className="text-gray-600 text-xs flex-shrink-0 mt-0.5">ℹ</span>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Every Cache Agent run records four metrics to the <span className="font-mono text-gray-400">token_usage</span> table:
            <span className="text-gray-300 font-mono"> input_tokens</span>,{' '}
            <span className="text-gray-300 font-mono"> output_tokens</span>,{' '}
            <span className="text-gray-300 font-mono"> cache_creation_input_tokens</span>, and{' '}
            <span className="text-gray-300 font-mono"> cache_read_input_tokens</span>.
            All downstream agents (A1–A4 and NC1–NC4 + NCR1–3) are also individually tracked, so you get a complete,
            per-agent cost breakdown for every analysis run — visible in the Admin Panel and session detail view.
          </p>
        </div>
      </Reveal>

    </div>
  )
}

// ── Token caching & cost efficiency section ───────────────────────────────────

function TokenCachingSection() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Reveal delay={0}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-xl">⚡</div>
            <h3 className="text-sm font-semibold text-white">Bedrock Prompt Caching</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            Before any analysis agent runs, a dedicated <span className="text-emerald-400 font-mono font-medium">cache_agent</span> seeds
            AWS Bedrock's prompt cache with your full proposal document. Every subsequent agent reads from that cache
            instead of re-sending the entire document — cutting token cost and latency significantly on every run.
          </p>
          <ol className="space-y-3">
            {[
              ['First analysis', 'Full document is sent to Bedrock; prompt cache is created. Tokens charged at the standard input rate.'],
              ['Re-analysis runs', 'Cache hit — document tokens are read at roughly 10 % of the original cost. Only new prompts cost full price.'],
              ['All agents share the cache', 'A1–A4 in the Standard Pipeline and NC1–NC4 + NCR1–NCR3 in the Custom Pipeline all read from the same cached document.'],
            ].map(([title, desc], i) => (
              <li key={title} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-400 text-[9px] font-bold">{i + 1}</span>
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
          <div className="flex items-center gap-2 mb-4">
            <div className="text-xl">📈</div>
            <h3 className="text-sm font-semibold text-white">Per-Agent Token Tracking</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            Every agent records its exact token usage — input tokens, output tokens, cache creation tokens, and cache read
            tokens — so the true cost of each analysis run is fully transparent and auditable.
          </p>
          <div className="space-y-2.5">
            {[
              { agent: 'cache_agent',       note: 'Tracks cache_creation vs cache_read tokens for the document' },
              { agent: 'nc1 + nc2',         note: 'Preflight token cost: document parsing + checklist parsing' },
              { agent: 'nc3 (fan-out)',      note: 'Per-category token usage aggregated across all parallel instances' },
              { agent: 'ncr1 / ncr2 / ncr3',note: 'Each specialist reviewer logged separately' },
              { agent: 'nc4',               note: 'Synthesis, verdict engine, and report generation' },
            ].map(({ agent, note }) => (
              <div key={agent} className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5 text-xs flex-shrink-0">▸</span>
                <div>
                  <span className="text-xs font-mono font-medium text-gray-300">{agent}: </span>
                  <span className="text-[11px] text-gray-500">{note}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-[10px] text-gray-600">
              Token data is stored per session in the <span className="font-mono text-gray-500">token_usage</span> table and surfaced
              in the admin panel and session detail view.
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  )
}

// ── Real-time progress section ────────────────────────────────────────────────

function RealTimeSection() {
  const events = [
    { label: 'cache_agent', msg: 'Document cached — 50,241 tokens seeded to Bedrock prompt cache',       color: '#34d399', status: 'completed' },
    { label: 'nc1',         msg: 'NC1 complete — 42 sections detected, 6 industries inferred, confidence 92 %', color: '#38bdf8', status: 'completed' },
    { label: 'nc2',         msg: 'NC2 complete — 147 checklist items parsed across 6 weighted categories', color: '#a78bfa', status: 'completed' },
    { label: 'nc3',         msg: 'NC3 evaluating "Technical Architecture" — 3 / 6 categories done',       color: '#4ade80', status: 'running'   },
    { label: 'ncr1',        msg: 'NCR1 Clarity & Completeness review running in parallel',                 color: '#818cf8', status: 'running'   },
    { label: 'nc4',         msg: 'NC4 synthesis pending — waiting for NC3 + NCR to complete',              color: '#fb923c', status: 'pending'   },
  ]
  const statusColor = { completed: '#34d399', running: '#fbbf24', pending: '#4b5563' }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Reveal delay={0}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-xl">🔌</div>
            <h3 className="text-sm font-semibold text-white">WebSocket Live Activity Feed</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            While your proposal is being analysed, a WebSocket connection streams every agent event in real time.
            You see exactly which agent is running, what it found, and when it completed — no page refresh needed.
          </p>
          <div className="space-y-2.5">
            {[
              ['Session-scoped event bus', 'Each analysis session has its own isolated event stream.'],
              ['Late-connect replay', 'Clients that connect mid-analysis receive a cursor-based replay of all past events so no progress is missed.'],
              ['Heartbeat ping', 'A ping is sent every 25 seconds to keep the connection alive through proxies and load balancers.'],
              ['Up to 500 events buffered', 'Events are capped per session to prevent memory bloat on long analyses.'],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5 text-xs flex-shrink-0">▸</span>
                <div>
                  <span className="text-xs font-medium text-gray-300">{title}: </span>
                  <span className="text-[11px] text-gray-500">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
      <Reveal delay={100}>
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden h-full flex flex-col">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2.5 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-mono text-gray-500">ws://… /ws/sessions/{'{id}'}/activity</span>
          </div>
          <div className="divide-y divide-gray-800/40 flex-1 overflow-hidden">
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
                <span className="text-[9px] font-mono text-gray-700 w-10 flex-shrink-0 tabular-nums">
                  {String(i * 4 + 2).padStart(2,'0')}:{String((i * 13) % 60).padStart(2,'0')}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0"
                  style={{ color: e.color, borderColor: e.color + '40', background: e.color + '18' }}>
                  {e.label}
                </span>
                <span className="text-[10px] text-gray-400 flex-1 min-w-0 truncate">{e.msg}</span>
                <span className="text-[9px] font-mono flex-shrink-0" style={{ color: statusColor[e.status] }}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-gray-800 flex-shrink-0">
            <p className="text-[9px] text-gray-700">Error codes: 4001 auth failed · 4004 session not found</p>
          </div>
        </div>
      </Reveal>
    </div>
  )
}

// ── Pipeline choice banner ────────────────────────────────────────────────────

function PipelineChoiceBanner() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Standard */}
      <Reveal delay={0}>
        <div className="bg-blue-950/20 border border-blue-900/50 rounded-2xl p-5 hover:border-blue-700/60 hover:-translate-y-0.5 transition-all duration-200 h-full"
          style={{ boxShadow: '0 0 32px rgba(59,130,246,0.08)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">🏛</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-300">Standard Pipeline</h3>
              <p className="text-[10px] text-gray-600 font-mono">A1 · A2 · A3 → A4</p>
            </div>
          </div>
          <p className="text-[12px] text-gray-400 leading-relaxed mb-3">
            Upload your proposal and get an immediate structured review against NaviSpark's built-in 57-item checklist.
            Best when you don't have a custom evaluation framework.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {['Fixed 57-item checklist','11 scored dimensions','No setup required','PDF, PPTX, DOCX'].map(tag => (
              <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full border border-blue-900/60 text-blue-400 font-medium">{tag}</span>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Custom */}
      <Reveal delay={80}>
        <div className="bg-purple-950/20 border border-purple-900/50 rounded-2xl p-5 hover:border-purple-700/60 hover:-translate-y-0.5 transition-all duration-200 h-full"
          style={{ boxShadow: '0 0 32px rgba(168,85,247,0.08)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">🎯</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-purple-300">Custom Checklist Pipeline</h3>
              <p className="text-[10px] text-gray-600 font-mono">NC1 · NC2 → NC3 + NCR → NC4</p>
            </div>
          </div>
          <p className="text-[12px] text-gray-400 leading-relaxed mb-3">
            Upload your proposal <em>and</em> your own checklist file (Excel, CSV, Word, or PDF).
            NaviSpark parses your criteria, auto-detects weights, and evaluates your proposal entirely against your framework.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {['Bring your own checklist','Dynamic scoring weights','Context auto-detection','User confirmation step'].map(tag => (
              <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full border border-purple-900/60 text-purple-400 font-medium">{tag}</span>
            ))}
          </div>
        </div>
      </Reveal>
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
                Two specialised AI pipelines review your proposal — one against a built-in 57-item checklist,
                one against your own custom evaluation framework. A shared Cache Agent cuts re-analysis token
                costs by up to 90 %, and an automatic chunking fallback handles proposals of any size.
              </p>

              {/* Quick stats */}
              <div className="flex flex-wrap justify-center gap-5 sm:gap-6 mt-8"
                style={{ animation: 'slide-up-fade 0.6s cubic-bezier(0.16,1,0.3,1) 240ms both' }}>
                {[
                  { val: '2',    label: 'Pipelines' },
                  { val: '11',   label: 'AI Agents' },
                  { val: '~90%', label: 'Re-run Savings' },
                  { val: '6',    label: 'Report Views' },
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

            {/* 1. Choose your pipeline */}
            <Reveal>
              <SectionLabel number="1">Choose Your Pipeline</SectionLabel>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                NaviSpark offers two distinct ways to review a proposal. Both pipelines share the same underlying
                AWS Bedrock infrastructure, produce a scored report with a clear verdict, and support PDF, PPTX, and Word uploads.
              </p>
              <PipelineChoiceBanner />
            </Reveal>

            {/* 2. Cache Agent */}
            <section>
              <Reveal>
                <SectionLabel number="2">Cache Agent — How It Cuts Token Cost</SectionLabel>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  The <span className="text-amber-400 font-mono font-medium">cache_agent</span> is the first thing that runs in
                  both pipelines — before any analysis agent touches your proposal. It exists for one reason: to seed AWS
                  Bedrock's prompt cache with your document so that every analysis agent that follows can read from that cache
                  instead of re-sending the full document, dramatically reducing token consumption and cost.
                </p>
              </Reveal>
              <CacheAgentSection />
            </section>

            {/* 3. Chunking fallback */}
            <section>
              <Reveal>
                <SectionLabel number="3">Chunking Strategy — Large Document Fallback</SectionLabel>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  Not every proposal fits in a single Bedrock call. When a document exceeds 90 pages or slides,
                  NaviSpark automatically switches to a <span className="text-white font-medium">chunking fallback</span> — splitting
                  the document into overlapping segments, summarising each one individually, and merging the results into a
                  single structured context that all analysis agents read. This happens entirely in the background; you
                  see the same report regardless of whether chunking was used.
                </p>
              </Reveal>
              <ChunkingSection />
            </section>

            {/* 4. Standard pipeline */}
            <section>
              <Reveal>
                <SectionLabel number="4">Standard Pipeline</SectionLabel>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  The Standard Pipeline runs three specialist agents in parallel, then a Chief Review Officer synthesises their
                  findings into a single weighted score, verdict, and priority action plan — all in one pass.
                </p>
                <PipelineDiagram />
              </Reveal>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-8">
                <AgentCard id="a1" number="A1" delay={0}
                  name="Completeness & Clarity Analyst"
                  role="Structural review · Writing quality"
                  description="Reads the entire proposal and evaluates it against the completeness checklist. Flags missing sections, unclear language, scope gaps, unquantified assumptions, and unexplained jargon. Also produces targeted rewrite suggestions."
                  checks={['Section Completeness','Writing Quality','Scope Clarity','Jargon Usage','Assumption Coverage']}
                  outputs={['Section-by-section audit','Writing issues list','Scope gap flags','Completeness score (0–10)']}
                />
                <AgentCard id="a2" number="A2" delay={80}
                  name="Commercial Integrity Analyst"
                  role="Pricing · Estimation · Commercial terms"
                  description="Scrutinises all commercial and financial elements. Checks whether every project phase is costed, whether estimates are methodology-backed, and whether pricing tables are arithmetically consistent — including internal margin visibility."
                  checks={['Phase Coverage','Estimation Rigour','Pricing Completeness','Arithmetic Checks','Commercial Model']}
                  outputs={['Missing phases list','Pricing gap flags','Arithmetic anomalies','Commercial score (0–10)']}
                />
                <AgentCard id="a3" number="A3" delay={160}
                  name="Competitive Strength Analyst"
                  role="Positioning · Differentiation · Client fit"
                  description="Evaluates whether this proposal would actually win the business. Checks differentiation, alignment with stated client priorities, and whether risks and dependencies are surfaced honestly rather than buried."
                  checks={['Client Fit','Differentiation','Risk Transparency','Credibility','Narrative Flow']}
                  outputs={['Differentiation assessment','Client alignment gaps','Risk flags','Competitive score (0–10)']}
                />
                <AgentCard id="a4" number="A4" delay={240}
                  name="Chief Proposal Review Officer"
                  role="Synthesis · Dynamic weighting · Final verdict"
                  description="Orchestrator that reads all three specialist reports, applies industry-appropriate weights, identifies issues flagged by multiple agents independently, checks cross-agent consistency, and delivers the final verdict and executive summary."
                  checks={['Cross-consistency','Double-flagged issues','Dynamic weighting','Score calibration']}
                  outputs={['Overall score (0–10)','Verdict + plain-English summary','Priority action plan','Top 3 strengths','Rewrite suggestions']}
                />
              </div>
            </section>

            {/* 5. Custom checklist pipeline */}
            <section>
              <Reveal>
                <SectionLabel number="5">Custom Checklist Pipeline</SectionLabel>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  The Custom Checklist Pipeline is designed for teams that already have an evaluation framework — an RFP scoring
                  sheet, a procurement checklist, or a client-specific rubric. Upload it alongside the proposal and NaviSpark
                  builds its entire evaluation around your criteria. The pipeline runs in two distinct phases with a human
                  confirmation step in between.
                </p>
                <CustomPipelineDiagram />
              </Reveal>

              {/* Phase 1 agents */}
              <Reveal delay={50}>
                <div className="mt-8 mb-3">
                  <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest px-2 py-1 rounded-full border border-blue-900/50 bg-blue-950/30">
                    Phase 1 Agents — Preflight
                  </span>
                </div>
              </Reveal>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
                <NcAgentCard id="nc1" number="NC1" delay={0}
                  name="Document Intelligence Agent"
                  role="Auto-detection · Structure mapping · Quality pre-scan"
                  description="Reads the uploaded proposal and automatically infers everything NaviSpark needs to know: client industry, proposal type, client priorities, project metadata (timeline, budget, team size), and a structural map of all sections. A confidence score is computed for every inference so you know which values to review before the analysis runs."
                  checks={['ProposalStructureMapper','ContextAutoDetector','ProjectMetadataExtractor','DocumentQualityPrescanner','ConfidenceScorer']}
                  outputs={['Auto-detected context (industry, type, priorities)','Section map + slide count','Missing section flags','Confidence score (0–1) per inference']}
                />
                <NcAgentCard id="nc2" number="NC2" delay={80}
                  name="Checklist Intelligence Agent"
                  role="Format detection · Criteria extraction · Evaluation framework"
                  description="Parses your uploaded checklist file — whether it is an Excel spreadsheet, CSV, Word document, or PDF — and converts it into a structured evaluation framework. Detects scoring types (binary, 1–5 scale, weighted), extracts category weights defined by you, groups items into categories, and writes dynamic LLM evaluation prompts per category. If NC1 context is available, prompts are enriched with industry and client priority context."
                  checks={['FormatDetectorParser','CriteriaExtractor','CategoryGrouper','WeightScoringSchemaExtractor','EvaluationFrameworkBuilder']}
                  outputs={['Structured checklist (categories + items + weights)','Scoring type detection','Dynamic evaluation prompts per category','Parse warnings for ambiguous rows']}
                />
              </div>

              {/* Confirmation note */}
              <Reveal delay={100}>
                <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
                  <span className="text-amber-400 text-base flex-shrink-0 mt-0.5">✋</span>
                  <div>
                    <p className="text-xs font-semibold text-amber-300 mb-1">Human confirmation step</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      After NC1 and NC2 complete, you are shown the auto-detected context before the evaluation starts.
                      You can review and edit the inferred industry, proposal type, client priorities, and other metadata.
                      Only after you confirm (or adjust) these values does Phase 2 begin. This ensures the scoring is
                      always grounded in the right context.
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* Phase 2 agents */}
              <Reveal delay={50}>
                <div className="mb-3">
                  <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest px-2 py-1 rounded-full border border-purple-900/50 bg-purple-950/30">
                    Phase 2 Agents — Evaluation
                  </span>
                </div>
              </Reveal>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NcAgentCard id="nc3" number="NC3" delay={0}
                  name="Proposal Evaluator — Fan-out"
                  role="Per-category evaluation · Evidence linking · Partial credit"
                  description="One NC3 instance is spawned per checklist category and all instances run concurrently (up to 8 parallel Bedrock calls to avoid throttling). Each instance evaluates every item in its category against the proposal text, producing PASS / PARTIAL / FAIL judgements with supporting evidence quotes and gap descriptions. Partial credit scoring handles requirements that are mentioned but not fully addressed."
                  checks={['ItemEvaluator','EvidenceLinker','PartialCreditScorer','GapNarrativeWriter']}
                  outputs={['Per-item PASS / PARTIAL / FAIL status','Evidence quotes from proposal text','Partial credit scores (0–1)','Gap narrative per failed item']}
                />
                <NcAgentCard id="nc4" number="NC4" delay={80}
                  name="Custom Chief Review Officer"
                  role="Weighted aggregation · Verdict engine · Executive summary"
                  description="Aggregates all NC3 per-category results using the weights detected by NC2, checks for cross-category consistency, identifies the top 3 strengths and priority action items, maps custom categories to 15 standard radar dimensions for visualisation, then produces the final verdict and a plain-English executive summary. NC4 also incorporates specialist findings from NCR1–NCR3 when available."
                  checks={['WeightedScoreAggregator','CrossChecklistConsistencyCheck','PriorityActionGenerator','StrengthsIdentifier','VerdictEngine','DimensionMapper','ExecutiveSummaryGenerator']}
                  outputs={['Overall score (0–10)','Verdict: READY / NEEDS REVISION / DO NOT SEND','Must-fix · Should-fix · Next-time actions','Top 3 strengths','Plain-English executive summary']}
                />
                <NcAgentCard id="ncr1" number="NCR1" delay={160}
                  name="Clarity & Completeness Specialist"
                  role="Parallel deep-dive · Section audit · Writing quality"
                  description="Runs alongside NC3 (not sequentially) and performs a deep structural review independent of the custom checklist. Audits mandatory sections, flags vague or unsubstantiated language with exact quotes and severity levels, identifies scope clarity issues, and surfaces high-risk assumptions. Also generates a targeted rewrite example for the weakest section."
                  checks={['Section Completeness','Writing Quality','Scope Clarity','High-Risk Assumptions']}
                  outputs={['Section audit (COVERED / MISSING per section)','Writing issues with quote, location, severity','Scope clarity gaps','Rewrite example for weakest section']}
                />
                <NcAgentCard id="ncr2" number="NCR2" delay={240}
                  name="Commercial Strength Specialist"
                  role="Parallel deep-dive · Estimation · Pricing strategy"
                  description="Deep-dives into the commercial quality of the proposal: whether pricing is realistic and detailed, whether estimates are properly justified, and whether the value proposition and ROI are clearly articulated. Findings are merged into NC4's priority action plan."
                  checks={['Estimation Quality','Pricing Strategy','Cost-Benefit Clarity']}
                  outputs={['Estimation quality assessment','Pricing gap analysis','ROI / value clarity score','Commercial strength score (0–10)']}
                />
                <NcAgentCard id="ncr3" number="NCR3" delay={320}
                  name="Competitive Position Specialist"
                  role="Parallel deep-dive · Client fit · Differentiation"
                  description="Evaluates whether the proposal would win against competitors: how well it addresses the specific client's needs, how transparently risks and dependencies are disclosed, and how clearly the vendor differentiates itself from a generic response. Runs in parallel with NCR1 and NCR2."
                  checks={['Client Fit','Risk Transparency','Competitive Differentiation']}
                  outputs={['Client alignment score','Risk disclosure assessment','Differentiation quality score','Competitive position score (0–10)']}
                />
              </div>

              {/* NCR resilience note */}
              <Reveal delay={150}>
                <div className="mt-4 bg-gray-900/40 border border-gray-800 rounded-xl px-5 py-3.5 flex items-start gap-3">
                  <span className="text-gray-600 text-xs flex-shrink-0 mt-0.5">ℹ</span>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    NCR1, NCR2, and NCR3 are <span className="text-gray-300 font-medium">non-fatal</span> — if any specialist
                    reviewer fails, NC4 still produces a complete verdict using NC3's category results. A category-level
                    NC3 failure is also non-fatal: that category is marked with an error status and the remaining categories
                    continue. Only an NC1 or NC2 failure halts the pipeline entirely, since the evaluation framework cannot
                    be built without them.
                  </p>
                </div>
              </Reveal>
            </section>

            {/* 6. Complete checklist (standard pipeline) */}
            <Reveal>
              <SectionLabel number="6">Built-in Evaluation Checklist (Standard Pipeline)</SectionLabel>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                The Standard Pipeline evaluates every proposal against 57 structured checklist items across three sheets.
                Each item is marked <span className="text-green-400 font-medium">Covered</span>, <span className="text-yellow-400 font-medium">Partial</span>, or <span className="text-red-400 font-medium">Missing</span> and tracked in your report.
                When using the Custom Pipeline, this checklist is replaced entirely by your own file.
              </p>
              <ChecklistSection />
            </Reveal>

            {/* 7. Scoring */}
            <section>
              <Reveal>
                <SectionLabel number="7">Scoring Mechanism</SectionLabel>
              </Reveal>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-6">
                <Reveal delay={0}>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-full">
                    <h3 className="text-sm font-semibold text-white mb-4">How the Overall Score is Built</h3>
                    <ol className="space-y-3">
                      {[
                        ['Each agent scores 0–10','A1 scores completeness, A2 commercial integrity, A3 competitive strength. In the Custom Pipeline, NC3 scores each category and NCR1–3 score specialist dimensions.'],
                        ['11 sub-dimensions scored','Granular scores (Writing Quality, Estimation Rigour, etc.) feed the agent totals. The Custom Pipeline maps your categories to 15 standard radar dimensions.'],
                        ['Dynamic weights applied','Industry-specific weights are applied — e.g. Government bids weight compliance higher. In the Custom Pipeline, your checklist\'s own weights take precedence.'],
                        ['Weighted average → Overall','Agent scores (or category scores) combine into a single 0–10 overall score using the appropriate weight scheme.'],
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
                    <p className="text-xs text-gray-400 leading-relaxed mb-4">
                      When A4 (Standard Pipeline) or NC4 (Custom Pipeline) detects an industry, it adjusts weights so the verdict reflects what actually matters for that type of bid.
                    </p>
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
                <h3 className="text-sm font-semibold text-white mb-3">The 11 Scored Dimensions (Standard Pipeline)</h3>
                <DimensionGrid />
              </Reveal>
            </section>

            {/* 8. Verdicts */}
            <Reveal>
              <SectionLabel number="8">Verdict Thresholds</SectionLabel>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                After computing the overall score, A4 or NC4 maps it to one of three verdicts. In the Custom Pipeline,
                the threshold logic additionally checks whether any CRITICAL must-fix items are present — a high-scoring
                proposal with a critical gap can still be held back to "Needs Major Revision".
              </p>
              <ScoringTable />
            </Reveal>

            {/* 9. Real-time progress */}
            <section>
              <Reveal>
                <SectionLabel number="9">Real-time Progress Updates</SectionLabel>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  While analysis runs, a WebSocket connection streams every agent event to your browser in real time —
                  including the Cache Agent's cache-creation confirmation, each NC agent's completion, and every
                  NCR specialist's findings as they arrive. No page refresh needed.
                </p>
              </Reveal>
              <RealTimeSection />
            </section>

            {/* 10. Report views */}
            <Reveal>
              <SectionLabel number="10">The 6 Report Views</SectionLabel>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                Every completed analysis — from either pipeline — generates a report with 6 views, each designed for a different audience or use case.
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
