-- Read-only RLS/grant audit for the Payload-only ivmz_home schema.
-- No connection secrets or record contents are selected.
WITH relation_privileges AS (
  SELECT
    c.relkind,
    c.relrowsecurity,
    c.relforcerowsecurity,
    COALESCE(has_table_privilege(to_regrole('anon'), c.oid, 'SELECT'), false)
      OR COALESCE(has_table_privilege(to_regrole('anon'), c.oid, 'INSERT'), false)
      OR COALESCE(has_table_privilege(to_regrole('anon'), c.oid, 'UPDATE'), false)
      OR COALESCE(has_table_privilege(to_regrole('anon'), c.oid, 'DELETE'), false)
      AS anon_direct_grant,
    COALESCE(has_table_privilege(to_regrole('authenticated'), c.oid, 'SELECT'), false)
      OR COALESCE(has_table_privilege(to_regrole('authenticated'), c.oid, 'INSERT'), false)
      OR COALESCE(has_table_privilege(to_regrole('authenticated'), c.oid, 'UPDATE'), false)
      OR COALESCE(has_table_privilege(to_regrole('authenticated'), c.oid, 'DELETE'), false)
      AS authenticated_direct_grant
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'ivmz_home'
    AND c.relkind IN ('r', 'p', 'v', 'm')
)
SELECT
  current_database() AS database_name,
  current_user AS inspected_as,
  to_regrole('anon') IS NOT NULL AS anon_role_exists,
  to_regrole('authenticated') IS NOT NULL AS authenticated_role_exists,
  COUNT(*) FILTER (WHERE relkind IN ('r', 'p')) AS table_count,
  COUNT(*) FILTER (WHERE relkind = 'v') AS view_count,
  COUNT(*) FILTER (WHERE relkind IN ('r', 'p') AND relrowsecurity) AS rls_enabled_tables,
  COUNT(*) FILTER (WHERE relkind IN ('r', 'p') AND NOT relrowsecurity) AS rls_disabled_tables,
  COUNT(*) FILTER (WHERE relkind IN ('r', 'p') AND relforcerowsecurity) AS rls_forced_tables,
  COUNT(*) FILTER (WHERE anon_direct_grant) AS anon_direct_access_objects,
  COUNT(*) FILTER (WHERE authenticated_direct_grant) AS authenticated_direct_access_objects,
  (SELECT COUNT(*) FROM pg_catalog.pg_policies WHERE schemaname = 'ivmz_home') AS policy_count,
  (SELECT COUNT(*)
   FROM pg_catalog.pg_proc AS p
   JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'ivmz_home' AND p.prosecdef) AS security_definer_functions,
  CASE WHEN to_regrole('anon') IS NULL THEN NULL
    ELSE has_schema_privilege('anon', 'ivmz_home', 'USAGE')
  END AS anon_schema_usage,
  CASE WHEN to_regrole('authenticated') IS NULL THEN NULL
    ELSE has_schema_privilege('authenticated', 'ivmz_home', 'USAGE')
  END AS authenticated_schema_usage
FROM relation_privileges
