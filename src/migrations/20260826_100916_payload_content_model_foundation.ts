import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "ivmz_home"."enum_works_project_status" AS ENUM('active', 'maintained', 'completed', 'archived');
  CREATE TYPE "ivmz_home"."enum_works_status" AS ENUM('draft', 'published');
  CREATE TYPE "ivmz_home"."enum__works_v_version_project_status" AS ENUM('active', 'maintained', 'completed', 'archived');
  CREATE TYPE "ivmz_home"."enum__works_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "ivmz_home"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "ivmz_home"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "ivmz_home"."enum_news_type" AS ENUM('release', 'announcement', 'event', 'publication', 'activity');
  CREATE TYPE "ivmz_home"."enum_news_status" AS ENUM('draft', 'published');
  CREATE TYPE "ivmz_home"."enum__news_v_version_type" AS ENUM('release', 'announcement', 'event', 'publication', 'activity');
  CREATE TYPE "ivmz_home"."enum__news_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "ivmz_home"."enum_schedule_type" AS ENUM('event', 'release', 'meetup', 'stream', 'publication', 'availability');
  CREATE TYPE "ivmz_home"."enum_schedule_visibility" AS ENUM('public', 'private');
  CREATE TABLE "ivmz_home"."works" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"role" varchar,
  	"project_status" "ivmz_home"."enum_works_project_status" DEFAULT 'active',
  	"github_url" varchar,
  	"live_url" varchar,
  	"case_study" varchar,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "ivmz_home"."enum_works_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "ivmz_home"."works_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "ivmz_home"."works_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "ivmz_home"."_works_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_role" varchar,
  	"version_project_status" "ivmz_home"."enum__works_v_version_project_status" DEFAULT 'active',
  	"version_github_url" varchar,
  	"version_live_url" varchar,
  	"version_case_study" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "ivmz_home"."enum__works_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "ivmz_home"."_works_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "ivmz_home"."_works_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "ivmz_home"."posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"body" varchar,
  	"category" varchar,
  	"cover_id" integer,
  	"canonical_url" varchar,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "ivmz_home"."enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "ivmz_home"."posts_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "ivmz_home"."posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"works_id" integer
  );
  
  CREATE TABLE "ivmz_home"."_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_body" varchar,
  	"version_category" varchar,
  	"version_cover_id" integer,
  	"version_canonical_url" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "ivmz_home"."enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "ivmz_home"."_posts_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "ivmz_home"."_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"works_id" integer
  );
  
  CREATE TABLE "ivmz_home"."news" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"body" varchar,
  	"type" "ivmz_home"."enum_news_type",
  	"external_url" varchar,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "ivmz_home"."enum_news_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "ivmz_home"."_news_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_body" varchar,
  	"version_type" "ivmz_home"."enum__news_v_version_type",
  	"version_external_url" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "ivmz_home"."enum__news_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "ivmz_home"."schedule" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"type" "ivmz_home"."enum_schedule_type" NOT NULL,
  	"start_at" timestamp(3) with time zone NOT NULL,
  	"end_at" timestamp(3) with time zone,
  	"timezone" varchar DEFAULT 'Asia/Tokyo' NOT NULL,
  	"visibility" "ivmz_home"."enum_schedule_visibility" DEFAULT 'private' NOT NULL,
  	"location" varchar,
  	"url" varchar,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ivmz_home"."social_links" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"handle" varchar,
  	"enabled" boolean DEFAULT true NOT NULL,
  	"order" numeric DEFAULT 100 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD COLUMN "works_id" integer;
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD COLUMN "news_id" integer;
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD COLUMN "schedule_id" integer;
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD COLUMN "social_links_id" integer;
  ALTER TABLE "ivmz_home"."works_texts" ADD CONSTRAINT "works_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."works_rels" ADD CONSTRAINT "works_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."works_rels" ADD CONSTRAINT "works_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "ivmz_home"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."_works_v" ADD CONSTRAINT "_works_v_parent_id_works_id_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."works"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ivmz_home"."_works_v_texts" ADD CONSTRAINT "_works_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."_works_v_rels" ADD CONSTRAINT "_works_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."_works_v_rels" ADD CONSTRAINT "_works_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "ivmz_home"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."posts" ADD CONSTRAINT "posts_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "ivmz_home"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ivmz_home"."posts_texts" ADD CONSTRAINT "posts_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."posts_rels" ADD CONSTRAINT "posts_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "ivmz_home"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ivmz_home"."_posts_v" ADD CONSTRAINT "_posts_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "ivmz_home"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ivmz_home"."_posts_v_texts" ADD CONSTRAINT "_posts_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "ivmz_home"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."_news_v" ADD CONSTRAINT "_news_v_parent_id_news_id_fk" FOREIGN KEY ("parent_id") REFERENCES "ivmz_home"."news"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "works_title_idx" ON "ivmz_home"."works" USING btree ("title");
  CREATE UNIQUE INDEX "works_slug_idx" ON "ivmz_home"."works" USING btree ("slug");
  CREATE INDEX "works_project_status_idx" ON "ivmz_home"."works" USING btree ("project_status");
  CREATE INDEX "works_published_at_idx" ON "ivmz_home"."works" USING btree ("published_at");
  CREATE INDEX "works_updated_at_idx" ON "ivmz_home"."works" USING btree ("updated_at");
  CREATE INDEX "works_created_at_idx" ON "ivmz_home"."works" USING btree ("created_at");
  CREATE INDEX "works__status_idx" ON "ivmz_home"."works" USING btree ("_status");
  CREATE INDEX "works_texts_order_parent" ON "ivmz_home"."works_texts" USING btree ("order","parent_id");
  CREATE INDEX "works_rels_order_idx" ON "ivmz_home"."works_rels" USING btree ("order");
  CREATE INDEX "works_rels_parent_idx" ON "ivmz_home"."works_rels" USING btree ("parent_id");
  CREATE INDEX "works_rels_path_idx" ON "ivmz_home"."works_rels" USING btree ("path");
  CREATE INDEX "works_rels_media_id_idx" ON "ivmz_home"."works_rels" USING btree ("media_id");
  CREATE INDEX "_works_v_parent_idx" ON "ivmz_home"."_works_v" USING btree ("parent_id");
  CREATE INDEX "_works_v_version_version_title_idx" ON "ivmz_home"."_works_v" USING btree ("version_title");
  CREATE INDEX "_works_v_version_version_slug_idx" ON "ivmz_home"."_works_v" USING btree ("version_slug");
  CREATE INDEX "_works_v_version_version_project_status_idx" ON "ivmz_home"."_works_v" USING btree ("version_project_status");
  CREATE INDEX "_works_v_version_version_published_at_idx" ON "ivmz_home"."_works_v" USING btree ("version_published_at");
  CREATE INDEX "_works_v_version_version_updated_at_idx" ON "ivmz_home"."_works_v" USING btree ("version_updated_at");
  CREATE INDEX "_works_v_version_version_created_at_idx" ON "ivmz_home"."_works_v" USING btree ("version_created_at");
  CREATE INDEX "_works_v_version_version__status_idx" ON "ivmz_home"."_works_v" USING btree ("version__status");
  CREATE INDEX "_works_v_created_at_idx" ON "ivmz_home"."_works_v" USING btree ("created_at");
  CREATE INDEX "_works_v_updated_at_idx" ON "ivmz_home"."_works_v" USING btree ("updated_at");
  CREATE INDEX "_works_v_latest_idx" ON "ivmz_home"."_works_v" USING btree ("latest");
  CREATE INDEX "_works_v_texts_order_parent" ON "ivmz_home"."_works_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_works_v_rels_order_idx" ON "ivmz_home"."_works_v_rels" USING btree ("order");
  CREATE INDEX "_works_v_rels_parent_idx" ON "ivmz_home"."_works_v_rels" USING btree ("parent_id");
  CREATE INDEX "_works_v_rels_path_idx" ON "ivmz_home"."_works_v_rels" USING btree ("path");
  CREATE INDEX "_works_v_rels_media_id_idx" ON "ivmz_home"."_works_v_rels" USING btree ("media_id");
  CREATE INDEX "posts_title_idx" ON "ivmz_home"."posts" USING btree ("title");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "ivmz_home"."posts" USING btree ("slug");
  CREATE INDEX "posts_category_idx" ON "ivmz_home"."posts" USING btree ("category");
  CREATE INDEX "posts_cover_idx" ON "ivmz_home"."posts" USING btree ("cover_id");
  CREATE INDEX "posts_published_at_idx" ON "ivmz_home"."posts" USING btree ("published_at");
  CREATE INDEX "posts_updated_at_idx" ON "ivmz_home"."posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "ivmz_home"."posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "ivmz_home"."posts" USING btree ("_status");
  CREATE INDEX "posts_texts_order_parent" ON "ivmz_home"."posts_texts" USING btree ("order","parent_id");
  CREATE INDEX "posts_rels_order_idx" ON "ivmz_home"."posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "ivmz_home"."posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "ivmz_home"."posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_works_id_idx" ON "ivmz_home"."posts_rels" USING btree ("works_id");
  CREATE INDEX "_posts_v_parent_idx" ON "ivmz_home"."_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_title_idx" ON "ivmz_home"."_posts_v" USING btree ("version_title");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "ivmz_home"."_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_category_idx" ON "ivmz_home"."_posts_v" USING btree ("version_category");
  CREATE INDEX "_posts_v_version_version_cover_idx" ON "ivmz_home"."_posts_v" USING btree ("version_cover_id");
  CREATE INDEX "_posts_v_version_version_published_at_idx" ON "ivmz_home"."_posts_v" USING btree ("version_published_at");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "ivmz_home"."_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "ivmz_home"."_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "ivmz_home"."_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "ivmz_home"."_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "ivmz_home"."_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "ivmz_home"."_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_texts_order_parent" ON "ivmz_home"."_posts_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_posts_v_rels_order_idx" ON "ivmz_home"."_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "ivmz_home"."_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "ivmz_home"."_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_works_id_idx" ON "ivmz_home"."_posts_v_rels" USING btree ("works_id");
  CREATE INDEX "news_title_idx" ON "ivmz_home"."news" USING btree ("title");
  CREATE UNIQUE INDEX "news_slug_idx" ON "ivmz_home"."news" USING btree ("slug");
  CREATE INDEX "news_type_idx" ON "ivmz_home"."news" USING btree ("type");
  CREATE INDEX "news_published_at_idx" ON "ivmz_home"."news" USING btree ("published_at");
  CREATE INDEX "news_updated_at_idx" ON "ivmz_home"."news" USING btree ("updated_at");
  CREATE INDEX "news_created_at_idx" ON "ivmz_home"."news" USING btree ("created_at");
  CREATE INDEX "news__status_idx" ON "ivmz_home"."news" USING btree ("_status");
  CREATE INDEX "_news_v_parent_idx" ON "ivmz_home"."_news_v" USING btree ("parent_id");
  CREATE INDEX "_news_v_version_version_title_idx" ON "ivmz_home"."_news_v" USING btree ("version_title");
  CREATE INDEX "_news_v_version_version_slug_idx" ON "ivmz_home"."_news_v" USING btree ("version_slug");
  CREATE INDEX "_news_v_version_version_type_idx" ON "ivmz_home"."_news_v" USING btree ("version_type");
  CREATE INDEX "_news_v_version_version_published_at_idx" ON "ivmz_home"."_news_v" USING btree ("version_published_at");
  CREATE INDEX "_news_v_version_version_updated_at_idx" ON "ivmz_home"."_news_v" USING btree ("version_updated_at");
  CREATE INDEX "_news_v_version_version_created_at_idx" ON "ivmz_home"."_news_v" USING btree ("version_created_at");
  CREATE INDEX "_news_v_version_version__status_idx" ON "ivmz_home"."_news_v" USING btree ("version__status");
  CREATE INDEX "_news_v_created_at_idx" ON "ivmz_home"."_news_v" USING btree ("created_at");
  CREATE INDEX "_news_v_updated_at_idx" ON "ivmz_home"."_news_v" USING btree ("updated_at");
  CREATE INDEX "_news_v_latest_idx" ON "ivmz_home"."_news_v" USING btree ("latest");
  CREATE INDEX "schedule_type_idx" ON "ivmz_home"."schedule" USING btree ("type");
  CREATE INDEX "schedule_start_at_idx" ON "ivmz_home"."schedule" USING btree ("start_at");
  CREATE INDEX "schedule_visibility_idx" ON "ivmz_home"."schedule" USING btree ("visibility");
  CREATE INDEX "schedule_updated_at_idx" ON "ivmz_home"."schedule" USING btree ("updated_at");
  CREATE INDEX "schedule_created_at_idx" ON "ivmz_home"."schedule" USING btree ("created_at");
  CREATE INDEX "social_links_platform_idx" ON "ivmz_home"."social_links" USING btree ("platform");
  CREATE INDEX "social_links_order_idx" ON "ivmz_home"."social_links" USING btree ("order");
  CREATE INDEX "social_links_updated_at_idx" ON "ivmz_home"."social_links" USING btree ("updated_at");
  CREATE INDEX "social_links_created_at_idx" ON "ivmz_home"."social_links" USING btree ("created_at");
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "ivmz_home"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "ivmz_home"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "ivmz_home"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_schedule_fk" FOREIGN KEY ("schedule_id") REFERENCES "ivmz_home"."schedule"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_social_links_fk" FOREIGN KEY ("social_links_id") REFERENCES "ivmz_home"."social_links"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_works_id_idx" ON "ivmz_home"."payload_locked_documents_rels" USING btree ("works_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "ivmz_home"."payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_news_id_idx" ON "ivmz_home"."payload_locked_documents_rels" USING btree ("news_id");
  CREATE INDEX "payload_locked_documents_rels_schedule_id_idx" ON "ivmz_home"."payload_locked_documents_rels" USING btree ("schedule_id");
  CREATE INDEX "payload_locked_documents_rels_social_links_id_idx" ON "ivmz_home"."payload_locked_documents_rels" USING btree ("social_links_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ivmz_home"."works" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."works_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."works_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."_works_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."_works_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."_works_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."posts_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."posts_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."_posts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."_posts_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."_posts_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."news" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."_news_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."schedule" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ivmz_home"."social_links" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ivmz_home"."works" CASCADE;
  DROP TABLE "ivmz_home"."works_texts" CASCADE;
  DROP TABLE "ivmz_home"."works_rels" CASCADE;
  DROP TABLE "ivmz_home"."_works_v" CASCADE;
  DROP TABLE "ivmz_home"."_works_v_texts" CASCADE;
  DROP TABLE "ivmz_home"."_works_v_rels" CASCADE;
  DROP TABLE "ivmz_home"."posts" CASCADE;
  DROP TABLE "ivmz_home"."posts_texts" CASCADE;
  DROP TABLE "ivmz_home"."posts_rels" CASCADE;
  DROP TABLE "ivmz_home"."_posts_v" CASCADE;
  DROP TABLE "ivmz_home"."_posts_v_texts" CASCADE;
  DROP TABLE "ivmz_home"."_posts_v_rels" CASCADE;
  DROP TABLE "ivmz_home"."news" CASCADE;
  DROP TABLE "ivmz_home"."_news_v" CASCADE;
  DROP TABLE "ivmz_home"."schedule" CASCADE;
  DROP TABLE "ivmz_home"."social_links" CASCADE;
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_works_fk";
  
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_posts_fk";
  
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_news_fk";
  
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_schedule_fk";
  
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_social_links_fk";
  
  DROP INDEX "ivmz_home"."payload_locked_documents_rels_works_id_idx";
  DROP INDEX "ivmz_home"."payload_locked_documents_rels_posts_id_idx";
  DROP INDEX "ivmz_home"."payload_locked_documents_rels_news_id_idx";
  DROP INDEX "ivmz_home"."payload_locked_documents_rels_schedule_id_idx";
  DROP INDEX "ivmz_home"."payload_locked_documents_rels_social_links_id_idx";
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP COLUMN "works_id";
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP COLUMN "posts_id";
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP COLUMN "news_id";
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP COLUMN "schedule_id";
  ALTER TABLE "ivmz_home"."payload_locked_documents_rels" DROP COLUMN "social_links_id";
  DROP TYPE "ivmz_home"."enum_works_project_status";
  DROP TYPE "ivmz_home"."enum_works_status";
  DROP TYPE "ivmz_home"."enum__works_v_version_project_status";
  DROP TYPE "ivmz_home"."enum__works_v_version_status";
  DROP TYPE "ivmz_home"."enum_posts_status";
  DROP TYPE "ivmz_home"."enum__posts_v_version_status";
  DROP TYPE "ivmz_home"."enum_news_type";
  DROP TYPE "ivmz_home"."enum_news_status";
  DROP TYPE "ivmz_home"."enum__news_v_version_type";
  DROP TYPE "ivmz_home"."enum__news_v_version_status";
  DROP TYPE "ivmz_home"."enum_schedule_type";
  DROP TYPE "ivmz_home"."enum_schedule_visibility";`)
}
