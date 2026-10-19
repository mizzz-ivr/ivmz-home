import type { Payload, Where } from 'payload'

import { overdueNewRetentionWhere, retentionCutoff } from './retention'

const COLLECTION = 'contact-submissions' as const
const DAY_MS = 24 * 60 * 60 * 1000
/** A notification still "pending" after this long is treated as stuck. */
const STUCK_PENDING_MS = 15 * 60 * 1000

export type OpsFailure = {
  category: string
  createdAt: string
  error: string | null
  id: number | string
  state: string
}

export type OpsStats = {
  checkedAt: string
  databaseLatencyMs: number
  failures24h: number
  latestFailures: OpsFailure[]
  notification: {
    failed: number
    sent: number
    skipped: number
    stuckPending: number
    unknown: number
  }
  received: { last24h: number; last30d: number; last7d: number; total: number }
  retention: { days: number; eligible: number; staleUnhandled: number }
  unread: number
  withAttachments30d: number
}

export type OpsHealthStatus = 'ok' | 'degraded' | 'down'

export function deriveHealth(stats: OpsStats | null): OpsHealthStatus {
  if (!stats) return 'down'
  if (stats.databaseLatencyMs > 5_000) return 'degraded'
  if (stats.failures24h > 0 || stats.notification.stuckPending > 0) return 'degraded'
  return 'ok'
}

/**
 * Aggregated, personal-data-free numbers for the admin dashboard and the health endpoint. Every
 * query is read-only and counts or selects non-personal fields only.
 */
export async function collectOpsStats(
  payload: Payload,
  options: { now?: Date; retentionDays: number },
): Promise<OpsStats> {
  const now = options.now ?? new Date()
  const since = (ms: number) => new Date(now.getTime() - ms).toISOString()
  const count = async (where?: Where) =>
    (
      await payload.count({
        collection: COLLECTION,
        overrideAccess: true,
        ...(where ? { where } : {}),
      })
    ).totalDocs

  const startedAt = Date.now()
  const total = await count()
  const databaseLatencyMs = Date.now() - startedAt

  const last24h = await count({ createdAt: { greater_than_equal: since(DAY_MS) } })
  const last7d = await count({ createdAt: { greater_than_equal: since(7 * DAY_MS) } })
  const last30d = await count({ createdAt: { greater_than_equal: since(30 * DAY_MS) } })
  const unread = await count({ status: { equals: 'new' } })

  const week = { createdAt: { greater_than_equal: since(7 * DAY_MS) } }
  const sent = await count({ and: [week, { notification: { equals: 'sent' } }] })
  const failed = await count({ and: [week, { notification: { equals: 'failed' } }] })
  const unknown = await count({ and: [week, { notification: { equals: 'unknown' } }] })
  const skipped = await count({ and: [week, { notification: { equals: 'skipped' } }] })
  const stuckPending = await count({
    and: [
      { notification: { equals: 'pending' } },
      { createdAt: { less_than: since(STUCK_PENDING_MS) } },
      { createdAt: { greater_than_equal: since(7 * DAY_MS) } },
    ],
  })

  const failures24h = await count({
    and: [
      { createdAt: { greater_than_equal: since(DAY_MS) } },
      { notification: { in: ['failed', 'unknown'] } },
    ],
  })
  const recent = await payload.find({
    collection: COLLECTION,
    depth: 0,
    limit: 5,
    overrideAccess: true,
    pagination: false,
    select: { category: true, createdAt: true, notification: true, notificationError: true },
    sort: '-createdAt',
    where: { notification: { in: ['failed', 'unknown'] } },
  })
  const latestFailures: OpsFailure[] = recent.docs.map((doc) => ({
    category: String(doc.category ?? ''),
    createdAt: String(doc.createdAt ?? ''),
    error: doc.notificationError ? String(doc.notificationError) : null,
    id: doc.id,
    state: String(doc.notification ?? ''),
  }))

  const withAttachments30d = await count({
    and: [
      { createdAt: { greater_than_equal: since(30 * DAY_MS) } },
      { 'attachments.id': { exists: true } },
    ],
  })

  const cutoff = retentionCutoff(now, options.retentionDays).toISOString()
  const eligible = await count({
    and: [{ updatedAt: { less_than: cutoff } }, { status: { not_equals: 'new' } }],
  })
  const staleUnhandled = await count(overdueNewRetentionWhere(cutoff))

  return {
    checkedAt: now.toISOString(),
    databaseLatencyMs,
    failures24h,
    latestFailures,
    notification: { failed, sent, skipped, stuckPending, unknown },
    received: { last24h, last30d, last7d, total },
    retention: { days: options.retentionDays, eligible, staleUnhandled },
    unread,
    withAttachments30d,
  }
}
