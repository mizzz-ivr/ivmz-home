import { isAllowedContactOrigin } from '@/security/contact-origin'
import { readLimitedRequestText } from '@/security/read-limited-request'
import { verifyTurnstile, type TurnstileResult } from '@/security/turnstile'
import {
  ANONYMOUS_MESSAGE_BODY_LIMIT_BYTES,
  parseAnonymousMessageSubmission,
  type AnonymousMessageInput,
} from '@/messages/schema'
import type { SaveResult } from '@/messages/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Dependencies = {
  enabled: boolean
  secret: string | undefined
  hashKey: string | undefined
  allowOrigin: (origin: string | null) => boolean
  verifyCaptcha: (token: unknown, remoteIp: string | null) => Promise<TurnstileResult>
  consume: (request: Request, hashKey: string) => Promise<boolean>
  save: (input: AnonymousMessageInput) => Promise<SaveResult>
}

function json(code: string, status: number, extra: Record<string, unknown> = {}) {
  return Response.json(
    { ok: status >= 200 && status < 300, code, ...extra },
    { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
  )
}

/** Exported pure HTTP composition for security tests without accessing the production database. */
export function createAnonymousMessagePost(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (!deps.allowOrigin(request.headers.get('origin'))) return json('forbidden_origin', 403)

    // Explicit opt-in and bot protection required; no default-open Preview behavior.
    if (!deps.enabled || !deps.secret || !deps.hashKey || deps.hashKey.length < 32) {
      return json('service_unavailable', 503)
    }

    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
      return json('unsupported_media_type', 415)
    }

    const incoming = await readLimitedRequestText(request, ANONYMOUS_MESSAGE_BODY_LIMIT_BYTES)
    if (incoming.kind === 'too_large') return json('payload_too_large', 413)
    if (incoming.kind === 'invalid') return json('invalid_request', 400)

    let raw: unknown
    try {
      raw = JSON.parse(incoming.text)
    } catch {
      return json('invalid_json', 400)
    }

    const parsed = parseAnonymousMessageSubmission(raw)
    if (parsed.kind === 'honeypot') return json('received', 202)
    if (parsed.kind === 'invalid') return json('validation_error', 422, { errors: parsed.errors })

    const token = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>).turnstileToken
      : undefined
    const ip = request.headers.get('x-nf-client-connection-ip')
    if ((await deps.verifyCaptcha(token, ip)) !== 'ok') return json('captcha_failed', 403)

    try {
      if (!(await deps.consume(request, deps.hashKey))) return json('rate_limited', 429, { retryAfterSeconds: 600 })

      const result = await deps.save(parsed.value)
      if (result === 'conflict') return json('idempotency_conflict', 409)
      return json('received', result === 'created' ? 201 : 200)
    } catch (error) {
      // Do not log submitted text, IP, request ID, or bot token.
      console.error('ANONYMOUS_MESSAGE_SAVE_FAILED', error instanceof Error ? error.name : 'UnknownError')
      return json('service_unavailable', 503)
    }
  }
}

/** No anonymous storage is reachable until ops explicitly enables it with both secrets. */
export async function POST(request: Request): Promise<Response> {
  if (process.env.ANONYMOUS_MESSAGES_ENABLED !== 'true') {
    return json('service_unavailable', 503)
  }

  const secret = process.env.TURNSTILE_SECRET_KEY
  const hashKey = process.env.ANONYMOUS_MESSAGE_HASH_KEY
  if (!secret || !hashKey || hashKey.length < 32) return json('service_unavailable', 503)

  const { PayloadAnonymousMessageStore } = await import('@/messages/store')
  const store = new PayloadAnonymousMessageStore()
  const handler = createAnonymousMessagePost({
    enabled: true,
    secret,
    hashKey,
    allowOrigin: isAllowedContactOrigin,
    verifyCaptcha: (token, remoteIp) => verifyTurnstile(token, remoteIp, { secret }),
    consume: (req, key) => store.consume(req, key),
    save: (input) => store.save(input),
  })
  return handler(request)
}
