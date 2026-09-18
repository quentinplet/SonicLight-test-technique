import { useAuthStore } from "@/stores/auth";

const API_URL = import.meta.env.VITE_API_URL;

/** Thrown on any non-2xx response. The UI branches on `code`. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = useAuthStore();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    // Expired token or deleted account: end the session. A failed login sends no token.
    if (res.status === 401 && auth.token) auth.logout();
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.code ?? "http.error", body?.message ?? res.statusText);
  }
  // 204 No Content has no body to parse: DELETE returns no content.
  if (res.status === 204) return undefined as T;
  return res.json();
}
