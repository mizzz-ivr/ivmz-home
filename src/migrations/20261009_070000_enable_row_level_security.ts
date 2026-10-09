import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Defense in depth for Supabase: turn on RLS for every table in the app schema.
 *
 * No policies are created on purpose. The app connects as the table owner (`ivmz_home_app`), and
 * owners bypass RLS unless it is FORCEd (it is not), so Payload keeps working. Any other role that
 * could reach these tables through the Data API (`anon`, `authenticated`) gets no rows even if a
 * grant is added by mistake later.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$
   DECLARE
     t record;
   BEGIN
     FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'ivmz_home' LOOP
       EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'ivmz_home', t.tablename);
     END LOOP;
   END
   $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DO $$
   DECLARE
     t record;
   BEGIN
     FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'ivmz_home' LOOP
       EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', 'ivmz_home', t.tablename);
     END LOOP;
   END
   $$;`)
}
