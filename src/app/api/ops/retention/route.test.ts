import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPayload: vi.fn(),
  hasValidOpsToken: vi.fn(),
  isOpsEndpointEnabled: vi.fn(),
  count: vi.fn(),
  find: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('@/ops/auth', () => ({
  hasValidOpsToken: mocks.hasValidOpsToken,
  isOpsEndpointEnabled: mocks.isOpsEndpointEnabled,
}))

async function report(body: string) {
  const { POST } = await import('./route')
  return POST(
    new Request('https://ivmz.ivrm.jp/api/ops/retention', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    }),
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.isOpsEndpointEnabled.mockReturnValue(true)
  mocks.hasValidOpsToken.mockReturnValue(true)
  mocks.getPayload.mockResolvedValue({
    count: mocks.count,
    find: mocks.find,
    delete: mocks.delete,
  })
  mocks.count
    .mockResolvedValueOnce({ totalDocs: 3 })
    .mockResolvedValueOnce({ totalDocs: 1 })
    .mockResolvedValueOnce({ totalDocs: 2 })
})

describe('POST /api/ops/retention', () => {
  it('rejects destructive apply requests before touching the DB, even with the legacy flag set', async () => {
    const previous = process.env.RETENTION_PURGE_ENABLED
    process.env.RETENTION_PURGE_ENABLED = 'true'
    try {
      const response = await report(JSON.stringify({ apply: true }))
      expect(response.status).toBe(403)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.json()).toEqual({ code: 'retention_apply_unavailable' })
      expect(mocks.getPayload).not.toHaveBeenCalled()
      expect(mocks.count).not.toHaveBeenCalled()
      expect(mocks.find).not.toHaveBeenCalled()
      expect(mocks.delete).not.toHaveBeenCalled()
    } finally {
      if (previous === undefined) delete process.env.RETENTION_PURGE_ENABLED
      else process.env.RETENTION_PURGE_ENABLED = previous
    }
  })

  it('requires authentication before returning even the deletion-blocked status', async () => {
    mocks.hasValidOpsToken.mockReturnValue(false)
    const unauthorized = await report('{"apply":true}')
    expect(unauthorized.status).toBe(401)
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('returns 404 when the ops endpoint is disabled', async () => {
    mocks.isOpsEndpointEnabled.mockReturnValue(false)
    expect((await report('{"apply":true}')).status).toBe(404)
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('preserves numeric dry-run counts and never invokes deletion', async () => {
    const response = await report('{}')
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({
      days: 365,
      dryRun: true,
      eligible: 3,
      overdueNew: 2,
      withAttachments: 1,
      willDeleteNow: 3,
    })
    expect(mocks.count).toHaveBeenCalledTimes(3)
    expect(mocks.count).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'contact-submissions',
        overrideAccess: true,
        where: expect.objectContaining({
          and: expect.arrayContaining([{ status: { not_equals: 'new' } }]),
        }),
      }),
    )
    expect(mocks.count).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          and: expect.arrayContaining([
            { status: { not_equals: 'new' } },
            { 'attachments.id': { exists: true } },
          ]),
        }),
      }),
    )
    expect(mocks.count).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({
          and: expect.arrayContaining([{ status: { equals: 'new' } }]),
        }),
      }),
    )
    expect(mocks.find).not.toHaveBeenCalled()
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('malformed JSON cannot turn a report into a destructive operation', async () => {
    const response = await report('not-json')
    expect(response.status).toBe(200)
    expect((await response.json()).dryRun).toBe(true)
    expect(mocks.delete).not.toHaveBeenCalled()
  })
})
