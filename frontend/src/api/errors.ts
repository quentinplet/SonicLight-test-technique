import { ApiError } from './http'

// The UI branches on error codes with its own wording: the API's messages are for developers.
const MESSAGES: Record<string, string> = {
  'auth.invalidCredentials': 'Incorrect user name or password.',
  'auth.userNameTaken': 'This user name is already taken.',
  'network.unreachable': 'Cannot reach the server. Please try again.',
}

/** A message fit to show a user, whatever was thrown. */
export function errorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Something went wrong.'
  // Validation messages come from the Zod schemas, written to be read as is.
  if (err.code === 'request.invalidBody') return err.message
  return MESSAGES[err.code] ?? 'Something went wrong.'
}
