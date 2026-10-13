import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const count = vi.fn()
const find = vi.fn()
const del = vi.fn()
const findGlobal = vi.fn()

vi.mock('payload', () => ({
  getPayload: async () => ({ count, delete: del, find, findGlobal }),
}))
vi.mock('@/payload.config', () => ({ default: {} }))

import { GET as health } from './health/route'
import { POST as retention } from './retention/route'

const token = 't'.repeat(40)
const auth = { authorization: `Bearer ${token}` }
const get = (headers: Record<string, string> = {}) =>
  new Request('https://example.test/api/ops/health', { headers })
const post = (body: unknown, headers: Record<string, string> = auth) =>
  new Request('https://example.test/api/ops/retention', {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
    method: 'POST',
  })

beforeEach(() => {
  count.mockReset().mockResolvedValue({ totalDocs: 0 })
  find.mockReset().mockResolvedValue({ docs: [] })
  del.mockReset().mockImplementation(async () => ({ docs: [{ id: 1 }], errors: [] }))
  findGlobal.mockReset().mockResolvedValue({ attachmentsEnabled: false })
  vi.stubEnv('OPS_HEALTH_TOKEN', token)
})
afterEach(() => vi.unstubAllEnvs())

describe('GET /api/ops/health', () => {
  it('does not exist until a token is configured, and rejects a wrong token', async () => {
    vi.stubEnv('OPS_HEALTH_TOKEN', '')
    expect((await health(get(auth))).status).toBe(404)

    vi.stubEnv('OPS_HEALTH_TOKEN', 'too-short')
    expect((await health(get({ authorization: 'Bearer too-short' }))).status).toBe(404)

    vi.stubEnv('OPS_HEALTH_TOKEN', token)
    expect((await health(get())).status).toBe(401)
    expect((await health(get({ authorization: 'Bearer nope' }))).status).toBe(401)
  })

  it('reports ok with numbers only', async () => {
    const response = await health(get(auth))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.stats.received.total).toBe(0)
    expect(JSON.stringify(body)).not.toMatch(/@/)
  })

  it('reports degraded on notification failures and down when the database fails', async () => {
    count.mockImplementation(async (args: { where?: { and?: unknown[] } }) => {
      const text = JSON.stringify(args.where ?? {})
      return { totalDocs: text.includes('"in":["failed","unknown"]') ? 2 : 0 }
    })
    const degraded = await (await health(get(auth))).json()
    expect(degraded.status).toBe('degraded')

    count.mockRejectedValue(new Error('db down'))
    const down = await health(get(auth))
    expect(down.status).toBe(503)
    expect((await down.json()).status).toBe('down')
  })
})

describe('POST /api/ops/retention', () => {
  it('requires the token', async () => {
    expect((await retention(post({}, {}))).status).toBe(401)
  })

  it('is a dry run by default and never deletes', async () => {
    count.mockResolvedValue({ totalDocs: 3 })
    const body = await (await retention(post({}))).json()
    expect(body).toMatchObject({ dryRun: true, eligible: 3 })
    expect(del).not.toHaveBeenCalled()
  })

  it('refuses to delete unless purging is enabled in the environment', async () => {
    count.mockResolvedValue({ totalDocs: 3 })
    const response = await retention(post({ apply: true }))
    expect(response.status).toBe(403)
    expect((await response.json()).code).toBe('purge_disabled')
    expect(del).not.toHaveBeenCalled()
  })

  it('deletes only the eligible records when both guards are satisfied', async () => {
    vi.stubEnv('RETENTION_PURGE_ENABLED', 'true')
    count.mockResolvedValue({ totalDocs: 2 })
    find.mockResolvedValue({ docs: [{ id: 1 }, { id: 2 }] })

    const body = await (await retention(post({ apply: true }))).json()
    expect(body).toMatchObject({ deleted: 2, dryRun: false, failed: 0 })
    expect(del).toHaveBeenCalledTimes(2)

    const query = JSON.stringify(find.mock.calls[0][0].where)
    expect(query).toContain('"not_equals":"new"')
    expect(query).toContain('updatedAt')
  })

  it('re-checks eligibility inside every delete and skips records that changed meanwhile', async () => {
    vi.stubEnv('RETENTION_PURGE_ENABLED', 'true')
    count.mockResolvedValue({ totalDocs: 2 })
    find.mockResolvedValue({ docs: [{ id: 1 }, { id: 2 }] })
    // The second record was set back to "New" after the batch was selected: nothing matches.
    del
      .mockResolvedValueOnce({ docs: [{ id: 1 }], errors: [] })
      .mockResolvedValueOnce({ docs: [], errors: [] })

    const body = await (await retention(post({ apply: true }))).json()
    expect(body).toMatchObject({ deleted: 1, failed: 0, skipped: 1 })

    for (const [args] of del.mock.calls) {
      expect(args.id).toBeUndefined()
      const where = JSON.stringify(args.where)
      expect(where).toContain('"not_equals":"new"')
      expect(where).toContain('updatedAt')
      expect(where).toContain('"id"')
    }
  })

  it('counts delete errors as failures', async () => {
    vi.stubEnv('RETENTION_PURGE_ENABLED', 'true')
    count.mockResolvedValue({ totalDocs: 1 })
    find.mockResolvedValue({ docs: [{ id: 1 }] })
    del.mockResolvedValueOnce({ docs: [], errors: [{ id: 1, message: 'x' }] })

    const body = await (await retention(post({ apply: true }))).json()
    expect(body).toMatchObject({ deleted: 0, failed: 1 })
  })
})
