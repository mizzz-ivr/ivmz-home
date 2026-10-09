import {
  ContactDeliveryUnavailableError,
  createContactDelivery,
  type ContactDelivery,
  type ContactDeliveryMessage,
} from '@/contact/delivery'
import { CONTACT_BODY_LIMIT_BYTES, parseContactSubmission } from '@/contact/schema'
import { recipientFor } from '@/lib/contact-routing'
import { isAllowedContactOrigin } from '@/security/contact-origin'

export const runtime = 'nodejs'

const DELIVERY_TIMEOUT_MS = 8_000

class ContactDeliveryTimeoutError extends Error {
  constructor() {
    super('Contact delivery timed out.')
    this.name = 'ContactDeliveryTimeoutError'
  }
}

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

async function deliverWithTimeout(delivery: ContactDelivery, message: ContactDeliveryMessage) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      delivery.deliver(message),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new ContactDeliveryTimeoutError()), DELIVERY_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function POST(request: Request) {
  if (!isAllowedContactOrigin(request.headers.get('origin'))) {
    return json(
      {
        code: 'forbidden_origin',
        ok: false,
      },
      403,
    )
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return json(
      {
        code: 'unsupported_media_type',
        ok: false,
      },
      415,
    )
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > CONTACT_BODY_LIMIT_BYTES) {
    return json(
      {
        code: 'payload_too_large',
        ok: false,
      },
      413,
    )
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return json(
      {
        code: 'invalid_request',
        ok: false,
      },
      400,
    )
  }

  if (new TextEncoder().encode(rawBody).byteLength > CONTACT_BODY_LIMIT_BYTES) {
    return json(
      {
        code: 'payload_too_large',
        ok: false,
      },
      413,
    )
  }

  let input: unknown
  try {
    input = JSON.parse(rawBody)
  } catch {
    return json(
      {
        code: 'invalid_json',
        ok: false,
      },
      400,
    )
  }

  const parsed = parseContactSubmission(input)

  if (parsed.kind === 'honeypot') {
    return json({ ok: true }, 202)
  }

  if (parsed.kind === 'invalid') {
    return json(
      {
        code: 'validation_error',
        errors: parsed.errors,
        ok: false,
      },
      422,
    )
  }

  // A retry of the same submission carries the same id, so a timed-out-but-committed save is not duplicated.
  const requestId = parsed.value.requestId ?? crypto.randomUUID()
  const delivery = createContactDelivery()
  const message: ContactDeliveryMessage = {
    ...parsed.value,
    recipient: recipientFor(parsed.value.category),
    requestId,
  }

  try {
    const result = await deliverWithTimeout(delivery, message)

    return json(
      {
        mode: result.mode,
        ok: true,
        requestId,
      },
      result.mode === 'preview' ? 202 : 201,
    )
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'

    console.error(
      'CONTACT_DELIVERY_FAILED',
      JSON.stringify({
        category: parsed.value.category,
        delivery: delivery.kind,
        error: errorName,
        requestId,
      }),
    )

    if (error instanceof ContactDeliveryUnavailableError) {
      return json(
        {
          code: 'delivery_unavailable',
          ok: false,
          requestId,
        },
        503,
      )
    }

    if (error instanceof ContactDeliveryTimeoutError) {
      return json(
        {
          code: 'delivery_timeout',
          ok: false,
          requestId,
        },
        504,
      )
    }

    return json(
      {
        code: 'delivery_failed',
        ok: false,
        requestId,
      },
      502,
    )
  }
}
