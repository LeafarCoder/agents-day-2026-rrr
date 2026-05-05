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

import { API_URL, apiFetch } from './api'

const DEMO_TOKEN_PARAM = 'demo_token'
const AUTH_TOKEN_PARAM = 'auth_token'
export const DEMO_AUTH_EVENT = 'demo-auth-changed'
export const DEMO_AUTH_PENDING_KEY = 'demo_auth_pending'
export const SESSION_MODE_KEY = 'session_mode'
let exchangeInFlight: Promise<boolean> | null = null

/**
 * Check URL for a demo_token and exchange it for a session.
 * Returns true if a token was found and exchanged.
 * Should be called early during page load.
 */
export async function exchangeDemoTokenIfPresent(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (exchangeInFlight) return exchangeInFlight

  const url = new URL(window.location.href)
  const token = url.searchParams.get(DEMO_TOKEN_PARAM)

  if (!token) return false

  try { localStorage.setItem(DEMO_AUTH_PENDING_KEY, '1') } catch {}

  exchangeInFlight = (async () => {

    // Clear the token from URL immediately (before the fetch)
    url.searchParams.delete(DEMO_TOKEN_PARAM)
    const cleanUrl = url.toString()
    window.history.replaceState({}, '', cleanUrl)

    try {
      const res = await apiFetch(`${API_URL}/api/auth/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // Even if cookie doesn't work, we try
        body: JSON.stringify({ token }),
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        // If server returned an access token, persist it to localStorage
        if (typeof window !== 'undefined' && data && data.access_token) {
          try { localStorage.setItem('session_token', data.access_token) } catch {}
          try { localStorage.setItem(SESSION_MODE_KEY, 'demo') } catch {}
          try {
            window.dispatchEvent(new CustomEvent(DEMO_AUTH_EVENT, {
              detail: { connected: true, demo: true, user_email: data.user_email },
            }))
          } catch {}
        }
        console.log('[auth] Demo token exchanged successfully')
        return true
      }

      const error = await res.json().catch(() => ({}))
      console.error('[auth] Demo token exchange failed:', error)
      return false
    } catch (err) {
      console.error('[auth] Demo token exchange error:', err)
      return false
    } finally {
      try { localStorage.removeItem(DEMO_AUTH_PENDING_KEY) } catch {}
      exchangeInFlight = null
    }
  })()

  return exchangeInFlight
}

/**
 * Persist a first-party bearer token returned by the OAuth callback.
 * This makes real sign-in work even when cross-site cookies are blocked.
 */
export function exchangeAuthTokenIfPresent(): boolean {
  if (typeof window === 'undefined') return false

  const url = new URL(window.location.href)
  const token = url.searchParams.get(AUTH_TOKEN_PARAM)
  if (!token) return false

  url.searchParams.delete(AUTH_TOKEN_PARAM)
  window.history.replaceState({}, '', url.toString())

  try { localStorage.setItem('session_token', token) } catch {}
  try { localStorage.setItem(SESSION_MODE_KEY, 'user') } catch {}
  try {
    window.dispatchEvent(new CustomEvent(DEMO_AUTH_EVENT, {
      detail: { connected: true, demo: false },
    }))
  } catch {}

  return true
}

export async function exchangeAuthTokensIfPresent(): Promise<boolean> {
  const exchangedAuth = exchangeAuthTokenIfPresent()
  const exchangedDemo = await exchangeDemoTokenIfPresent()
  return exchangedAuth || exchangedDemo
}
