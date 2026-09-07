import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

// ─── Health ──────────────────────────────────────────────────────
export const checkHealth = () => api.get('/health').then(r => r.data)

// ─── Upload ──────────────────────────────────────────────────────
export const uploadFile = (file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/upload/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress && onProgress(Math.round(e.loaded / e.total * 100)),
  }).then(r => r.data)
}

export const getSession = (sid) => api.get(`/upload/session/${sid}`).then(r => r.data)
export const getRows = (sid, page = 0, pageSize = 50) =>
  api.get(`/upload/session/${sid}/rows`, { params: { page, page_size: pageSize } }).then(r => r.data)

// ─── Analysis ────────────────────────────────────────────────────
export const getSummary = (sid) => api.get(`/analysis/${sid}/summary`).then(r => r.data)
export const getCorrelations = (sid) => api.get(`/analysis/${sid}/correlations`).then(r => r.data)
export const getOutliers = (sid) => api.get(`/analysis/${sid}/outliers`).then(r => r.data)
export const getForecast = (sid, col, periods = 10) =>
  api.get(`/analysis/${sid}/forecast/${col}`, { params: { periods } }).then(r => r.data)

export const getPivot = (sessionId, rowCol, valueCol, agg) =>
  api.post('/analysis/pivot', { session_id: sessionId, row_col: rowCol, value_col: valueCol, agg }).then(r => r.data)

// ─── AI ──────────────────────────────────────────────────────────
export const getModels = () => api.get('/ai/models').then(r => r.data)

export const generateReport = (sessionId, model) =>
  api.post('/ai/report/generate', { session_id: sessionId, model }).then(r => r.data)

export const generateSection = (sessionId, sectionKey, model) =>
  api.post(`/ai/report/section/${sectionKey}`, { session_id: sessionId, model }).then(r => r.data)

export const chat = (sessionId, message, history, model) =>
  api.post('/ai/chat', { session_id: sessionId, message, history, model }).then(r => r.data)

export const quickInsights = (sessionId, model) =>
  api.post(`/ai/insights/${sessionId}`, null, { params: { model } }).then(r => r.data)

// Streaming section generator
export const streamSection = (sessionId, sectionKey, model, onToken, onDone) => {
  const evtSrc = new EventSource(
    `/api/ai/report/section/${sectionKey}/stream?session_id=${sessionId}&model=${model || ''}`,
  )
  // EventSource doesn't support POST, so we use fetch with ReadableStream instead
  evtSrc.close()

  return fetch(`/api/ai/report/section/${sectionKey}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, model }),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`Stream error ${res.status}`)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.token) onToken(data.token)
            if (data.done) onDone && onDone()
          } catch (_) {}
        }
      }
    }
    onDone && onDone()
  })
}

// Streaming chat
export const streamChat = (sessionId, message, history, model, onToken, onDone) => {
  return fetch('/api/ai/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message, history, model }),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`Stream error ${res.status}`)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.token) onToken(data.token)
            if (data.done) onDone && onDone()
          } catch (_) {}
        }
      }
    }
    onDone && onDone()
  })
}

// ─── Export ──────────────────────────────────────────────────────
export const exportCSV = (sid) => {
  window.open(`/api/export/${sid}/csv`, '_blank')
}

export const exportExcel = (sid) => {
  window.open(`/api/export/${sid}/excel`, '_blank')
}

export const exportReportHTML = async (sid, report, userName, company) => {
  const res = await api.post('/export/report/html', {
    session_id: sid,
    report,
    user_name: userName,
    company,
  }, { responseType: 'text' })
  const blob = new Blob([res.data], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return win
}
