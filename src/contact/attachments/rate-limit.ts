type Bucket = { count: number; resetAt: number }

const WINDOW_MS = 60_000
const MAX_TRACKED = 5_000
const buckets = new Map<string, Bucket>()

/** Netlify sets this header itself; fall back to the first forwarded hop for other hosts. */
export function clientKey(request: Request): string {
  return (
    request.headers.get('x-nf-client-connection-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

/**
 * Per-instance fixed-window limiter for the attachment endpoints. Netlify's edge rate-limit rule for
 * these paths cannot be deployed (see docs/contact-attachments.md), so this is the guard in front of
 * presign / scan polling. It is best effort across serverless instances; the hard caps on size,
 * count, the short-lived quarantine expiry and the AWS budget alert are the backstops.
 */
export function isRateLimited(
  scope: string,
  request: Request,
  limit: number,
  now = Date.now(),
): boolean {
  const key = `${scope}:${clientKey(request)}`
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED) {
      for (const [stale, value] of buckets) if (value.resetAt <= now) buckets.delete(stale)
      // Still full of live entries: drop the oldest instead of growing without bound.
      if (buckets.size >= MAX_TRACKED) {
        const oldest = buckets.keys().next().value
        if (oldest !== undefined) buckets.delete(oldest)
      }
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  bucket.count += 1
  return bucket.count > limit
}

export function resetRateLimitsForTests() {
  buckets.clear()
}
