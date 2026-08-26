const expectedPoolerUsername = 'ivmz_home_app.drazbrcqnjxjuygfxmlz'

export function GET() {
  const rawDatabaseUrl = process.env.DATABASE_URL

  if (!rawDatabaseUrl) {
    return Response.json({
      ok: false,
      hasDatabaseUrl: false,
    })
  }

  try {
    const databaseUrl = new URL(rawDatabaseUrl)

    const checks = {
      hasDatabaseUrl: true,
      protocolOk: databaseUrl.protocol === 'postgresql:' || databaseUrl.protocol === 'postgres:',
      usernameOk: decodeURIComponent(databaseUrl.username) === expectedPoolerUsername,
      hasPassword: databaseUrl.password.length > 0,
      poolerHostOk: databaseUrl.hostname.endsWith('.pooler.supabase.com'),
      sessionPortOk: databaseUrl.port === '5432',
      databaseOk: databaseUrl.pathname === '/postgres',
      sslModeOk: databaseUrl.searchParams.get('sslmode') === 'require',
    }

    return Response.json({
      ok: Object.values(checks).every(Boolean),
      ...checks,
    })
  } catch {
    return Response.json({
      ok: false,
      hasDatabaseUrl: true,
      parseable: false,
    })
  }
}
