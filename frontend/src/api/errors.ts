import { ApiError } from './http'

// The UI's own wording for each error code.
const MESSAGES: Record<string, string> = {
  'auth.invalidCredentials': 'Incorrect user name or password.',
  'auth.userNameTaken': 'This user name is already taken.',
}

export function errorMessage(err: unknown): string {
  // fetch throws a TypeError when there is no response at all: API down, CORS, offline.
  if (err instanceof TypeError) return 'Cannot reach the server. Please try again.'
  if (!(err instanceof ApiError)) return 'Something went wrong.'
  // Zod validation messages are written to be shown as is.
  if (err.code === 'request.invalidBody') return err.message
  return MESSAGES[err.code] ?? 'Something went wrong.'
}
