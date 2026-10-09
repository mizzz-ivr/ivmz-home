import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "ivmz_home"."enum_contact_submissions_status" AS ENUM('new', 'read', 'replied', 'archived', 'spam');
  CREATE TYPE "ivmz_home"."enum_contact_submissions_category" AS ENUM('personal', 'development', 'job', 'collaboration', 'media', 'community', 'team', 'security');
  CREATE TYPE "ivmz_home"."enum_contact_submissions_notification" AS ENUM('pending', 'sent', 'failed', 'unknown', 'skipped');
  CREATE TABLE "ivmz_home"."contact_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "ivmz_home"."enum_contact_submissions_status" DEFAULT 'new' NOT NULL,
  	"subject" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"category" "ivmz_home"."enum_contact_submissions_category" NOT NULL,
  	"message" varchar NOT NULL,
  	"recipient" varchar NOT NULL,
  	"request_id" varchar NOT NULL,
  	"notification" "ivmz_home"."enum_contact_submissions_notification" DEFAULT 'pending' NOT NULL,
  	"notification_error" varchar,
  	"internal_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD COLUMN "contact_submissions_id" integer;
  CREATE INDEX "contact_submissions_status_idx" ON "ivmz_home"."contact_submissions" USING btree ("status");
  CREATE INDEX "contact_submissions_category_idx" ON "ivmz_home"."contact_submissions" USING btree ("category");
  CREATE UNIQUE INDEX "contact_submissions_request_id_idx" ON "ivmz_home"."contact_submissions" USING btree ("request_id");
  CREATE INDEX "contact_submissions_updated_at_idx" ON "ivmz_home"."contact_submissions" USING btree ("updated_at");
  CREATE INDEX "contact_submissions_created_at_idx" ON "ivmz_home"."contact_submissions" USING btree ("created_at");
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_submissions_fk" FOREIGN KEY ("contact_submissions_id") REFERENCES "ivmz_home"."contact_submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_contact_submissions_id_idx" ON "ivmz_home"."payload_locked_documents_rels" USING btree ("contact_submissions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contact_submissions_fk";
  DROP INDEX "ivmz_home"."payload_locked_documents_rels_contact_submissions_id_idx";
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP COLUMN "contact_submissions_id";
  ALTER TABLE "ivmz_home"."contact_submissions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ivmz_home"."contact_submissions" CASCADE;
  DROP TYPE "ivmz_home"."enum_contact_submissions_status";
  DROP TYPE "ivmz_home"."enum_contact_submissions_category";
  DROP TYPE "ivmz_home"."enum_contact_submissions_notification";`)
}
