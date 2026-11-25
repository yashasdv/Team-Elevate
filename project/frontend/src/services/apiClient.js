const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'https://codementor-api.onrender.com').replace(/\/$/, '')

export async function apiRequest(path, user, options = {}) {
  if (!user) throw new Error('Please sign in again to continue.')
  const token = await user.getIdToken()
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('We could not reach the CodeMentor service. Check your connection and try again.')
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.detail || 'The request could not be completed. Please try again.')
    error.status = response.status
    throw error
  }

  return payload
}
