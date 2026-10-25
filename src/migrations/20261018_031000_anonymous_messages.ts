import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Private by default: the app's DB owner bypasses RLS; anon/authenticated get no policy. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "ivmz_home"."enum_anonymous_messages_status" AS ENUM('new', 'read', 'replied', 'hidden', 'spam');
    CREATE TABLE "ivmz_home"."anonymous_messages" (
      "id" serial PRIMARY KEY NOT NULL,
      "status" "ivmz_home"."enum_anonymous_messages_status" DEFAULT 'new' NOT NULL,
      "message" varchar NOT NULL,
      "request_id" varchar NOT NULL,
      "reply" varchar,
      "is_public" boolean DEFAULT false NOT NULL,
      "public_id" varchar,
      "published_at" timestamp(3) with time zone,
      "internal_note" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX "anonymous_messages_status_idx" ON "ivmz_home"."anonymous_messages" USING btree ("status");
    CREATE UNIQUE INDEX "anonymous_messages_request_id_idx" ON "ivmz_home"."anonymous_messages" USING btree ("request_id");
    CREATE INDEX "anonymous_messages_is_public_idx" ON "ivmz_home"."anonymous_messages" USING btree ("is_public");
    CREATE UNIQUE INDEX "anonymous_messages_public_id_idx" ON "ivmz_home"."anonymous_messages" USING btree ("public_id");
    CREATE INDEX "anonymous_messages_published_at_idx" ON "ivmz_home"."anonymous_messages" USING btree ("published_at");
    CREATE INDEX "anonymous_messages_updated_at_idx" ON "ivmz_home"."anonymous_messages" USING btree ("updated_at");
    CREATE INDEX "anonymous_messages_created_at_idx" ON "ivmz_home"."anonymous_messages" USING btree ("created_at");
    ALTER TABLE "ivmz_home"."anonymous_messages" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD COLUMN "anonymous_messages_id" integer;
    ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_anonymous_messages_fk"
      FOREIGN KEY ("anonymous_messages_id") REFERENCES "ivmz_home"."anonymous_messages"("id")
      ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_anonymous_messages_id_idx"
      ON "ivmz_home"."payload_locked_documents_rels" USING btree ("anonymous_messages_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ivmz_home"."payload_locked_documents_rels"
      DROP CONSTRAINT "payload_locked_documents_rels_anonymous_messages_fk";
    DROP INDEX "ivmz_home"."payload_locked_documents_rels_anonymous_messages_id_idx";
    ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP COLUMN "anonymous_messages_id";
    DROP TABLE "ivmz_home"."anonymous_messages";
    DROP TYPE "ivmz_home"."enum_anonymous_messages_status";
  `)
}
