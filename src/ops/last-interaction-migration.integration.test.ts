// @vitest-environment node
import { sql } from '@payloadcms/db-postgres'
import { describe, expect, it } from 'vitest'

function requireDisposableCiDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid')
  if (
    process.env.CI !== 'true' ||
    process.env.CONTACT_INTERACTION_MIGRATION_PROBE !== 'true' ||
    url.hostname !== '127.0.0.1' ||
    url.port !== '5432' ||
    url.pathname !== '/ivmz_home' ||
    url.username !== 'payload'
  ) {
    throw new Error('lastInteractionAt probe requires the isolated CI PostgreSQL')
  }
}

class ExpectedRollback extends Error {}
const total = (result: { rows: Record<string, unknown>[] }) => Number(result.rows[0]?.total ?? 0)

describe.skipIf(process.env.CONTACT_INTERACTION_MIGRATION_PROBE !== 'true')(
  'nullable lastInteractionAt migration rehearsal (disposable database only)',
  () => {
    it('preserves unknown values, ignores admin edits and rolls back both schema and data', async () => {
      requireDisposableCiDatabase()
      const [{ getPayload }, { default: config }] = await Promise.all([
        import('payload'),
        import('../payload.config'),
      ])
      const payload = await getPayload({ config })
      const db = payload.db.drizzle
      const columnExists = () =>
        db.execute(sql`
          SELECT count(*)::integer AS total FROM information_schema.columns
          WHERE table_schema = 'ivmz_home' AND table_name = 'contact_submissions'
            AND column_name = 'last_interaction_at'
        `)
      // The current main schema has no column; the forthcoming migration will add it.
      // Keep this gate valid in both states so merging the migration cannot break main CI.
      const columnsBefore = total(await columnExists())
      expect([0, 1]).toContain(columnsBefore)
      const nullableWithoutDefault = sql`
          SELECT count(*)::integer AS total FROM information_schema.columns
          WHERE table_schema = 'ivmz_home' AND table_name = 'contact_submissions'
            AND column_name = 'last_interaction_at'
            AND data_type = 'timestamp with time zone'
            AND is_nullable = 'YES'
            AND column_default IS NULL
      `
      if (columnsBefore === 1) expect(total(await db.execute(nullableWithoutDefault))).toBe(1)

      await expect(
        db.transaction(async (tx) => {
          await tx.execute(sql`
            INSERT INTO "ivmz_home"."contact_submissions"
              ("subject", "name", "email", "category", "message", "recipient", "request_id")
            VALUES ('probe', 'fixture', 'fixture@example.invalid', 'personal',
              'synthetic', 'fixture@example.invalid', 'ci-last-interaction-probe')
          `)
          if (columnsBefore === 0) {
            await tx.execute(sql`
              ALTER TABLE "ivmz_home"."contact_submissions"
              ADD COLUMN "last_interaction_at" timestamp(3) with time zone
            `)
          }
          expect(total(await tx.execute(nullableWithoutDefault))).toBe(1)
          const unknown = await tx.execute(sql`
            SELECT count(*)::integer AS total FROM "ivmz_home"."contact_submissions"
            WHERE "request_id" = 'ci-last-interaction-probe' AND "last_interaction_at" IS NULL
          `)
          expect(total(unknown)).toBe(1)

          await tx.execute(sql`
            UPDATE "ivmz_home"."contact_submissions"
            SET "status" = 'replied', "internal_note" = 'note',
              "notification" = 'sent', "updated_at" = now()
            WHERE "request_id" = 'ci-last-interaction-probe'
          `)
          const afterAdministrativeEdits = await tx.execute(sql`
            SELECT count(*)::integer AS total FROM "ivmz_home"."contact_submissions"
            WHERE "request_id" = 'ci-last-interaction-probe' AND "last_interaction_at" IS NULL
          `)
          expect(total(afterAdministrativeEdits)).toBe(1)

          await tx.execute(sql`
            UPDATE "ivmz_home"."contact_submissions"
            SET "last_interaction_at" = '2026-10-21T00:00:00.000Z'
            WHERE "request_id" = 'ci-last-interaction-probe'
          `)
          const recorded = await tx.execute(sql`
            SELECT count(*)::integer AS total FROM "ivmz_home"."contact_submissions"
            WHERE "request_id" = 'ci-last-interaction-probe'
              AND "last_interaction_at" = '2026-10-21T00:00:00.000Z'
          `)
          expect(total(recorded)).toBe(1)
          // Explicit timestamp remains attached until the drop is executed.
          // Existing columns must come back after the outer rollback.
          // The down DDL is technically executable, but destroys populated values.
          // Never run the down migration in production after writers are enabled.
          await tx.execute(sql`
            ALTER TABLE "ivmz_home"."contact_submissions" DROP COLUMN "last_interaction_at"
          `)
          // Force rollback of all test mutations, even if the DDL rehearsal succeeds.
          throw new ExpectedRollback()
        }),
      ).rejects.toBeInstanceOf(ExpectedRollback)

      // The entire transaction, including its DOWN rehearsal, must restore the
      // original pre-migration or post-migration schema without losing any values.
      expect(total(await columnExists())).toBe(columnsBefore)
      if (columnsBefore === 1) expect(total(await db.execute(nullableWithoutDefault))).toBe(1)
      expect(
        total(
          await db.execute(sql`
            SELECT count(*)::integer AS total FROM "ivmz_home"."contact_submissions"
            WHERE "request_id" = 'ci-last-interaction-probe'
          `),
        ),
      ).toBe(0)
    }, 45_000)
  },
)
