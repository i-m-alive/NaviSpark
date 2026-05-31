const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('navispark_token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse(res) {
  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`
    try {
      const data = await res.json()
      errorDetail = data.detail || data.message || errorDetail
    } catch {}

    if (res.status === 401) {
      localStorage.removeItem('navispark_token')
      localStorage.removeItem('navispark_user')
      throw new Error('Session expired. Please log in again.')
    }

    throw new Error(errorDetail)
  }
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────

export async function register(email, password, full_name) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name }),
  })
  return handleResponse(res)
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(res)
}

export async function logout() {
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function getMe() {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

// ── Sessions ─────────────────────────────────────────────

export async function uploadDocument({ file, clientIndustry, proposalType, clientPriorities }) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('client_industry', JSON.stringify(clientIndustry))
  formData.append('proposal_type', proposalType)
  formData.append('client_priorities', JSON.stringify(clientPriorities))

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  })
  return handleResponse(res)
}

export async function listSessions() {
  const res = await fetch(`${API_URL}/sessions`, {
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function getSession(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}`, {
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function getReportUrl(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/report-url`, {
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function getSourceFileUrl(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/source-file-url`, {
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

// ── Revision / versioning ─────────────────────────────────

export async function uploadRevision(parentSessionId, file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_URL}/sessions/${parentSessionId}/upload-revision`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  })
  return handleResponse(res)
}

export async function getSessionHistory(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/history`, {
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

// ── Pipeline ──────────────────────────────────────────────

export async function startAnalysis(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/run-analysis`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function cancelAnalysis(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/cancel-analysis`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

// ── Agent Calls ───────────────────────────────────────────

export async function runAgent1(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/run-agent1`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function runAgent2(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/run-agent2`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function runAgent3(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/run-agent3`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function runAgent4(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/run-agent4`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function generateModifiedPpt(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/generate-modified-ppt`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function getModificationGuide(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/modification-guide`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function deleteSessions(sessionIds) {
  const res = await fetch(`${API_URL}/sessions`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ session_ids: sessionIds }),
  })
  return handleResponse(res)
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export async function getChatHistory(groupId) {
  const res = await fetch(`${API_URL}/chat/${groupId}`, {
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

export async function clearChatHistory(groupId) {
  const res = await fetch(`${API_URL}/chat/${groupId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  return handleResponse(res)
}

/**
 * Sends a chat message and returns a ReadableStream of SSE chunks.
 * The caller is responsible for reading the stream.
 * Each SSE line is: data: {"type":"delta","text":"..."} or {"type":"done"} or {"type":"error",...}
 */
export async function sendChatMessage(groupId, message, signal) {
  const res = await fetch(`${API_URL}/chat/${groupId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ message }),
    signal,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try { const d = await res.json(); detail = d.detail || detail } catch {}
    throw new Error(detail)
  }
  return res.body  // ReadableStream
}
