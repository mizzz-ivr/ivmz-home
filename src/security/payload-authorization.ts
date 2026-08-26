type PayloadAuthorizationErrorLike = {
  message?: unknown
  name?: unknown
  status?: unknown
}

export function isPayloadUnauthorizedError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false

  const candidate = error as PayloadAuthorizationErrorLike

  return (
    candidate.status === 401 ||
    candidate.name === 'UnauthorizedError' ||
    candidate.message === 'Unauthorized'
  )
}
