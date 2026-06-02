const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('navispark_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse(res) {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try { const d = await res.json(); detail = d.detail || d.message || detail } catch {}
    throw new Error(detail)
  }
  return res.json()
}

// ── Stats ──────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const res = await fetch(`${API_URL}/admin/stats`, { headers: authHeaders() })
  return handleResponse(res)
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function getAdminUsers() {
  const res = await fetch(`${API_URL}/admin/users`, { headers: authHeaders() })
  return handleResponse(res)
}

export async function getAdminUser(userId) {
  const res = await fetch(`${API_URL}/admin/users/${userId}`, { headers: authHeaders() })
  return handleResponse(res)
}

export async function deleteAdminUser(userId) {
  const res = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: 'DELETE', headers: authHeaders(),
  })
  return handleResponse(res)
}

export async function banAdminUser(userId) {
  const res = await fetch(`${API_URL}/admin/users/${userId}/ban`, {
    method: 'PATCH', headers: authHeaders(),
  })
  return handleResponse(res)
}

export async function unbanAdminUser(userId) {
  const res = await fetch(`${API_URL}/admin/users/${userId}/unban`, {
    method: 'PATCH', headers: authHeaders(),
  })
  return handleResponse(res)
}

export async function makeAdmin(userId) {
  const res = await fetch(`${API_URL}/admin/users/${userId}/make-admin`, {
    method: 'PATCH', headers: authHeaders(),
  })
  return handleResponse(res)
}

export async function revokeAdmin(userId) {
  const res = await fetch(`${API_URL}/admin/users/${userId}/revoke-admin`, {
    method: 'PATCH', headers: authHeaders(),
  })
  return handleResponse(res)
}

// ── Sessions ───────────────────────────────────────────────────────────────

export async function getAdminSessions({ limit = 50, offset = 0, status } = {}) {
  const params = new URLSearchParams({ limit, offset })
  if (status) params.set('status', status)
  const res = await fetch(`${API_URL}/admin/sessions?${params}`, { headers: authHeaders() })
  return handleResponse(res)
}

export async function deleteAdminSession(sessionId) {
  const res = await fetch(`${API_URL}/admin/sessions/${sessionId}`, {
    method: 'DELETE', headers: authHeaders(),
  })
  return handleResponse(res)
}

// ── Token Usage ────────────────────────────────────────────────────────────

export async function getAdminTokenUsage({ limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset })
  const res = await fetch(`${API_URL}/admin/token-usage?${params}`, { headers: authHeaders() })
  return handleResponse(res)
}

// ── Activity ───────────────────────────────────────────────────────────────

export async function getAdminActivity(limit = 50) {
  const res = await fetch(`${API_URL}/admin/activity?limit=${limit}`, { headers: authHeaders() })
  return handleResponse(res)
}
