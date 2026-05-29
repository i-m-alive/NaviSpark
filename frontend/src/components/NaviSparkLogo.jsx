/**
 * NaviSpark brand logo — SVG spark mark + wordmark.
 * size: 'sm' | 'md' | 'lg'
 * animate: boolean — pulsing spark animation
 */
export default function NaviSparkLogo({ size = 'md', animate = false }) {
  const dims = {
    sm: { icon: 28, wordmark: 'text-lg',  sub: 'text-[10px]', gap: 'gap-2' },
    md: { icon: 38, wordmark: 'text-2xl', sub: 'text-xs',     gap: 'gap-2.5' },
    lg: { icon: 52, wordmark: 'text-3xl', sub: 'text-sm',     gap: 'gap-3' },
  }
  const d = dims[size] || dims.md

  return (
    <div className={`flex items-center ${d.gap}`}>
      {/* ── Spark icon ─────────────────────────────────────────────────────── */}
      <div className={animate ? 'animate-logo-spark' : ''}>
        <svg
          width={d.icon}
          height={d.icon}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer glow ring */}
          <circle cx="20" cy="20" r="18" fill="rgba(59,130,246,0.08)" />
          <circle cx="20" cy="20" r="18" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />

          {/* Inner gradient circle */}
          <circle cx="20" cy="20" r="13" fill="url(#sparkGrad)" opacity="0.15" />

          {/* Lightning bolt / spark */}
          <path
            d="M22.5 8 L13 22 L19.5 22 L17.5 32 L27 18 L20.5 18 Z"
            fill="url(#boltGrad)"
            strokeLinejoin="round"
          />

          {/* Spark dots around the bolt */}
          <circle cx="10" cy="12" r="1.2" fill="#60a5fa" opacity="0.7" />
          <circle cx="30" cy="10" r="0.9" fill="#93c5fd" opacity="0.5" />
          <circle cx="32" cy="28" r="1.1" fill="#60a5fa" opacity="0.6" />
          <circle cx="9"  cy="30" r="0.8" fill="#93c5fd" opacity="0.4" />

          <defs>
            <linearGradient id="boltGrad" x1="13" y1="8" x2="27" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#93c5fd" />
              <stop offset="50%"  stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <radialGradient id="sparkGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* ── Wordmark ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col leading-none">
        <span className={`font-bold tracking-tight ${d.wordmark}`}>
          <span className="text-white">NAVI</span>
          <span className="text-blue-500">SPARK</span>
        </span>
        {size !== 'sm' && (
          <span className={`${d.sub} text-gray-600 font-medium tracking-widest uppercase mt-0.5`}>
            Proposal Intelligence
          </span>
        )}
      </div>
    </div>
  )
}
