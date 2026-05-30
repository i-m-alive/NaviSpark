import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Palette } from 'lucide-react'
import { THEMES, THEME_CATEGORIES, useTheme } from '../context/ThemeContext'
import { clsx } from 'clsx'

const CATEGORY_META = {
  Dark:          { icon: '🌙', desc: 'Easy on the eyes, perfect for long work sessions' },
  Vibrant:       { icon: '✨', desc: 'Bold and energetic — stand out from the crowd' },
  Light:         { icon: '☀️', desc: 'Clean and bright — great for daytime and presentations' },
  Subtle:        { icon: '🌸', desc: 'Soft tones with low eye-strain, suits all ages' },
  Accessibility: { icon: '♿', desc: 'Maximum contrast and readability for everyone' },
}

function bgBrightness(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

function ThemeCard({ t, selected, onSelect }) {
  const light = bgBrightness(t.swatches[0]) > 128
  const textColor = light ? '#0f172a' : '#f1f5f9'
  const mutedColor = light ? 'rgba(15,23,42,0.55)' : 'rgba(241,245,249,0.55)'

  return (
    <button
      onClick={() => onSelect(t.id)}
      className={clsx(
        'relative flex flex-col gap-2.5 p-3 rounded-xl border-2 text-left transition-all duration-200 w-full group',
        selected
          ? 'border-blue-500 shadow-xl shadow-blue-500/25 scale-[1.03]'
          : 'border-white/10 hover:border-white/25 hover:scale-[1.01]',
      )}
      style={{ background: t.swatches[0] }}
    >
      {/* Swatch row */}
      <div className="flex gap-1">
        {t.swatches.map((c, i) => (
          <div key={i} className="h-4 rounded flex-1 border border-white/10"
            style={{ backgroundColor: c }} />
        ))}
      </div>

      {/* Name + desc */}
      <div>
        <p className="text-xs font-bold leading-tight" style={{ color: textColor }}>
          {t.name}
        </p>
        <p className="text-[9px] mt-0.5 leading-tight" style={{ color: mutedColor }}>
          {t.desc}
        </p>
      </div>

      {/* Selected check */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
          <Check size={10} className="text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  )
}

// ── Full first-login picker modal ─────────────────────────────────────────────
export default function ThemePicker() {
  const { theme, setTheme, dismissPicker } = useTheme()
  const [selected, setSelected] = useState(theme)
  const [activeCategory, setActiveCategory] = useState('Dark')

  const handleApply = () => {
    setTheme(selected)
    dismissPicker()
  }

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,7,18,0.88)', backdropFilter: 'blur(10px)', zIndex: 10000 }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 96px rgba(0,0,0,0.85), 0 0 0 1px rgba(59,130,246,0.08)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl"
              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <Palette size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Choose Your Theme</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Pick a look that suits you — change it anytime from the navbar
              </p>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 flex-wrap">
            {THEME_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
                )}
              >
                <span>{CATEGORY_META[cat].icon}</span>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">
            {CATEGORY_META[activeCategory].desc}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.filter(t => t.category === activeCategory).map(t => (
              <ThemeCard key={t.id} t={t} selected={selected === t.id} onSelect={setSelected} />
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={dismissPicker}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
          >
            <Check size={14} strokeWidth={2.5} />
            Apply Theme
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// ── Compact navbar switcher (inline, not a portal) ────────────────────────────
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState(
    THEMES.find(t => t.id === theme)?.category || 'Dark'
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="Switch theme"
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200 border',
          open
            ? 'text-blue-400 bg-blue-950/40 border-blue-800/60'
            : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/60 border-transparent',
        )}
      >
        <Palette size={14} />
        <span className="hidden sm:inline text-xs font-medium">Theme</span>
        {/* Live swatch dot showing current theme */}
        <span
          className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
          style={{ backgroundColor: THEMES.find(t => t.id === theme)?.swatches[3] || '#3b82f6' }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden"
          style={{
            background: '#0d1117',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            width: 280,
            zIndex: 9999,
          }}
        >
          {/* Category tabs */}
          <div className="flex gap-0.5 p-2 overflow-x-auto"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {THEME_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={clsx(
                  'flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all',
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5',
                )}
              >
                <span>{CATEGORY_META[cat].icon}</span>
                <span className="hidden sm:inline">{cat}</span>
              </button>
            ))}
          </div>

          {/* Theme cards */}
          <div className="p-2 grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
            {THEMES.filter(t => t.category === activeCategory).map(t => {
              const light = bgBrightness(t.swatches[0]) > 128
              const textColor = light ? '#0f172a' : '#f1f5f9'
              const active = theme === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setOpen(false) }}
                  className={clsx(
                    'relative flex flex-col gap-1.5 p-2 rounded-lg border text-left transition-all',
                    active ? 'border-blue-500 scale-[1.02]' : 'border-white/8 hover:border-white/20',
                  )}
                  style={{ background: t.swatches[0] }}
                >
                  <div className="flex gap-0.5">
                    {t.swatches.map((c, i) => (
                      <div key={i} className="h-2.5 rounded-sm flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="text-[9px] font-semibold leading-none" style={{ color: textColor }}>
                    {t.name}
                  </p>
                  {active && (
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check size={8} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Click-outside close */}
      {open && (
        <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setOpen(false)} />
      )}
    </div>
  )
}
