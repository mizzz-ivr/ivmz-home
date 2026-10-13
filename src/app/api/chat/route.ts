import { allowChatRequest } from '@/chat/limits'
import { askLlm, parseChatTurns, readLlmConfig } from '@/chat/llm'
import { isAllowedContactOrigin } from '@/security/contact-origin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BODY_LIMIT_BYTES = 4_096

function json(body: unknown, status = 200) {
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' }, status })
}

/**
 * Optional AI answer for the home page chat. Always answers 200 with `{ reply }` or `{ reply:
 * null }`: the browser then falls back to the built-in FAQ answer, so this endpoint can fail,
 * be disabled or run out of quota without the visitor noticing. Nothing the visitor writes is
 * logged or stored here.
 */
export async function POST(request: Request) {
  const config = readLlmConfig()
  if (!config) return json({ reply: null })
  if (!isAllowedContactOrigin(request.headers.get('origin'))) return json({ error: 'origin' }, 403)

  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > BODY_LIMIT_BYTES) return json({ error: 'too_large' }, 413)

  let body: unknown
  try {
    const text = await request.text()
    if (text.length > BODY_LIMIT_BYTES) return json({ error: 'too_large' }, 413)
    body = JSON.parse(text)
  } catch {
    return json({ error: 'invalid' }, 400)
  }

  const turns = parseChatTurns((body as { messages?: unknown } | null)?.messages)
  if (!turns) return json({ error: 'invalid' }, 400)

  if (allowChatRequest(request) !== 'ok') return json({ reply: null, limited: true })

  return json({ reply: await askLlm(turns, config) })
}
