import type { Where } from 'payload'

import { sendOpsAlert } from '@/ops/alert'
import { hasValidOpsToken, isOpsEndpointEnabled } from '@/ops/auth'
import {
  PURGE_BATCH_LIMIT,
  isPurgeEnabled,
  overdueNewRetentionWhere,
  resolveRetentionDays,
  retentionCutoff,
} from '@/ops/retention'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'no-store' }
const json = (body: unknown, status = 200) => Response.json(body, { headers, status })

/**
 * Retention for contact submissions. Reports what is past the retention window by default (dry
 * run). Deleting needs BOTH `{ "apply": true }` in the request and RETENTION_PURGE_ENABLED=true in
 * the environment. Submissions still marked "New" are never deleted: nobody has read them yet.
 */
export async function POST(request: Request) {
  if (!isOpsEndpointEnabled()) return new Response(null, { headers, status: 404 })
  if (!hasValidOpsToken(request)) return new Response(null, { headers, status: 401 })

  const body = (await request.json().catch(() => ({}))) as { apply?: unknown }
  const apply = body.apply === true

  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('@/payload.config'),
  ])
  const payload = await getPayload({ config })

  const days = resolveRetentionDays(process.env.CONTACT_RETENTION_DAYS)
  const cutoff = retentionCutoff(new Date(), days).toISOString()
  const where: Where = {
    and: [{ updatedAt: { less_than: cutoff } }, { status: { not_equals: 'new' } }],
  }

  const eligible = (
    await payload.count({ collection: 'contact-submissions', overrideAccess: true, where })
  ).totalDocs

  if (!apply) {
    // New submissions are excluded from deletion, but their age must remain observable.
    // Use createdAt: an internal note or triage edit must not hide an unanswered message.
    const overdueNew = (
      await payload.count({
        collection: 'contact-submissions',
        overrideAccess: true,
        where: overdueNewRetentionWhere(cutoff),
      })
    ).totalDocs

    return json({
      days,
      dryRun: true,
      eligible,
      overdueNew,
      willDeleteNow: Math.min(eligible, PURGE_BATCH_LIMIT),
    })
  }
  if (!isPurgeEnabled()) return json({ code: 'purge_disabled', days, eligible }, 403)

  const batch = await payload.find({
    collection: 'contact-submissions',
    depth: 0,
    limit: PURGE_BATCH_LIMIT,
    overrideAccess: true,
    pagination: false,
    select: {},
    sort: 'updatedAt',
    where,
  })

  let deleted = 0
  let failed = 0
  let skipped = 0
  for (const doc of batch.docs) {
    try {
      // The eligibility predicate is part of the delete itself, so a record that an admin touched
      // (or set back to "New") after the batch was selected no longer matches and is left alone.
      const result = await payload.delete({
        collection: 'contact-submissions',
        overrideAccess: true,
        where: { and: [{ id: { equals: doc.id } }, where] },
      })
      if (result.errors.length > 0) failed += 1
      else if (result.docs.length > 0) deleted += 1
      else skipped += 1
    } catch {
      failed += 1
    }
  }

  console.info('CONTACT_RETENTION_PURGE', JSON.stringify({ days, deleted, failed, skipped }))
  if (deleted > 0 || failed > 0) {
    await sendOpsAlert({
      detail: `保存期間(${days}日)を過ぎた問い合わせを ${deleted} 件削除しました${failed ? `(失敗 ${failed} 件)` : ''}。`,
      key: 'retention-purge',
      severity: failed > 0 ? 'warning' : 'info',
      title: '問い合わせの自動削除を実行しました',
    })
  }

  return json({
    days,
    deleted,
    dryRun: false,
    failed,
    remaining: Math.max(0, eligible - deleted),
    skipped,
  })
}
