import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Append-only audit: no public text, token, IP, requestId, or cookie is persisted. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "ivmz_home"."anonymous_message_publication_audit" (
      "id" serial PRIMARY KEY NOT NULL,
      "message_id" integer NOT NULL,
      "actor_user_id" integer NOT NULL,
      "action" varchar NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "anonymous_message_publication_audit_action_check"
        CHECK ("action" IN ('publish', 'unpublish'))
    );
    CREATE INDEX "anonymous_message_publication_audit_message_id_idx"
      ON "ivmz_home"."anonymous_message_publication_audit" USING btree ("message_id");
    CREATE INDEX "anonymous_message_publication_audit_created_at_idx"
      ON "ivmz_home"."anonymous_message_publication_audit" USING btree ("created_at");
    ALTER TABLE "ivmz_home"."anonymous_message_publication_audit" ENABLE ROW LEVEL SECURITY;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "ivmz_home"."anonymous_message_publication_audit";
  `)
}
