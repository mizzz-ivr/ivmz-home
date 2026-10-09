import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "ivmz_home"."enum_contact_settings_allowed_types" AS ENUM('png', 'jpeg', 'webp', 'pdf', 'txt', 'md', 'csv', 'docx', 'xlsx', 'pptx');
  CREATE TABLE "ivmz_home"."contact_submissions_attachments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"filename" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"size" numeric NOT NULL,
  	"content_type" varchar NOT NULL,
  	"sha256" varchar NOT NULL
  );
  
  CREATE TABLE "ivmz_home"."contact_settings_allowed_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "ivmz_home"."enum_contact_settings_allowed_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "ivmz_home"."contact_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"attachments_enabled" boolean DEFAULT false,
  	"max_file_size_m_b" numeric DEFAULT 5,
  	"max_files" numeric DEFAULT 3,
  	"max_total_size_m_b" numeric DEFAULT 15,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "ivmz_home"."contact_submissions_attachments" ADD CONSTRAINT "contact_submissions_attachments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "ivmz_home"."contact_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."contact_settings_allowed_types" ADD CONSTRAINT "contact_settings_allowed_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."contact_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "contact_submissions_attachments_order_idx" ON "ivmz_home"."contact_submissions_attachments" USING btree ("_order");
  CREATE INDEX "contact_submissions_attachments_parent_id_idx" ON "ivmz_home"."contact_submissions_attachments" USING btree ("_parent_id");
  CREATE INDEX "contact_settings_allowed_types_order_idx" ON "ivmz_home"."contact_settings_allowed_types" USING btree ("order");
  CREATE INDEX "contact_settings_allowed_types_parent_idx" ON "ivmz_home"."contact_settings_allowed_types" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ivmz_home"."contact_submissions_attachments" CASCADE;
  DROP TABLE "ivmz_home"."contact_settings_allowed_types" CASCADE;
  DROP TABLE "ivmz_home"."contact_settings" CASCADE;
  DROP TYPE "ivmz_home"."enum_contact_settings_allowed_types";`)
}
