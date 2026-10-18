import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Shared PostgreSQL limit, not per-instance memory. HMAC identifiers expire and are culled. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "ivmz_home"."anonymous_message_rate_limits" (
      "key" varchar PRIMARY KEY NOT NULL,
      "attempts" integer DEFAULT 0 NOT NULL,
      "expires_at" timestamp(3) with time zone NOT NULL
    );
    CREATE INDEX "anonymous_message_rate_limits_expires_at_idx"
      ON "ivmz_home"."anonymous_message_rate_limits" USING btree ("expires_at");
    ALTER TABLE "ivmz_home"."anonymous_message_rate_limits" ENABLE ROW LEVEL SECURITY;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "ivmz_home"."anonymous_message_rate_limits";
  `)
}
