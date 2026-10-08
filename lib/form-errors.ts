import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError, errorMessage } from '@/lib/api/errors'

const CODE_FIELD: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: 'email',
  USERNAME_ALREADY_EXISTS: 'username',
}

/**
 * Maps an API error onto a React Hook Form field when possible (422 `field`, known 409 codes),
 * otherwise onto `root`. Returns true when it was attached to a specific field.
 */
export function applyApiError<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): boolean {
  const message = errorMessage(err)
  if (err instanceof ApiError) {
    const field = err.field ?? CODE_FIELD[err.code]
    if (field && fields.includes(field)) {
      setError(field as Path<T>, { type: 'server', message }, { shouldFocus: true })
      return true
    }
  }
  setError('root.server' as Path<T>, { type: 'server', message })
  return false
}
