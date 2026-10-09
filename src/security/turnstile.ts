/**
 * Cloudflare Turnstile verification for the contact form. Optional: with no `TURNSTILE_SECRET_KEY`
 * the check is skipped (the other defenses stay on). Once a secret is configured it fails closed:
 * a missing, malformed, reused or unverifiable token is rejected.
 */

export type TurnstileResult = 'failed' | 'ok' | 'skipped'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
// Kept short: it runs inside the route's overall request budget (see route.ts).
const TIMEOUT_MS = 2_000
const MAX_TOKEN_LENGTH = 2_048

export async function verifyTurnstile(
  token: unknown,
  remoteIp: string | null | undefined,
  options: { fetcher?: typeof fetch; secret?: string | undefined } = {},
): Promise<TurnstileResult> {
  const secret = 'secret' in options ? options.secret : process.env.TURNSTILE_SECRET_KEY
  if (!secret) return 'skipped'

  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return 'failed'
  }

  const body = new URLSearchParams({ response: token, secret })
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const response = await (options.fetcher ?? fetch)(VERIFY_URL, {
      body,
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) return 'failed'
    const result = (await response.json()) as { success?: unknown }
    return result.success === true ? 'ok' : 'failed'
  } catch {
    return 'failed'
  }
}
