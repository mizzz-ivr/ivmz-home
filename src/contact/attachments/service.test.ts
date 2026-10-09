import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { resolveAttachmentPolicy } from './policy'
import { finalizeUpload, initUpload, verifyAttachmentTokens, type ServiceDeps } from './service'
import type { AttachmentStorage, ScanStatus } from './storage'

const SECRET = 'test-secret-for-attachments'

function fakeStorage(initial: Record<string, { bytes: Buffer; scan?: ScanStatus }> = {}) {
  const objects = new Map(Object.entries(initial))
  const calls = { deleted: [] as string[], uploads: [] as unknown[] }
  const storage: AttachmentStorage = {
    createDownloadUrl: async (key) => `https://example.test/${key}`,
    createUploadForm: async (input) => {
      calls.uploads.push(input)
      return { fields: { key: input.key }, url: 'https://bucket.example.test' }
    },
    deleteObject: async (key) => {
      calls.deleted.push(key)
      objects.delete(key)
    },
    exists: async (key) => objects.has(key),
    getScanStatus: async (key) =>
      objects.has(key) ? (objects.get(key)!.scan ?? 'pending') : 'missing',
    putObject: async (key, bytes) => {
      objects.set(key, { bytes })
    },
    readObject: async (key) => objects.get(key)!.bytes,
  }
  return { calls, objects, storage }
}

function deps(storage: AttachmentStorage, settings = {}): ServiceDeps {
  return {
    policy: resolveAttachmentPolicy(
      { allowedTypes: ['png', 'pdf', 'txt'], attachmentsEnabled: true, maxFiles: 2, ...settings },
      { storageConfigured: true },
    ),
    secret: SECRET,
    storage,
  }
}

const pngBytes = () =>
  sharp({ create: { background: '#fff', channels: 3, height: 4, width: 4 } })
    .png()
    .toBuffer()

describe('initUpload', () => {
  it('refuses everything while attachments are disabled', async () => {
    const { storage } = fakeStorage()
    const disabled: ServiceDeps = {
      policy: resolveAttachmentPolicy(null, { storageConfigured: true }),
      secret: SECRET,
      storage,
    }
    expect(await initUpload(disabled, { name: 'a.png', size: 10, type: 'image/png' })).toEqual({
      code: 'disabled',
      ok: false,
    })
  })

  it('validates type, extension, size and double extensions', async () => {
    const { storage } = fakeStorage()
    const d = deps(storage)

    expect(
      await initUpload(d, { name: 'a.exe', size: 10, type: 'application/x-msdownload' }),
    ).toMatchObject({ code: 'type_not_allowed' })
    expect(await initUpload(d, { name: 'a.png', size: 10, type: 'application/pdf' })).toMatchObject(
      { code: 'type_not_allowed' },
    )
    expect(
      await initUpload(d, { name: 'a.exe.pdf', size: 10, type: 'application/pdf' }),
    ).toMatchObject({ code: 'type_not_allowed' })
    expect(await initUpload(d, { name: 'a.png', size: 0, type: 'image/png' })).toMatchObject({
      code: 'invalid_size',
    })
    expect(await initUpload(d, { name: 'a.png', size: 1.5, type: 'image/png' })).toMatchObject({
      code: 'invalid_size',
    })
    expect(
      await initUpload(d, { name: 'a.png', size: 6 * 1024 * 1024, type: 'image/png' }),
    ).toMatchObject({ code: 'too_large' })
    expect(await initUpload(d, { name: 123, size: 10, type: 'image/png' })).toMatchObject({
      code: 'invalid_name',
    })
  })

  it('creates a quarantine upload bound to the exact size and type', async () => {
    const { calls, storage } = fakeStorage()
    const result = await initUpload(deps(storage), {
      name: 'photo.png',
      size: 100,
      type: 'image/png',
    })

    expect(result.ok).toBe(true)
    const input = calls.uploads[0] as { key: string; mime: string; size: number }
    expect(input.key.startsWith('quarantine/')).toBe(true)
    expect(input).toMatchObject({ mime: 'image/png', size: 100 })
  })
})

describe('finalizeUpload', () => {
  async function started(
    png: Buffer,
    scan: ScanStatus | undefined,
    extra: Partial<{ name: string }> = {},
  ) {
    const fake = fakeStorage()
    const d = deps(fake.storage)
    const init = await initUpload(d, {
      name: extra.name ?? 'photo.png',
      size: png.length,
      type: 'image/png',
    })
    if (!init.ok) throw new Error('init failed')
    const id = (fake.calls.uploads[0] as { key: string }).key
    if (scan !== undefined) fake.objects.set(id, { bytes: png, scan })
    return { ...fake, d, id, token: init.uploadToken }
  }

  it('rejects a forged or malformed upload token', async () => {
    const { storage } = fakeStorage()
    expect(await finalizeUpload(deps(storage), 'nope')).toEqual({ status: 'invalid_token' })
    expect(await finalizeUpload(deps(storage), undefined)).toEqual({ status: 'invalid_token' })
  })

  it('waits for the upload, then for the scan', async () => {
    const png = await pngBytes()
    const waiting = await started(png, undefined)
    expect(await finalizeUpload(waiting.d, waiting.token)).toEqual({ status: 'waiting_upload' })

    const scanning = await started(png, 'pending')
    expect(await finalizeUpload(scanning.d, scanning.token)).toEqual({ status: 'scanning' })
  })

  it('deletes and rejects infected or failed scans', async () => {
    const png = await pngBytes()
    const infected = await started(png, 'infected')
    expect(await finalizeUpload(infected.d, infected.token)).toEqual({
      reason: 'malware_detected',
      status: 'rejected',
    })
    expect(infected.calls.deleted).toContain(infected.id)

    const failed = await started(png, 'failed')
    expect(await finalizeUpload(failed.d, failed.token)).toEqual({
      reason: 'scan_failed',
      status: 'rejected',
    })
  })

  it('rejects when the stored size differs from the declared size', async () => {
    const png = await pngBytes()
    const fake = await started(png, 'clean')
    fake.objects.set(fake.id, { bytes: Buffer.concat([png, Buffer.from('x')]), scan: 'clean' })
    expect(await finalizeUpload(fake.d, fake.token)).toEqual({
      reason: 'size_mismatch',
      status: 'rejected',
    })
  })

  it('rejects when the object was replaced between the scan check and the read', async () => {
    const png = await pngBytes()
    const fake = fakeStorage()
    const d = deps(fake.storage)
    const init = await initUpload(d, { name: 'photo.png', size: png.length, type: 'image/png' })
    if (!init.ok) throw new Error('init failed')
    const key = (fake.calls.uploads[0] as { key: string }).key
    fake.objects.set(key, { bytes: png, scan: 'clean' })

    // First scan check says clean; by the second one the object was swapped for an unscanned file.
    let checks = 0
    const swapped: ServiceDeps = {
      ...d,
      storage: {
        ...fake.storage,
        getScanStatus: async (target) => {
          checks += 1
          return checks === 1 ? fake.storage.getScanStatus(target) : 'pending'
        },
      },
    }

    expect(await finalizeUpload(swapped, init.uploadToken)).toEqual({
      reason: 'changed_during_scan',
      status: 'rejected',
    })
    expect(fake.calls.deleted).toContain(key)
    expect([...fake.objects.keys()].some((k) => k.startsWith('clean/'))).toBe(false)
  })

  it('rejects content that fails our own checks even when the scanner said clean', async () => {
    const fake = fakeStorage()
    const d = deps(fake.storage)
    const bytes = Buffer.from('MZ this is not a png')
    const init = await initUpload(d, { name: 'photo.png', size: bytes.length, type: 'image/png' })
    if (!init.ok) throw new Error('init failed')
    const key = (fake.calls.uploads[0] as { key: string }).key
    fake.objects.set(key, { bytes, scan: 'clean' })

    expect(await finalizeUpload(d, init.uploadToken)).toEqual({
      reason: 'type_mismatch',
      status: 'rejected',
    })
    expect(fake.objects.has(key)).toBe(false)
  })

  it('promotes a clean, verified file and returns a signed attachment token', async () => {
    const png = await pngBytes()
    const fake = await started(png, 'clean')
    const result = await finalizeUpload(fake.d, fake.token)

    expect(result.status).toBe('clean')
    if (result.status !== 'clean') return
    expect(result.attachment.mime).toBe('image/png')
    expect(fake.objects.has(fake.id)).toBe(false)
    expect([...fake.objects.keys()].some((key) => key.startsWith('clean/'))).toBe(true)

    const verified = await verifyAttachmentTokens(fake.d, [result.attachmentToken])
    expect(verified.ok).toBe(true)
  })
})

describe('verifyAttachmentTokens', () => {
  it('accepts an empty submission without touching the policy', async () => {
    const { storage } = fakeStorage()
    const off: ServiceDeps = {
      policy: resolveAttachmentPolicy(null, { storageConfigured: false }),
      secret: SECRET,
      storage,
    }
    expect(await verifyAttachmentTokens(off, undefined)).toEqual({ attachments: [], ok: true })
    expect(await verifyAttachmentTokens(off, [])).toEqual({ attachments: [], ok: true })
  })

  it('refuses attachments while disabled, malformed, forged, duplicated or too many', async () => {
    const png = await pngBytes()
    const fake = fakeStorage()
    const d = deps(fake.storage)
    const init = await initUpload(d, { name: 'a.png', size: png.length, type: 'image/png' })
    if (!init.ok) throw new Error('init failed')
    const key = (fake.calls.uploads[0] as { key: string }).key
    fake.objects.set(key, { bytes: png, scan: 'clean' })
    const done = await finalizeUpload(d, init.uploadToken)
    if (done.status !== 'clean') throw new Error('not clean')
    const token = done.attachmentToken

    const off: ServiceDeps = {
      ...d,
      policy: resolveAttachmentPolicy(null, { storageConfigured: true }),
    }
    expect(await verifyAttachmentTokens(off, [token])).toEqual({ code: 'disabled', ok: false })
    expect(await verifyAttachmentTokens(d, 'x')).toEqual({ code: 'invalid_attachment', ok: false })
    expect(await verifyAttachmentTokens(d, ['forged.token'])).toEqual({
      code: 'invalid_attachment',
      ok: false,
    })
    expect(await verifyAttachmentTokens(d, [token, token])).toEqual({
      code: 'invalid_attachment',
      ok: false,
    })
    expect(await verifyAttachmentTokens(d, [token, token, token])).toEqual({
      code: 'too_many',
      ok: false,
    })
    expect(await verifyAttachmentTokens({ ...d, secret: 'other-secret' }, [token])).toEqual({
      code: 'invalid_attachment',
      ok: false,
    })
  })

  it('refuses a token whose clean object has disappeared or whose type was disallowed later', async () => {
    const png = await pngBytes()
    const fake = fakeStorage()
    const d = deps(fake.storage)
    const init = await initUpload(d, { name: 'a.png', size: png.length, type: 'image/png' })
    if (!init.ok) throw new Error('init failed')
    fake.objects.set((fake.calls.uploads[0] as { key: string }).key, { bytes: png, scan: 'clean' })
    const done = await finalizeUpload(d, init.uploadToken)
    if (done.status !== 'clean') throw new Error('not clean')

    const cleanKey = [...fake.objects.keys()].find((key) => key.startsWith('clean/'))!
    const noPng = deps(fake.storage, { allowedTypes: ['pdf'] })
    expect(await verifyAttachmentTokens(noPng, [done.attachmentToken])).toEqual({
      code: 'invalid_attachment',
      ok: false,
    })

    fake.objects.delete(cleanKey)
    expect(await verifyAttachmentTokens(d, [done.attachmentToken])).toEqual({
      code: 'invalid_attachment',
      ok: false,
    })
  })

  it('enforces the admin total size limit at submit time', async () => {
    const fake = fakeStorage()
    const d = deps(fake.storage, { maxFileSizeMB: 1, maxTotalSizeMB: 1 })
    const big = Buffer.alloc(700 * 1024, 0x41)
    const tokens: string[] = []
    for (let n = 0; n < 2; n += 1) {
      const init = await initUpload(d, { name: `n${n}.txt`, size: big.length, type: 'text/plain' })
      if (!init.ok) throw new Error('init failed')
      fake.objects.set((fake.calls.uploads[n] as { key: string }).key, {
        bytes: big,
        scan: 'clean',
      })
      const done = await finalizeUpload(d, init.uploadToken)
      if (done.status !== 'clean') throw new Error('not clean')
      tokens.push(done.attachmentToken)
    }
    expect(await verifyAttachmentTokens(d, tokens)).toEqual({ code: 'too_large', ok: false })
  })
})
