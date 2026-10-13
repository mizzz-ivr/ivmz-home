import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "ivmz_home"."integration_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"youtube_channel" varchar,
  	"google_calendar_id" varchar,
  	"social_embed_urls" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );

  -- New tables follow the same rule as the rest of the schema: RLS on, no policies (see the RLS migration).
  ALTER TABLE "ivmz_home"."integration_settings" ENABLE ROW LEVEL SECURITY;

  -- Initial public values (editable any time in the CMS under Content -> Integrations).
  INSERT INTO "ivmz_home"."integration_settings" ("youtube_channel", "google_calendar_id", "updated_at", "created_at")
  VALUES (
    'https://www.youtube.com/@ivuru-mz',
    'd5062a214c97ce981b734295dae99cb6550e6eb55a2d3971bbf0fc180cb762e0@group.calendar.google.com',
    now(),
    now()
  );

  -- Public profile links; skipped when a link with the same URL already exists.
  INSERT INTO "ivmz_home"."social_links" ("platform", "url", "handle", "enabled", "order")
  SELECT v.platform, v.url, v.handle, true, v.sort
  FROM (VALUES
    ('GitHub', 'https://github.com/mizzz-ivr', 'mizzz-ivr', 10),
    ('X', 'https://x.com/ivuruGG', '@ivuruGG', 20),
    ('Instagram', 'https://www.instagram.com/ivurugg/', '@ivurugg', 30),
    ('YouTube', 'https://www.youtube.com/@ivuru-mz', '@ivuru-mz', 40)
  ) AS v(platform, url, handle, sort)
  WHERE NOT EXISTS (SELECT 1 FROM "ivmz_home"."social_links" s WHERE lower(s.url) = lower(v.url));
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ivmz_home"."integration_settings" CASCADE;`)
}
