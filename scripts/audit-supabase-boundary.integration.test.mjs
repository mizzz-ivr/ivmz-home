// @vitest-environment node
import { readFileSync } from 'node:fs'

import { sql } from '@payloadcms/db-postgres'
import { describe, expect, it } from 'vitest'

function assertLocalCiDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid')
  if (
    process.env.CI !== 'true' ||
    process.env.PAYLOAD_DB_BOUNDARY_AUDIT_INTEGRATION !== 'true' ||
    url.hostname !== '127.0.0.1' ||
    url.port !== '5432' ||
    url.pathname !== '/ivmz_home'
  ) {
    throw new Error('Read-only DB boundary audit requires the isolated CI PostgreSQL')
  }
}

describe.skipIf(process.env.PAYLOAD_DB_BOUNDARY_AUDIT_INTEGRATION !== 'true')(
  'ivmz_home schema access boundary against disposable PostgreSQL',
  () => {
    it('audits the real schema using only catalog SELECT queries', async () => {
      assertLocalCiDatabase()
      const statement = readFileSync(new URL('./audit-supabase-boundary.sql', import.meta.url), 'utf8')
      const [{ getPayload }, { default: config }] = await Promise.all([
        import('payload'),
        import('../src/payload.config'),
      ])
      const payload = await getPayload({ config })
      const result = await payload.db.drizzle.execute(sql.raw(statement))
      const record = result.rows[0]
      expect(record).toBeDefined()

      const count = (name) => Number(record[name])
      expect(count('table_count')).toBeGreaterThan(0)
      expect(count('rls_enabled_tables')).toBe(count('table_count'))
      expect(count('rls_disabled_tables')).toBe(0)
      expect(count('anon_direct_access_objects')).toBe(0)
      expect(count('authenticated_direct_access_objects')).toBe(0)
      expect(count('security_definer_functions')).toBe(0)
      if (record.anon_role_exists === true) {
        expect(record.anon_schema_usage).toBe(false)
      }
      if (record.authenticated_role_exists === true) {
        expect(record.authenticated_schema_usage).toBe(false)
      }
    }, 45_000)
  },
)
