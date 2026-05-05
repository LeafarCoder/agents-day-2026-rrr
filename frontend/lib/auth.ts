/**
 * Demo token exchange utility.
 * Handles the handoff from /demo redirect when third-party cookies are blocked.
 * 
 * Flow:
 * 1. User clicks /demo on backend
 * 2. Backend redirects to frontend with ?demo_token=<token>
 * 3. Frontend calls /api/auth/exchange to create session
 * 4. Frontend clears URL param and continues
 */

import { API_URL } from './api'

const TOKEN_PARAM = 'demo_token'

/**
 * Check URL for a demo_token and exchange it for a session.
 * Returns true if a token was found and exchanged.
 * Should be called early during page load.
 */
export async function exchangeDemoTokenIfPresent(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const url = new URL(window.location.href)
  const token = url.searchParams.get(TOKEN_PARAM)

  if (!token) return false

  // Clear the token from URL immediately (before the fetch)
  url.searchParams.delete(TOKEN_PARAM)
  const cleanUrl = url.toString()
  window.history.replaceState({}, '', cleanUrl)

  try {
    const res = await fetch(`${API_URL}/api/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // Even if cookie doesn't work, we try
      body: JSON.stringify({ token }),
    })

    if (res.ok) {
      console.log('[auth] Demo token exchanged successfully')
      return true
    }

    const error = await res.json().catch(() => ({}))
    console.error('[auth] Demo token exchange failed:', error)
    return false
  } catch (err) {
    console.error('[auth] Demo token exchange error:', err)
    return false
  }
}