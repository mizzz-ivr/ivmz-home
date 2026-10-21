import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Old submissions have no verified interaction timeline: no default and no backfill. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ivmz_home"."contact_submissions"
    ADD COLUMN IF NOT EXISTS "last_interaction_at" timestamp(3) with time zone;
  `)
}

/** Destructive to new timestamps. Never roll back Production without separate approval. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ivmz_home"."contact_submissions"
    DROP COLUMN IF EXISTS "last_interaction_at";
  `)
}
