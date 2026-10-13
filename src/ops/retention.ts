/** Retention window for contact submissions (days since the record was last touched). */
export const DEFAULT_RETENTION_DAYS = 365
export const MIN_RETENTION_DAYS = 30
export const MAX_RETENTION_DAYS = 1_825

/** At most this many records are deleted per run; the next scheduled run continues. */
export const PURGE_BATCH_LIMIT = 200

export function resolveRetentionDays(value: string | number | undefined | null): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_RETENTION_DAYS
  return Math.min(MAX_RETENTION_DAYS, Math.max(MIN_RETENTION_DAYS, Math.floor(parsed)))
}

export function retentionCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

/** Deleting must be switched on explicitly; anything else only reports what would be deleted. */
export function isPurgeEnabled(value: string | undefined = process.env.RETENTION_PURGE_ENABLED) {
  return value === 'true'
}
