import {
  ContactDeliveryUnavailableError,
  createContactDelivery,
  type ContactDelivery,
  type ContactDeliveryMessage,
} from '@/contact/delivery'
import { CONTACT_BODY_LIMIT_BYTES, parseContactSubmission } from '@/contact/schema'
import { getAttachmentRuntime } from '@/contact/attachments/runtime'
import { verifyAttachmentTokens } from '@/contact/attachments/service'
import { recipientFor } from '@/lib/contact-routing'
import { isAllowedContactOrigin } from '@/security/contact-origin'
import { verifyTurnstile } from '@/security/turnstile'

export const runtime = 'nodejs'

// Whole-request budget, measured from the start of the request. It stays under the browser's 10 s
// abort so a stored submission is never reported as a failure, and it covers the Turnstile check
// (<= 2 s) plus attachment verification before delivery gets what is left (>= 1 s).
const REQUEST_BUDGET_MS = 9_000
const MIN_DELIVERY_TIMEOUT_MS = 1_000

class ContactDeliveryTimeoutError extends Error {
  constructor() {
    super('Contact delivery timed out.')
    this.name = 'ContactDeliveryTimeoutError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

async function deliverWithTimeout(
  delivery: ContactDelivery,
  message: ContactDeliveryMessage,
  timeoutMs: number,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      delivery.deliver(message),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new ContactDeliveryTimeoutError()), timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now()

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

  // Bot check (only when TURNSTILE_SECRET_KEY is set). Runs after validation so a validation error
  // does not spend the visitor's single-use token.
  const captcha = await verifyTurnstile(
    isRecord(input) ? input.turnstileToken : undefined,
    request.headers.get('x-nf-client-connection-ip'),
  )
  if (captcha === 'failed') {
    return json({ code: 'captcha_failed', ok: false }, 403)
  }

  const attachmentTokens = isRecord(input) ? input.attachments : undefined
  let attachments: ContactDeliveryMessage['attachments']

  if (
    attachmentTokens !== undefined &&
    !(Array.isArray(attachmentTokens) && attachmentTokens.length === 0)
  ) {
    const runtimeDeps = await getAttachmentRuntime()
    const verified = runtimeDeps
      ? await verifyAttachmentTokens(runtimeDeps, attachmentTokens).catch(() => undefined)
      : undefined

    if (!verified?.ok) {
      return json(
        {
          code: 'attachment_invalid',
          errors: { attachments: '添付ファイルを確認してください。' },
          ok: false,
        },
        422,
      )
    }

    attachments = verified.attachments.map((attachment) => ({
      contentType: attachment.mime,
      filename: attachment.name,
      key: attachment.key,
      sha256: attachment.sha256,
      size: attachment.size,
    }))
  }

  // A retry of the same submission carries the same id, so a timed-out-but-committed save is not duplicated.
  const requestId = parsed.value.requestId ?? crypto.randomUUID()
  const delivery = createContactDelivery()
  const message: ContactDeliveryMessage = {
    ...parsed.value,
    ...(attachments ? { attachments } : {}),
    recipient: recipientFor(parsed.value.category),
    requestId,
  }

  try {
    const result = await deliverWithTimeout(
      delivery,
      message,
      Math.max(MIN_DELIVERY_TIMEOUT_MS, REQUEST_BUDGET_MS - (Date.now() - startedAt)),
    )

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
