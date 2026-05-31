import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

const SUPPORTED = typeof window !== 'undefined' && 'Notification' in window

function storageKey(userId) {
  return `navispark_notif_${userId}`
}

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [permission, setPermission] = useState(SUPPORTED ? Notification.permission : 'denied')
  const [enabled, setEnabled] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // When user logs in, load their saved preference or show first-time modal
  useEffect(() => {
    if (!user?.id) {
      setEnabled(false)
      setShowModal(false)
      return
    }
    const saved = localStorage.getItem(storageKey(user.id))
    if (saved === null && SUPPORTED) {
      // Never asked — show the permission modal
      setShowModal(true)
    } else {
      setEnabled(saved === 'enabled' && SUPPORTED && Notification.permission === 'granted')
    }
  }, [user?.id])

  const requestPermission = async () => {
    if (!SUPPORTED) return false
    const perm = await Notification.requestPermission()
    setPermission(perm)
    const granted = perm === 'granted'
    setEnabled(granted)
    if (user?.id) {
      localStorage.setItem(storageKey(user.id), granted ? 'enabled' : 'disabled')
    }
    setShowModal(false)
    return granted
  }

  const dismissModal = () => {
    if (user?.id) {
      localStorage.setItem(storageKey(user.id), 'disabled')
    }
    setEnabled(false)
    setShowModal(false)
  }

  // Toggle from the navbar bell button
  const toggleEnabled = async () => {
    if (!SUPPORTED) return
    if (enabled) {
      setEnabled(false)
      if (user?.id) localStorage.setItem(storageKey(user.id), 'disabled')
      return
    }
    // Trying to enable
    const currentPerm = Notification.permission
    if (currentPerm === 'granted') {
      setEnabled(true)
      if (user?.id) localStorage.setItem(storageKey(user.id), 'enabled')
    } else if (currentPerm === 'default') {
      await requestPermission()
    }
    // If 'denied', we can't programmatically ask — caller should show guidance
  }

  const sendNotification = (title, body, opts = {}) => {
    if (!SUPPORTED || !enabled || Notification.permission !== 'granted') return null
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'navispark-analysis',
      ...opts,
    })
    n.onclick = () => { window.focus(); n.close() }
    return n
  }

  return (
    <NotificationContext.Provider
      value={{
        supported: SUPPORTED,
        permission,
        enabled,
        showModal,
        setShowModal,
        requestPermission,
        dismissModal,
        toggleEnabled,
        sendNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
