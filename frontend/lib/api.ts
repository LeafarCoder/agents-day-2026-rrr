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
    if (typeof input === 'string') {
      // If it's a request to the configured API (absolute) or a relative /api/ path,
      // ensure credentials is set unless the caller explicitly set it.
      const isApi = input.startsWith(API_URL) || input.startsWith('/api/')
      if (isApi) {
        if (!('credentials' in init)) init.credentials = 'include'
      }
    } else if (input instanceof Request) {
      const url = input.url
      const isApi = url.startsWith(API_URL) || new URL(url).pathname.startsWith('/api/')
      if (isApi) {
        if (!('credentials' in init)) init.credentials = 'include'
      }
    }
  } catch (err) {
    // If URL parsing fails for some reason, fall back to calling fetch as-is
  }

  return fetch(input as any, init)
}
