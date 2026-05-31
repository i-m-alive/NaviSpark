import { createPortal } from 'react-dom'
import { Bell, BellOff, X } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext'

export default function NotificationPermissionModal() {
  const { requestPermission, dismissModal, permission } = useNotifications()

  const isDenied = permission === 'denied'

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl border"
        style={{
          background: 'var(--t-bg2, #111827)',
          borderColor: 'rgba(99,102,241,0.25)',
          boxShadow: '0 0 40px rgba(99,102,241,0.12)',
        }}
      >
        {/* Dismiss */}
        <button
          onClick={dismissModal}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Bell size={26} className="text-indigo-400" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-center text-base font-bold text-white mb-2">
          Stay in the loop
        </h2>
        <p className="text-center text-sm text-gray-400 leading-relaxed mb-5">
          Analysing large proposals can take a few minutes. Enable desktop
          notifications so we can ping you the moment your results are ready —
          even if you switch tabs.
        </p>

        {isDenied ? (
          <>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-950/40 border border-yellow-800/40 mb-4">
              <BellOff size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-300 leading-relaxed">
                Notifications are currently blocked in your browser. To enable
                them, click the lock icon in your address bar and set
                Notifications to <strong>Allow</strong>.
              </p>
            </div>
            <button
              onClick={dismissModal}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              Got it
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2.5">
            <button
              onClick={requestPermission}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              }}
            >
              Enable notifications
            </button>
            <button
              onClick={dismissModal}
              className="w-full py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
