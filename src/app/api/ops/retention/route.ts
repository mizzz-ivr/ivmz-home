import { hasValidOpsToken, isOpsEndpointEnabled } from '@/ops/auth'
import {
  PURGE_BATCH_LIMIT,
  agedRetentionWhere,
  agedWithAttachmentsWhere,
  createdOverdueUpdatedRecentWhere,
  overdueNewRetentionWhere,
  resolveRetentionDays,
  retentionCutoff,
} from '@/ops/retention'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'no-store' }
const json = (body: unknown, status = 200) => Response.json(body, { headers, status })

/**
 * Read-only retention report. Destructive apply requests are refused until DB/S3 reconciliation,
 * retries, backup/restore and operational approval are ready (Issue #98).
 */
export async function POST(request: Request) {
  if (!isOpsEndpointEnabled()) return new Response(null, { headers, status: 404 })
  if (!hasValidOpsToken(request)) return new Response(null, { headers, status: 401 })

  const body = (await request.json().catch(() => ({}))) as { apply?: unknown }
  // A flag or token must not permit DB-only deletion while S3 cleanup is unimplemented.
  // Refuse before opening the database, including when RETENTION_PURGE_ENABLED=true.
  if (body.apply === true) return json({ code: 'retention_apply_unavailable' }, 403)

  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('@/payload.config'),
  ])
  const payload = await getPayload({ config })

  const days = resolveRetentionDays(process.env.CONTACT_RETENTION_DAYS)
  const cutoff = retentionCutoff(new Date(), days).toISOString()
  const eligible = (
    await payload.count({
      collection: 'contact-submissions',
      overrideAccess: true,
      where: agedRetentionWhere(cutoff),
    })
  ).totalDocs

  const withAttachments = (
    await payload.count({
      collection: 'contact-submissions',
      overrideAccess: true,
      where: agedWithAttachmentsWhere(cutoff),
    })
  ).totalDocs

  // Creation age may exceed the cutoff even when administrative edits reset updatedAt.
  // Audit only: these are not added to deletion candidates.
  const reviewRecentUpdates = (
    await payload.count({
      collection: 'contact-submissions',
      overrideAccess: true,
      where: createdOverdueUpdatedRecentWhere(cutoff),
    })
  ).totalDocs

  // New submissions remain outside deletion candidates but are visible in the report.
  // Creation date prevents admin notes from masking long-unanswered messages.
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
    reviewRecentUpdates,
    withAttachments,
    // Historical field: estimated batch size only. No apply endpoint is enabled.
    willDeleteNow: Math.min(eligible, PURGE_BATCH_LIMIT),
  })
}
