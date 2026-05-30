import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

export const THEMES = [
  // ── Dark ──────────────────────────────────────────────────────────────────
  {
    id: 'obsidian',
    name: 'Obsidian',
    category: 'Dark',
    desc: 'Deep black with blue accents — the classic dev aesthetic',
    swatches: ['#030712', '#111827', '#1f2937', '#3b82f6'],
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    category: 'Dark',
    desc: 'Deep navy with electric blue highlights — refined and bold',
    swatches: ['#020a18', '#071528', '#0d2040', '#60a0f8'],
  },
  {
    id: 'forest',
    name: 'Forest',
    category: 'Dark',
    desc: 'Dark greens with warm amber — focused and earthy',
    swatches: ['#050f08', '#0a1a0e', '#102618', '#50a850'],
  },
  {
    id: 'crimson',
    name: 'Crimson',
    category: 'Dark',
    desc: 'Deep reds with near-black — bold and commanding',
    swatches: ['#0f0505', '#1a0808', '#261010', '#c83838'],
  },
  // ── Vibrant ───────────────────────────────────────────────────────────────
  {
    id: 'aurora',
    name: 'Aurora',
    category: 'Vibrant',
    desc: 'Navy base with cyan and violet glow — modern SaaS energy',
    swatches: ['#020814', '#050e20', '#0a1830', '#00c6da'],
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    category: 'Vibrant',
    desc: 'Near-black with neon green accents — cyberpunk vibes',
    swatches: ['#020202', '#050505', '#0a0a0a', '#00e876'],
  },
  // ── Light ─────────────────────────────────────────────────────────────────
  {
    id: 'arctic-light',
    name: 'Arctic Light',
    category: 'Light',
    desc: 'Clean white with cool blue tones — crisp and professional',
    swatches: ['#f0f9ff', '#ffffff', '#f1f5f9', '#2563eb'],
  },
  {
    id: 'parchment',
    name: 'Parchment',
    category: 'Light',
    desc: 'Warm cream with brown tones — classic document feel',
    swatches: ['#faf7f0', '#f5f0e8', '#ece5d5', '#9a6040'],
  },
  // ── Subtle ────────────────────────────────────────────────────────────────
  {
    id: 'lavender-mist',
    name: 'Lavender Mist',
    category: 'Subtle',
    desc: 'Soft purples with light gray — gentle and elegant',
    swatches: ['#faf5ff', '#f5eeff', '#ede9fe', '#6366f1'],
  },
  {
    id: 'warm-sand',
    name: 'Warm Sand',
    category: 'Subtle',
    desc: 'Warm beige tones with dusty rose — comfortable and inviting',
    swatches: ['#fdf8f0', '#faf0e6', '#f5e8d5', '#c08060'],
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    category: 'Subtle',
    desc: 'Pale seafoam blue — calm, fresh, and open',
    swatches: ['#f0fbff', '#e0f7fa', '#b2ebf2', '#00a0c0'],
  },
  {
    id: 'sage',
    name: 'Sage',
    category: 'Subtle',
    desc: 'Muted greens with warm gray — natural and balanced',
    swatches: ['#f4faf4', '#ecf5ec', '#deedde', '#528855'],
  },
  // ── Accessibility ─────────────────────────────────────────────────────────
  {
    id: 'high-contrast-dark',
    name: 'High Contrast Dark',
    category: 'Accessibility',
    desc: 'True black and white with yellow highlights — max readability',
    swatches: ['#000000', '#0a0a0a', '#1c1c1c', '#ffff00'],
  },
  {
    id: 'high-contrast-light',
    name: 'High Contrast Light',
    category: 'Accessibility',
    desc: 'Pure white with strong black borders — WCAG AA compliant',
    swatches: ['#ffffff', '#eeeeee', '#dddddd', '#0000cc'],
  },
]

export const THEME_CATEGORIES = ['Dark', 'Vibrant', 'Light', 'Subtle', 'Accessibility']

const ThemeContext = createContext(null)

function applyThemeToDOM(themeId) {
  document.documentElement.setAttribute('data-theme', themeId)
}

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState('obsidian')
  const [showPicker, setShowPicker] = useState(false)

  // Apply default theme on mount
  useEffect(() => {
    applyThemeToDOM('obsidian')
  }, [])

  // When user becomes known, load saved theme or show first-time picker
  useEffect(() => {
    if (!user?.id) return
    const key = `navispark_theme_${user.id}`
    const saved = localStorage.getItem(key)
    if (saved && THEMES.find(t => t.id === saved)) {
      setThemeState(saved)
      applyThemeToDOM(saved)
    } else {
      applyThemeToDOM('obsidian')
      setShowPicker(true)
    }
  }, [user?.id])

  const setTheme = (themeId) => {
    setThemeState(themeId)
    applyThemeToDOM(themeId)
    if (user?.id) {
      localStorage.setItem(`navispark_theme_${user.id}`, themeId)
    }
  }

  const dismissPicker = () => {
    // Persist obsidian so picker never shows again unless user clears storage
    if (user?.id) {
      const key = `navispark_theme_${user.id}`
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, theme)
      }
    }
    setShowPicker(false)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, showPicker, setShowPicker, dismissPicker }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
