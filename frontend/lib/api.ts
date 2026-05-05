export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8042'

/**
 * Small helper that ensures cross-origin API calls include credentials so
 * cookies set by the backend (SameSite=None; Secure) are attached.
 * Use this instead of fetch for requests to the API.
 */
export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  // Normalize init
  init = init ? { ...init } : {}

  try {
    let isApi = false
    let urlStr = null

    if (typeof input === 'string') {
      urlStr = input
      isApi = input.startsWith(API_URL) || input.startsWith('/api/')
    } else if (input instanceof Request) {
      urlStr = input.url
      isApi = urlStr.startsWith(API_URL) || new URL(urlStr).pathname.startsWith('/api/')
    }

    if (isApi) {
      // Ensure credentials for cross-origin scenarios unless caller already set it
      if (!('credentials' in init)) init.credentials = 'include'

      // If running in browser and we have a stored token, attach it as a Bearer header
      if (typeof window !== 'undefined') {
        try {
          const token = localStorage.getItem('session_token')
          if (token) {
            // Normalize headers to plain object if needed
            if (init.headers instanceof Headers) {
              const h: Record<string, string> = {}
              for (const [k, v] of init.headers.entries()) h[k] = v
              init.headers = { ...h }
            } else if (!init.headers) {
              init.headers = {}
            }
            // Don't overwrite existing Authorization header
            const hdrs = init.headers as Record<string, string>
            if (!hdrs['Authorization'] && !hdrs['authorization']) {
              hdrs['Authorization'] = `Bearer ${token}`
            }
          }
        } catch (err) {
          // ignore storage errors
        }
      }
    }
  } catch (err) {
    // If URL parsing fails for some reason, fall back to calling fetch as-is
  }

  return fetch(input as any, init)
}
