import { request } from './http'

/** The current user, as answered by the server — never decoded from the token. */
export interface User {
  userName: string
  role: 'USER' | 'ADMIN'
}

export interface AuthResult {
  token: string
  user: User
}

export interface Credentials {
  userName: string
  password: string
}

export function login(credentials: Credentials): Promise<AuthResult> {
  return request<AuthResult>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
}

export function register(credentials: Credentials): Promise<AuthResult> {
  return request<AuthResult>('/api/auth/register', { method: 'POST', body: JSON.stringify(credentials) })
}

export function getMe(): Promise<User> {
  return request<User>('/api/auth/me')
}
