import { createHash, randomUUID } from 'node:crypto'

import { findTypeById, matchDeclaredType } from './catalog'
import { hasDangerousDoubleExtension, sanitizeFilename } from './filename'
import type { AttachmentPolicy } from './policy'
import { CLEAN_PREFIX, QUARANTINE_PREFIX, type AttachmentStorage, type UploadForm } from './storage'
import { signToken, verifyToken, type AttachmentTokenPayload } from './tokens'
import { verifyAttachmentContent } from './verify'

const UPLOAD_TOKEN_TTL_SECONDS = 15 * 60
const ATTACHMENT_TOKEN_TTL_SECONDS = 60 * 60

export type ServiceDeps = {
  policy: AttachmentPolicy
  secret: string
  storage: AttachmentStorage
  now?: () => number
}

export type InitUploadInput = { name: unknown; size: unknown; type: unknown }

export type InitUploadResult =
  | { ok: true; uploadToken: string; upload: UploadForm; expiresIn: number }
  | {
      ok: false
      code: 'disabled' | 'invalid_name' | 'type_not_allowed' | 'invalid_size' | 'too_large'
    }

const nowSeconds = (deps: ServiceDeps) => Math.floor((deps.now?.() ?? Date.now()) / 1000)

export async function initUpload(
  deps: ServiceDeps,
  input: InitUploadInput,
): Promise<InitUploadResult> {
  const { policy } = deps
  if (!policy.enabled) return { ok: false, code: 'disabled' }

  if (typeof input.name !== 'string' || typeof input.type !== 'string') {
    return { ok: false, code: 'invalid_name' }
  }
  const name = sanitizeFilename(input.name)
  if (hasDangerousDoubleExtension(name)) return { ok: false, code: 'type_not_allowed' }

  const type = matchDeclaredType(
    name,
    input.type,
    policy.types.map((allowed) => allowed.id),
  )
  if (!type) return { ok: false, code: 'type_not_allowed' }

  const size = input.size
  if (typeof size !== 'number' || !Number.isInteger(size) || size < 1) {
    return { ok: false, code: 'invalid_size' }
  }
  if (size > policy.maxFileBytes) return { ok: false, code: 'too_large' }

  const id = randomUUID()
  const upload = await deps.storage.createUploadForm({
    expiresInSeconds: UPLOAD_TOKEN_TTL_SECONDS,
    key: `${QUARANTINE_PREFIX}${id}`,
    mime: type.mime,
    size,
  })

  return {
    expiresIn: UPLOAD_TOKEN_TTL_SECONDS,
    ok: true,
    upload,
    uploadToken: signToken(
      {
        exp: nowSeconds(deps) + UPLOAD_TOKEN_TTL_SECONDS,
        id,
        kind: 'upload',
        name,
        size,
        typeId: type.id,
      },
      deps.secret,
    ),
  }
}

export type FinalizeResult =
  | { status: 'waiting_upload' | 'scanning' }
  | { status: 'rejected'; reason: string }
  | {
      status: 'clean'
      attachmentToken: string
      attachment: { name: string; size: number; mime: string }
    }
  | { status: 'invalid_token' }

/**
 * Called repeatedly by the browser until the managed scan has finished. Nothing becomes an
 * attachment unless GuardDuty reported NO_THREATS_FOUND *and* our own content checks pass.
 */
export async function finalizeUpload(
  deps: ServiceDeps,
  uploadToken: unknown,
): Promise<FinalizeResult> {
  const token = verifyToken(uploadToken, 'upload', deps.secret, nowSeconds(deps))
  if (!token) return { status: 'invalid_token' }

  const type = findTypeById(token.typeId)
  const allowed = type && deps.policy.enabled && deps.policy.types.some((t) => t.id === type.id)
  const key = `${QUARANTINE_PREFIX}${token.id}`

  if (!type || !allowed || token.size > deps.policy.maxFileBytes) {
    await deps.storage.deleteObject(key).catch(() => undefined)
    return { reason: 'type_not_allowed', status: 'rejected' }
  }

  const scan = await deps.storage.getScanStatus(key)
  if (scan === 'missing') return { status: 'waiting_upload' }
  if (scan === 'pending') return { status: 'scanning' }

  if (scan !== 'clean') {
    await deps.storage.deleteObject(key).catch(() => undefined)
    return { reason: scan === 'infected' ? 'malware_detected' : 'scan_failed', status: 'rejected' }
  }

  let bytes: Buffer
  try {
    bytes = await deps.storage.readObject(key, deps.policy.maxFileBytes)
  } catch {
    await deps.storage.deleteObject(key).catch(() => undefined)
    return { reason: 'unreadable', status: 'rejected' }
  }

  // The object could have been overwritten (the presigned POST stays valid for a while) between the
  // scan check and the read. A replaced object starts with no scan tag, so re-checking after the
  // read proves these exact bytes are the ones that were scanned.
  if ((await deps.storage.getScanStatus(key)) !== 'clean') {
    await deps.storage.deleteObject(key).catch(() => undefined)
    return { reason: 'changed_during_scan', status: 'rejected' }
  }

  if (bytes.length !== token.size) {
    await deps.storage.deleteObject(key).catch(() => undefined)
    return { reason: 'size_mismatch', status: 'rejected' }
  }

  const verified = await verifyAttachmentContent(type, bytes)
  if (!verified.ok) {
    await deps.storage.deleteObject(key).catch(() => undefined)
    return { reason: verified.reason, status: 'rejected' }
  }

  const finalBytes = verified.bytes
  const cleanKey = `${CLEAN_PREFIX}${token.id}`
  await deps.storage.putObject(cleanKey, finalBytes, type.mime)
  await deps.storage.deleteObject(key).catch(() => undefined)

  const attachment = { mime: type.mime, name: token.name, size: finalBytes.length }
  return {
    attachment,
    attachmentToken: signToken(
      {
        exp: nowSeconds(deps) + ATTACHMENT_TOKEN_TTL_SECONDS,
        id: token.id,
        key: cleanKey,
        kind: 'attachment',
        mime: type.mime,
        name: token.name,
        sha256: createHash('sha256').update(finalBytes).digest('hex'),
        size: finalBytes.length,
        typeId: type.id,
      },
      deps.secret,
    ),
    status: 'clean',
  }
}

export type VerifiedAttachment = Omit<AttachmentTokenPayload, 'exp' | 'kind'>

export type AttachmentTokensResult =
  | { ok: true; attachments: VerifiedAttachment[] }
  | { ok: false; code: 'disabled' | 'invalid_attachment' | 'too_many' | 'too_large' }

/** Re-validates what the form submitted: signed, unexpired, still allowed, within limits, present. */
export async function verifyAttachmentTokens(
  deps: ServiceDeps,
  tokens: unknown,
): Promise<AttachmentTokensResult> {
  if (tokens === undefined || (Array.isArray(tokens) && tokens.length === 0)) {
    return { attachments: [], ok: true }
  }
  if (!deps.policy.enabled) return { code: 'disabled', ok: false }
  if (!Array.isArray(tokens)) return { code: 'invalid_attachment', ok: false }
  if (tokens.length > deps.policy.maxFiles) return { code: 'too_many', ok: false }

  const seen = new Set<string>()
  const attachments: VerifiedAttachment[] = []
  let total = 0

  for (const raw of tokens) {
    const payload = verifyToken(raw, 'attachment', deps.secret, nowSeconds(deps))
    if (
      !payload ||
      seen.has(payload.id) ||
      !payload.key.startsWith(CLEAN_PREFIX) ||
      !deps.policy.types.some((type) => type.id === payload.typeId) ||
      payload.size > deps.policy.maxFileBytes
    ) {
      return { code: 'invalid_attachment', ok: false }
    }
    seen.add(payload.id)
    total += payload.size
    if (total > deps.policy.maxTotalBytes) return { code: 'too_large', ok: false }

    if (!(await deps.storage.exists(payload.key))) return { code: 'invalid_attachment', ok: false }

    attachments.push({
      id: payload.id,
      key: payload.key,
      mime: payload.mime,
      name: payload.name,
      sha256: payload.sha256,
      size: payload.size,
      typeId: payload.typeId,
    })
  }

  return { attachments, ok: true }
}
