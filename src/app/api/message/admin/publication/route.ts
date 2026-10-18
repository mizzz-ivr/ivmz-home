import { isAllowedContactOrigin } from '@/security/contact-origin'
import { readLimitedRequestText } from '@/security/read-limited-request'
import {
  changeAnonymousPublication,
  PublicationRejected,
  type PublicationAction,
} from '@/messages/publication-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AdminSession = { id: number | string; collection: string } | null

type PublicationDependencies = {
  enabled: boolean
  allowedOrigin: (origin: string | null) => boolean
  authenticate: (headers: Headers) => Promise<{ user: AdminSession; adminCollection: string }>
  apply: (messageId: number, actorId: number, action: PublicationAction) => Promise<{ publicId: string | null }>
}

function respond(code: string, status: number, publicId?: string | null) {
  return Response.json(
    { ok: status >= 200 && status < 300, code, ...(publicId ? { publicId } : {}) },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  )
}

export function createPublicationPost(deps: PublicationDependencies) {
  return async (request: Request): Promise<Response> => {
    // Enforce same-origin before touching authentication cookies or parsing a body.
    if (!deps.allowedOrigin(request.headers.get('origin'))) return respond('forbidden_origin', 403)
    if (!deps.enabled) return respond('not_enabled', 503)

    try {
      const { user, adminCollection } = await deps.authenticate(request.headers)
      if (!user) return respond('unauthorized', 401)
      if (user.collection !== adminCollection) return respond('forbidden', 403)
      const actorId = Number(user.id)
      if (!Number.isSafeInteger(actorId) || actorId < 1) return respond('forbidden', 403)

      if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
        return respond('unsupported_media_type', 415)
      }

      const body = await readLimitedRequestText(request, 1024)
      if (body.kind === 'too_large') return respond('payload_too_large', 413)
      if (body.kind === 'invalid') return respond('invalid_request', 400)

      let data: unknown
      try {
        data = JSON.parse(body.text)
      } catch {
        return respond('invalid_json', 400)
      }

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return respond('invalid_request', 400)
      }
      const values = data as Record<string, unknown>
      if (
        Object.keys(values).some((key) => key !== 'messageId' && key !== 'action') ||
        !Number.isSafeInteger(values.messageId) ||
        (values.messageId as number) < 1 ||
        (values.action !== 'publish' && values.action !== 'unpublish')
      ) {
        return respond('validation_error', 422)
      }

      const action = values.action as PublicationAction
      const result = await deps.apply(values.messageId as number, actorId, action)
      return respond(action === 'publish' ? 'published' : 'unpublished', 200, result.publicId)
    } catch (error) {
      if (error instanceof PublicationRejected) return respond(error.code, error.status)
      // Do not write draft text, cookie, reply, public ID, or user IDs into logs.
      console.error('ANONYMOUS_PUBLICATION_FAILED', error instanceof Error ? error.name : 'Unknown')
      return respond('service_unavailable', 503)
    }
  }
}

export async function POST(request: Request) {
  if (process.env.ANONYMOUS_MESSAGE_PUBLICATION_ENABLED !== 'true') {
    return respond('not_enabled', 503)
  }
  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('../../../../../payload.config'),
  ])
  const payload = await getPayload({ config })
  return createPublicationPost({
    enabled: true,
    allowedOrigin: isAllowedContactOrigin,
    authenticate: async (headers) => ({
      ...(await payload.auth({ headers })),
      adminCollection: payload.config.admin.user,
    }),
    apply: (messageId, actorId, action) =>
      changeAnonymousPublication(payload, messageId, actorId, action),
  })(request)
}
