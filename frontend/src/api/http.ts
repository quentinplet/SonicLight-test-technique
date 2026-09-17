// The only module that calls fetch, knows the API's address and touches the auth token.
// No component, view or store reads localStorage or builds an Authorization header.
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

const API_URL = import.meta.env.VITE_API_URL
const TOKEN_KEY = 'soniclight.token'

/** Thrown on any non-2xx response. Views branch on `code`, never on `message`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readToken()
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: buildHeaders(token, init.headers) })
  } catch {
    // No response at all: API down, CORS rejected, offline. Callers only ever handle ApiError.
    throw new ApiError(0, 'network.unreachable', 'Cannot reach the server.')
  }
  if (!res.ok) throw await handleErrorResponse(res, token)
  // Typed by declaration, not validated: the client has no Zod. The server is the boundary.
  return res.json()
}

// Before each request — the equivalent of an axios request interceptor.
function buildHeaders(token: string | null, headers: HeadersInit = {}): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  }
}

// On each non-2xx response — the equivalent of an axios response interceptor.
async function handleErrorResponse(res: Response, token: string | null): Promise<ApiError> {
  // A 401 on a request that carried a token: the session is over (expired, account deleted).
  // A 401 without one is a failed login — the form shows it, nobody gets redirected.
  if (res.status === 401 && token) {
    useAuthStore().logout()
    router.push('/login')
  }
  const body: unknown = await res.json().catch(() => null)
  if (isErrorBody(body)) return new ApiError(res.status, body.code, body.message)
  return new ApiError(res.status, 'http.error', res.statusText)
}

function isErrorBody(body: unknown): body is { code: string; message: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    typeof body.code === 'string' &&
    'message' in body &&
    typeof body.message === 'string'
  )
}

// localStorage throws in private browsing or when site data is blocked: never a bare access.
function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function hasToken(): boolean {
  return readToken() !== null
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Storage unavailable: the session simply won't survive a reload.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing stored, nothing to clear.
  }
}
