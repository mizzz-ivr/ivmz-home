import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Stateless, HMAC-signed tokens so no extra database table is needed:
 * - `upload`: issued when an upload starts; binds object id, declared name/size/type.
 * - `attachment`: issued only after the scan + content checks passed; the contact form submits
 *   these, so a client can never attach an arbitrary key or an unscanned object.
 */

export type UploadTokenPayload = {
  kind: 'upload'
  id: string
  name: string
  size: number
  typeId: string
  exp: number
}

export type AttachmentTokenPayload = {
  kind: 'attachment'
  id: string
  key: string
  name: string
  size: number
  typeId: string
  mime: string
  sha256: string
  exp: number
}

export type TokenPayload = UploadTokenPayload | AttachmentTokenPayload

const LABEL = 'ivmz-contact-attachments-v1'

function deriveKey(secret: string) {
  return createHmac('sha256', secret).update(LABEL).digest()
}

function sign(body: string, secret: string) {
  return createHmac('sha256', deriveKey(secret)).update(body).digest('base64url')
}

export function signToken(payload: TokenPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${sign(body, secret)}`
}

export function verifyToken<K extends TokenPayload['kind']>(
  token: unknown,
  kind: K,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Extract<TokenPayload, { kind: K }> | null {
  if (typeof token !== 'string' || token.length > 4096 || !secret) return null

  const [body, signature, extra] = token.split('.')
  if (!body || !signature || extra !== undefined) return null

  const expected = Buffer.from(sign(body, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload
    if (payload.kind !== kind || typeof payload.exp !== 'number' || payload.exp < nowSeconds) {
      return null
    }
    return payload as Extract<TokenPayload, { kind: K }>
  } catch {
    return null
  }
}
