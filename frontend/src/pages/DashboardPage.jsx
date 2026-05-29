import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listSessions, deleteSession, deleteSessions } from '../api/client'
import Navbar from '../components/Navbar'
import ProposalCard from '../components/ProposalCard'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  Plus, Search, SlidersHorizontal, Trash2, FileSearch,
  X, CheckSquare, ChevronDown, AlertTriangle,
} from 'lucide-react'

// ── Greeting ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 21) return 'Good evening'
  return 'Working late'
}

function firstName(user) {
  // OAuth users have a real display name — use the first word of it
  if (user?.name) {
    return user.name.trim().split(' ')[0]
  }
  // Email/password fallback: extract the part before @ and clean it up
  const email = user?.email || ''
  if (!email) return 'there'
  const raw = email.split('@')[0].split('.')[0].split('_')[0]
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

// ── Filter/sort config ────────────────────────────────────────────────────────
const STATUS_GROUPS = {
  all:         { label: 'All',         statuses: null },
  complete:    { label: 'Complete',    statuses: ['complete'] },
  in_progress: { label: 'In Progress', statuses: ['agent1_complete','agent2_complete','agent3_complete','agents_complete'] },
  ready:       { label: 'Ready',       statuses: ['ready'] },
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name',   label: 'Name A–Z' },
]

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({ count, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-950 border border-red-800 flex items-center justify-center">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-white text-center mb-1">
          Delete {count} proposal{count !== 1 ? 's' : ''}?
        </h3>
        <p className="text-sm text-gray-500 text-center mb-5">
          This action cannot be undone. All agent results and analysis will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-sm text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <LoadingSpinner size="sm" /> : <Trash2 size={14} />}
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Filter dropdown ───────────────────────────────────────────────────────────
function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors ${
          value !== options[0].value
            ? 'border-blue-700 bg-blue-950 text-blue-300'
            : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-gray-200 hover:border-gray-600'
        }`}
      >
        {label}: <span className="font-medium">{current?.label}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-20 min-w-[160px] overflow-hidden animate-slide-down">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-gray-800 ${
                opt.value === value ? 'text-blue-400 bg-gray-800' : 'text-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ filtered }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
        <FileSearch size={28} className="text-gray-600" />
      </div>
      <p className="text-gray-300 font-medium mb-1">
        {filtered ? 'No proposals match your filters' : 'No proposals yet'}
      </p>
      <p className="text-gray-600 text-sm mb-5">
        {filtered ? 'Try adjusting your search or filters.' : 'Upload your first proposal to get started.'}
      </p>
      {!filtered && (
        <Link to="/upload" className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Upload your first proposal
        </Link>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()

  const [proposals, setProposals]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // Selection state
  const [selected, setSelected]     = useState(new Set())
  const [showModal, setShowModal]   = useState(false)
  const [deleting, setDeleting]     = useState(false)

  // Search & filter
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [typeFilter, setType]       = useState('all')
  const [sortBy, setSort]           = useState('newest')

  useEffect(() => {
    listSessions()
      .then(data => setProposals(data.sessions || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // ── Derived filter options ────────────────────────────────────────────────
  const typeOptions = useMemo(() => {
    const types = [...new Set(proposals.map(p => p.proposal_type).filter(Boolean))]
    return [{ value: 'all', label: 'All types' }, ...types.map(t => ({ value: t, label: t }))]
  }, [proposals])

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...proposals]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p => (p.original_filename || '').toLowerCase().includes(q))
    }

    if (statusFilter !== 'all') {
      const allowed = STATUS_GROUPS[statusFilter]?.statuses || []
      list = list.filter(p => allowed.includes(p.status))
    }

    if (typeFilter !== 'all') {
      list = list.filter(p => p.proposal_type === typeFilter)
    }

    if (sortBy === 'oldest') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    else if (sortBy === 'name') list.sort((a, b) => (a.original_filename || '').localeCompare(b.original_filename || ''))
    else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return list
  }, [proposals, search, statusFilter, typeFilter, sortBy])

  const isFiltered = search || statusFilter !== 'all' || typeFilter !== 'all'

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(p => p.id)))
    }
  }

  const clearSelection = () => setSelected(new Set())

  // ── Delete handlers ───────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      const ids = [...selected]
      if (ids.length === 1) {
        await deleteSession(ids[0])
      } else {
        await deleteSessions(ids)
      }
      setProposals(prev => prev.filter(p => !selected.has(p.id)))
      setSelected(new Set())
      setShowModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSingle = async (id) => {
    setSelected(new Set([id]))
    setShowModal(true)
  }

  const greeting = getGreeting()
  const name = firstName(user)
  const allVisibleSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      {showModal && (
        <DeleteModal
          count={selected.size}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setShowModal(false); clearSelection() }}
          loading={deleting}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6 animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {greeting},{' '}
              <span style={{
                background: 'linear-gradient(90deg,#60a5fa,#818cf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {name}
              </span>{' '}
              👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {proposals.length === 0
                ? 'No proposals yet'
                : `${proposals.length} proposal${proposals.length !== 1 ? 's' : ''} · ${user?.email}`}
            </p>
          </div>
          <Link
            to="/upload"
            className="btn-primary flex items-center gap-2 text-sm animate-pulse-glow"
          >
            <Plus size={15} /> New Review
          </Link>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg mb-4 animate-slide-down flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}

        {!loading && proposals.length > 0 && (
          <>
            {/* ── Search + filters bar ──────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4 animate-slide-up-delay">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search proposals…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status tabs */}
              <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
                {Object.entries(STATUS_GROUPS).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => setStatus(key)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all duration-150 ${
                      statusFilter === key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Type + sort filters */}
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={13} className="text-gray-600 flex-shrink-0" />
                <FilterDropdown label="Type" value={typeFilter} options={typeOptions} onChange={setType} />
                <FilterDropdown
                  label="Sort"
                  value={sortBy}
                  options={SORT_OPTIONS}
                  onChange={setSort}
                />
              </div>
            </div>

            {/* ── Selection toolbar ─────────────────────────────────────── */}
            {someSelected && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-950 border border-blue-800 rounded-xl mb-4 animate-slide-down">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs text-blue-300"
                >
                  <CheckSquare size={14} />
                  {allVisibleSelected ? 'Deselect all' : 'Select all'}
                </button>
                <span className="text-xs text-blue-400 font-medium">
                  {selected.size} selected
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={clearSelection}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                    Delete {selected.size}
                  </button>
                </div>
              </div>
            )}

            {/* ── Result count + select-all ────────────────────────────── */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-600">
                {isFiltered
                  ? `${filtered.length} of ${proposals.length} proposals`
                  : `${proposals.length} proposal${proposals.length !== 1 ? 's' : ''}`}
              </p>
              {filtered.length > 1 && (
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <CheckSquare size={12} />
                  {allVisibleSelected ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Content ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filtered={!!isFiltered} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((proposal, i) => (
              <div
                key={proposal.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
              >
                <ProposalCard
                  proposal={proposal}
                  selected={selected.has(proposal.id)}
                  onToggleSelect={() => toggleSelect(proposal.id)}
                  onDelete={() => handleDeleteSingle(proposal.id)}
                  selectionMode={someSelected}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
