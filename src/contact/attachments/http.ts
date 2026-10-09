import { isAllowedContactOrigin } from '@/security/contact-origin'

export function json(body: unknown, status: number) {
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' }, status })
}

const MAX_JSON_BYTES = 4 * 1024

/** Same-origin JSON POST guard shared by the attachment endpoints. */
export async function readGuardedJson(
  request: Request,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: Response }> {
  if (!isAllowedContactOrigin(request.headers.get('origin'))) {
    return { ok: false, response: json({ code: 'forbidden_origin', ok: false }, 403) }
  }
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return { ok: false, response: json({ code: 'unsupported_media_type', ok: false }, 415) }
  }

  const raw = await request.text().catch(() => '')
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BYTES) {
    return { ok: false, response: json({ code: 'payload_too_large', ok: false }, 413) }
  }

  try {
    const body = JSON.parse(raw) as unknown
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error('shape')
    return { ok: true, body: body as Record<string, unknown> }
  } catch {
    return { ok: false, response: json({ code: 'invalid_json', ok: false }, 400) }
  }
}
