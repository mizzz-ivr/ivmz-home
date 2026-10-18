// @vitest-environment node
import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { describe, expect, it } from 'vitest'

import * as inbox from '../migrations/20261018_031000_anonymous_messages'
import * as limits from '../migrations/20261018_040000_anonymous_message_rate_limits'

// CI has an isolated and freshly migrated PostgreSQL 17 service. Never run against live data.
// This test runs after the concurrent-insert integration suite has cleaned up all of its rows.
describe.skipIf(process.env.ANONYMOUS_DB_ROLLBACK !== 'true')(
  'anonymous-only migrations can be rolled back and reapplied',
  () => {
    it('restores tables, indexes, locked-documents FK and RLS without affecting other collections', async () => {
      const [{ getPayload }, { default: config }] = await Promise.all([
        import('payload'),
        import('../payload.config'),
      ])
      const payload = await getPayload({ config })
      const db = payload.db.drizzle as unknown as MigrateDownArgs['db']
      const downArgs = { db } as MigrateDownArgs
      const upArgs = { db } as MigrateUpArgs

      const rows = await db.execute(sql`
        SELECT
          (SELECT count(*) FROM "ivmz_home"."anonymous_messages") AS inbox_count,
          (SELECT count(*) FROM "ivmz_home"."anonymous_message_rate_limits") AS limits_count
      `)
      expect(Number(rows.rows[0]?.inbox_count)).toBe(0)
      expect(Number(rows.rows[0]?.limits_count)).toBe(0)

      let limitsRemoved = false
      let inboxRemoved = false

      try {
        await limits.down(downArgs)
        limitsRemoved = true
        await inbox.down(downArgs)
        inboxRemoved = true

        const absent = await db.execute(sql`
          SELECT
            to_regclass('ivmz_home.anonymous_messages') AS inbox,
            to_regclass('ivmz_home.anonymous_message_rate_limits') AS limits,
            to_regtype('ivmz_home.enum_anonymous_messages_status') AS status_enum
        `)
        expect(absent.rows[0]?.inbox).toBeNull()
        expect(absent.rows[0]?.limits).toBeNull()
        expect(absent.rows[0]?.status_enum).toBeNull()

        const link = await db.execute(sql`
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'ivmz_home'
            AND table_name = 'payload_locked_documents_rels'
            AND column_name = 'anonymous_messages_id'
        `)
        expect(link.rows).toHaveLength(0)

        // Baseline data model remains present after removing only anonymous-specific tables.
        const baseline = await db.execute(sql`
          SELECT to_regclass('ivmz_home.contact_submissions') AS contacts
        `)
        expect(baseline.rows[0]?.contacts).not.toBeNull()
      } finally {
        // Even a failed assertion should leave this CI service usable by future tests.
        // Only reapply migrations after their corresponding down completed successfully.
        if (inboxRemoved) await inbox.up(upArgs)
        if (limitsRemoved) await limits.up(upArgs)
      }

      const restored = await db.execute(sql`
        SELECT
          to_regclass('ivmz_home.anonymous_messages') AS inbox,
          to_regclass('ivmz_home.anonymous_message_rate_limits') AS limits,
          to_regclass('ivmz_home.anonymous_messages_request_id_idx') AS request_idx,
          to_regclass('ivmz_home.anonymous_message_rate_limits_expires_at_idx') AS expiry_idx
      `)
      for (const column of ['inbox', 'limits', 'request_idx', 'expiry_idx']) {
        expect(restored.rows[0]?.[column]).not.toBeNull()
      }

      const policies = await db.execute(sql`
        SELECT relname, relrowsecurity FROM pg_class
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE nspname = 'ivmz_home'
          AND relname IN ('anonymous_messages', 'anonymous_message_rate_limits')
      `)
      expect(policies.rows).toHaveLength(2)
      for (const row of policies.rows) expect(row.relrowsecurity).toBe(true)
    }, 30_000)
  },
)
