import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('navispark_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      getMe()
        .then(data => setUser({ id: data.user_id, email: data.email }))
        .catch(() => {
          localStorage.removeItem('navispark_token')
          localStorage.removeItem('navispark_user')
          setToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const loginUser = (accessToken, userData) => {
    localStorage.setItem('navispark_token', accessToken)
    setToken(accessToken)
    setUser(userData)
  }

  const logoutUser = () => {
    localStorage.removeItem('navispark_token')
    localStorage.removeItem('navispark_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
