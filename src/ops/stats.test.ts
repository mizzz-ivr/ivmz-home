import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { collectOpsStats, deriveHealth, type OpsStats } from './stats'

function fakePayload(
  handler: (where: unknown) => number,
  docs: Array<Record<string, unknown>> = [],
) {
  return {
    count: vi.fn(async (args: { where?: unknown }) => ({ totalDocs: handler(args.where) })),
    find: vi.fn(async () => ({ docs })),
  } as unknown as Payload
}

const base: OpsStats = {
  checkedAt: '2027-01-01T00:00:00.000Z',
  databaseLatencyMs: 20,
  failures24h: 0,
  latestFailures: [],
  notification: { failed: 0, sent: 3, skipped: 0, stuckPending: 0, unknown: 0 },
  received: { last24h: 1, last30d: 3, last7d: 3, total: 9 },
  retention: { days: 365, eligible: 0, staleUnhandled: 0 },
  unread: 0,
  withAttachments30d: 0,
}

describe('collectOpsStats', () => {
  it('returns counts and the latest failures without any personal fields', async () => {
    const payload = fakePayload(
      () => 2,
      [
        {
          category: 'personal',
          createdAt: '2027-01-01T00:00:00.000Z',
          id: 7,
          notification: 'failed',
          notificationError: 'MessageRejected',
          email: 'must-not-leak@example.com',
        },
      ],
    )
    const stats = await collectOpsStats(payload, {
      now: new Date('2027-01-02T00:00:00Z'),
      retentionDays: 365,
    })

    expect(stats.received.total).toBe(2)
    expect(stats.retention.days).toBe(365)
    expect(stats.latestFailures).toEqual([
      {
        category: 'personal',
        createdAt: '2027-01-01T00:00:00.000Z',
        error: 'MessageRejected',
        id: 7,
        state: 'failed',
      },
    ])
    expect(JSON.stringify(stats)).not.toContain('must-not-leak')
  })

  it('only selects non-personal fields for the failure list', async () => {
    const payload = fakePayload(() => 0)
    await collectOpsStats(payload, { retentionDays: 365 })
    const call = (payload.find as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(Object.keys(call.select).sort()).toEqual([
      'category',
      'createdAt',
      'notification',
      'notificationError',
    ])
  })
})

describe('deriveHealth', () => {
  it('is down without stats, degraded on failures or stuck mail, otherwise ok', () => {
    expect(deriveHealth(null)).toBe('down')
    expect(deriveHealth(base)).toBe('ok')
    expect(deriveHealth({ ...base, failures24h: 1 })).toBe('degraded')
    expect(deriveHealth({ ...base, notification: { ...base.notification, stuckPending: 2 } })).toBe(
      'degraded',
    )
    expect(deriveHealth({ ...base, databaseLatencyMs: 9_000 })).toBe('degraded')
  })
})
