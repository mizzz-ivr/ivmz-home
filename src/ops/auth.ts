import { createHash, timingSafeEqual } from 'node:crypto'

const digest = (value: string) => createHash('sha256').update(value).digest()

export const MIN_OPS_TOKEN_LENGTH = 24

/** True only when a usable token is configured; shorter values leave the endpoints disabled (404). */
export function isOpsEndpointEnabled(token: string | undefined = process.env.OPS_HEALTH_TOKEN) {
  return typeof token === 'string' && token.length >= MIN_OPS_TOKEN_LENGTH
}

/**
 * Bearer-token check for the machine-to-machine ops endpoints. Disabled (always false) when no
 * token is configured, so a missing variable can never leave the endpoints open.
 */
export function hasValidOpsToken(
  request: Request,
  expected: string | undefined = process.env.OPS_HEALTH_TOKEN,
): boolean {
  if (!isOpsEndpointEnabled(expected) || !expected) return false
  const header = request.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return false
  return timingSafeEqual(digest(match[1].trim()), digest(expected))
}
