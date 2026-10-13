import { describe, expect, it } from 'vitest'

import {
  DEFAULT_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  isPurgeEnabled,
  resolveRetentionDays,
  retentionCutoff,
} from './retention'

describe('retention helpers', () => {
  it('defaults to a year and clamps unreasonable values', () => {
    expect(resolveRetentionDays(undefined)).toBe(DEFAULT_RETENTION_DAYS)
    expect(resolveRetentionDays('abc')).toBe(DEFAULT_RETENTION_DAYS)
    expect(resolveRetentionDays('10')).toBe(MIN_RETENTION_DAYS)
    expect(resolveRetentionDays('99999')).toBe(MAX_RETENTION_DAYS)
    expect(resolveRetentionDays('400')).toBe(400)
  })

  it('computes the cutoff date', () => {
    expect(retentionCutoff(new Date('2027-01-31T00:00:00Z'), 30).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    )
  })

  it('purges only when explicitly enabled', () => {
    expect(isPurgeEnabled('true')).toBe(true)
    for (const value of [undefined, '', 'false', '1', 'TRUE', 'yes']) {
      expect(isPurgeEnabled(value)).toBe(false)
    }
  })
})
