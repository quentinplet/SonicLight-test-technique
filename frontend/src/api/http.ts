// The only module that calls fetch and knows the API's address.
// The auth token will be injected here, and nowhere else.

const API_URL = import.meta.env.VITE_API_URL

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
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null)
    if (isErrorBody(body)) throw new ApiError(res.status, body.code, body.message)
    throw new ApiError(res.status, 'http.error', res.statusText)
  }
  // Typed by declaration, not validated: the client has no Zod. The server is the boundary.
  return res.json()
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
