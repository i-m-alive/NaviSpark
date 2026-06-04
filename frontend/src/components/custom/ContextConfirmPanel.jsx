import { useState } from 'react'
import { clsx } from 'clsx'
import { AlertTriangle, CheckCircle2, Edit3, Info } from 'lucide-react'

const INDUSTRIES = [
  'Healthcare', 'Fintech', 'Government', 'Retail', 'Manufacturing',
  'Education', 'Energy', 'Telecommunications', 'Insurance', 'Logistics',
  'Media', 'Real Estate', 'Technology', 'Other',
]

const PROPOSAL_TYPES = [
  'Fixed Price', 'Time & Materials', 'Managed Services',
  'Retainer', 'Hybrid', 'Staff Augmentation',
]

const PRIORITIES = [
  'Cost Certainty', 'Speed to Market', 'Innovation', 'Risk Mitigation',
  'Quality', 'Scalability', 'Security & Compliance', 'Domain Expertise',
]

function FieldRow({ label, children }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3 py-2.5 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 pt-1">{label}</span>
      {children}
    </div>
  )
}

function EditableText({ value, onChange, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  if (editing) {
    return (
      <div className="flex gap-1">
        <input
          className="flex-1 bg-gray-800 border border-blue-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        <button
          onClick={() => { onChange(draft); setEditing(false) }}
          className="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors"
        >✓</button>
        <button
          onClick={() => { setDraft(value || ''); setEditing(false) }}
          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >✕</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <span className={clsx('text-sm', value ? 'text-white' : 'text-gray-600 italic')}>
        {value || placeholder || '—'}
      </span>
      <button
        onClick={() => { setDraft(value || ''); setEditing(true) }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white"
      >
        <Edit3 size={12} />
      </button>
    </div>
  )
}

function MultiSelect({ options, selected = [], onChange, max = 5 }) {
  const toggle = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt))
    } else if (selected.length < max) {
      onChange([...selected, opt])
    }
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt)
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={clsx(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
              active
                ? 'bg-blue-900 text-blue-200 border-blue-700'
                : 'bg-gray-900 text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function ContextConfirmPanel({ nc1Summary, onOverridesChange }) {
  const [overrides, setOverrides] = useState({})

  if (!nc1Summary) return null

  const {
    client_industry = [],
    proposal_type,
    client_priorities = [],
    client_name,
    vendor_name,
    project_name,
    proposed_timeline,
    budget_range,
    team_size,
    delivery_methodology,
    confidence = 0,
    structure_sections = [],
    quality_scan = {},
  } = nc1Summary

  // Merge auto-detected with user overrides
  const effective = {
    client_industry,
    proposal_type,
    client_priorities,
    client_name,
    vendor_name,
    project_name,
    proposed_timeline,
    budget_range,
    team_size,
    delivery_methodology,
    ...overrides,
  }

  const setField = (key, value) => {
    const next = { ...overrides, [key]: value }
    setOverrides(next)
    onOverridesChange?.(next)
  }

  const lowConfidence = confidence < 0.7
  const veryLowConfidence = confidence < 0.4
  const confidencePct = Math.round(confidence * 100)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={15} className="text-blue-400" />
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            NC1 — Detected Context  (review and edit before evaluation)
          </h3>
        </div>
        <div className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
          Object.keys(overrides).length > 0
            ? 'bg-blue-950 text-blue-300 border-blue-700'
            : confidence >= 0.7 ? 'bg-green-950 text-green-300 border-green-800'
            : confidence >= 0.4 ? 'bg-yellow-950 text-yellow-300 border-yellow-800'
            : 'bg-red-950 text-red-300 border-red-800'
        )}>
          {Object.keys(overrides).length > 0
            ? `Editing (NC1: ${confidencePct}%)`
            : `Confidence: ${confidencePct}%`}
        </div>
      </div>

      {/* Confidence warnings */}
      {lowConfidence && !veryLowConfidence && (
        <div className="flex items-start gap-2 p-3 bg-yellow-950/40 border border-yellow-800/50 rounded-lg">
          <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300">
            NC1 confidence is below 70%. Please review the detected values carefully before proceeding.
          </p>
        </div>
      )}
      {veryLowConfidence && (
        <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-800/50 rounded-lg">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">
            NC1 confidence is very low ({confidencePct}%). We strongly recommend reviewing and
            correcting the detected values — incorrect context will affect scoring quality.
          </p>
        </div>
      )}

      {/* Editable fields */}
      <div className="divide-y divide-gray-800">
        <FieldRow label="Client Industry">
          <MultiSelect
            options={INDUSTRIES}
            selected={effective.client_industry}
            onChange={(v) => setField('client_industry', v)}
          />
        </FieldRow>

        <FieldRow label="Proposal Type">
          <div className="flex flex-wrap gap-1.5">
            {PROPOSAL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setField('proposal_type', t)}
                className={clsx(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                  effective.proposal_type === t
                    ? 'bg-blue-900 text-blue-200 border-blue-700'
                    : 'bg-gray-900 text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Client Priorities">
          <MultiSelect
            options={PRIORITIES}
            selected={effective.client_priorities}
            onChange={(v) => setField('client_priorities', v)}
            max={5}
          />
        </FieldRow>

        <FieldRow label="Client Name">
          <EditableText
            value={effective.client_name}
            onChange={(v) => setField('client_name', v)}
            placeholder="Not detected"
          />
        </FieldRow>

        <FieldRow label="Vendor / Bidder">
          <EditableText
            value={effective.vendor_name}
            onChange={(v) => setField('vendor_name', v)}
            placeholder="Not detected"
          />
        </FieldRow>

        <FieldRow label="Project Name">
          <EditableText
            value={effective.project_name}
            onChange={(v) => setField('project_name', v)}
            placeholder="Not detected"
          />
        </FieldRow>

        <FieldRow label="Timeline">
          <EditableText
            value={effective.proposed_timeline}
            onChange={(v) => setField('proposed_timeline', v)}
            placeholder="Not detected"
          />
        </FieldRow>

        <FieldRow label="Budget Range">
          <EditableText
            value={effective.budget_range}
            onChange={(v) => setField('budget_range', v)}
            placeholder="Not detected"
          />
        </FieldRow>

        <FieldRow label="Team Size">
          <EditableText
            value={effective.team_size ? String(effective.team_size) : ''}
            onChange={(v) => setField('team_size', parseInt(v, 10) || null)}
            placeholder="Not detected"
          />
        </FieldRow>

        <FieldRow label="Delivery Method">
          <EditableText
            value={effective.delivery_methodology}
            onChange={(v) => setField('delivery_methodology', v)}
            placeholder="Not detected"
          />
        </FieldRow>
      </div>

      {/* Structure map summary */}
      {structure_sections.length > 0 && (
        <div className="pt-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">
            Detected sections ({structure_sections.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {structure_sections.slice(0, 12).map((s, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-gray-800 text-gray-400 border border-gray-700 rounded">
                {s}
              </span>
            ))}
            {structure_sections.length > 12 && (
              <span className="text-xs text-gray-600">+{structure_sections.length - 12} more</span>
            )}
          </div>
        </div>
      )}

      {/* Quality scan */}
      {quality_scan?.missing_sections?.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-gray-800/60 border border-gray-700 rounded-lg">
          <Info size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Missing key sections</p>
            <div className="flex flex-wrap gap-1.5">
              {quality_scan.missing_sections.map((s, i) => (
                <span key={i} className="text-xs text-orange-400 bg-orange-950/40 border border-orange-800/50 px-2 py-0.5 rounded">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
