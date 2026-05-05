import { useAuthStore } from '../stores/authStore'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// One in-flight refresh at a time — concurrent callers wait on the same promise
let refreshPromise: Promise<boolean> | null = null

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const { refreshSession } = await import('./authService')
      return await refreshSession()
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const store = useAuthStore.getState()

  // Proactively refresh if expiring soon before making the request
  if (store.isExpiringSoon() && store.status !== 'refreshing') {
    await attemptRefresh()
  }

  const { accessToken } = useAuthStore.getState()

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  })

  // Token expired mid-session → try refresh once then retry
  if (res.status === 401 && retry) {
    const ok = await attemptRefresh()
    if (ok) return request<T>(path, options, false)
    // Refresh failed — force logout
    useAuthStore.getState().clearAuth()
    throw new ApiError(401, 'Session expired. Please reconnect your wallet.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = {
  get: <T>(path: string) =>
    request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),

  // Unauthenticated post (for auth endpoints themselves)
  publicPost: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }, false),
}