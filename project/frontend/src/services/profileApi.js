const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'https://codementor-api.onrender.com').replace(/\/$/, '')

async function requestProfile(path, user, options = {}) {
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

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Your sign-in has expired. Please sign in again.')
    }
    if (response.status === 403) {
      throw new Error('This account is not set up for the student portal. Please contact your teacher.')
    }
    throw new Error('We could not save or load your profile right now. Please try again.')
  }

  return response.json()
}

export function getProfile(user) {
  return requestProfile('/api/auth/profile', user)
}

export function saveProfile(user, profile) {
  return requestProfile('/api/auth/profile', user, {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}
