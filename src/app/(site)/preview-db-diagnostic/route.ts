const expectedPoolerUsername = 'ivmz_home_app.drazbrcqnjxjuygfxmlz'

export function GET() {
  const rawDatabaseUrl = process.env.DATABASE_URL

  if (!rawDatabaseUrl) {
    return Response.json({
      ok: false,
      hasDatabaseUrl: false,
    })
  }

  const protocolMatch = rawDatabaseUrl.match(/^(postgresql|postgres):\/\//)
  const protocolPrefixOk = Boolean(protocolMatch)
  const hasOuterQuotes = /^["']|["']$/.test(rawDatabaseUrl)
  const containsWhitespace = /\s/.test(rawDatabaseUrl)
  const containsPlaceholderAngles = /[<>]/.test(rawDatabaseUrl)
  const malformedPercentEncoding = /%(?![0-9A-Fa-f]{2})/.test(rawDatabaseUrl)

  const authorityStart = protocolMatch?.[0].length ?? 0
  const lastAt = rawDatabaseUrl.lastIndexOf('@')
  const hasCredentialSeparator = lastAt > authorityStart
  const credentialPart = hasCredentialSeparator
    ? rawDatabaseUrl.slice(authorityStart, lastAt)
    : ''
  const passwordSeparator = credentialPart.indexOf(':')
  const username = passwordSeparator >= 0 ? credentialPart.slice(0, passwordSeparator) : ''
  const rawPassword = passwordSeparator >= 0 ? credentialPart.slice(passwordSeparator + 1) : ''
  const hostAndPath = hasCredentialSeparator ? rawDatabaseUrl.slice(lastAt + 1) : ''
  const hostPort = hostAndPath.split('/', 1)[0] ?? ''
  const pathAndQuery = hostAndPath.slice(hostPort.length)

  const checks = {
    hasDatabaseUrl: true,
    protocolPrefixOk,
    hasOuterQuotes,
    containsWhitespace,
    containsPlaceholderAngles,
    malformedPercentEncoding,
    hasCredentialSeparator,
    usernameOk: username === expectedPoolerUsername,
    hasPassword: rawPassword.length > 0,
    passwordHasUnencodedStructuralCharacters: /[/?#\[\]@]/.test(rawPassword),
    poolerDomainOk: /\.pooler\.supabase\.com(?::\d+)?$/.test(hostPort),
    directDbHostDetected: /^db\.drazbrcqnjxjuygfxmlz\.supabase\.co(?::\d+)?$/.test(hostPort),
    sessionPort5432: /:5432$/.test(hostPort),
    transactionPort6543: /:6543$/.test(hostPort),
    hasExplicitPort: /:\d+$/.test(hostPort),
    databasePathOk: /^\/postgres(?:\?|$)/.test(pathAndQuery),
    sslModeLiteralOk: /[?&]sslmode=require(?:&|$)/.test(rawDatabaseUrl),
  }

  const ok =
    checks.protocolPrefixOk &&
    !checks.hasOuterQuotes &&
    !checks.containsWhitespace &&
    !checks.containsPlaceholderAngles &&
    !checks.malformedPercentEncoding &&
    checks.hasCredentialSeparator &&
    checks.usernameOk &&
    checks.hasPassword &&
    !checks.passwordHasUnencodedStructuralCharacters &&
    checks.poolerDomainOk &&
    checks.sessionPort5432 &&
    checks.databasePathOk &&
    checks.sslModeLiteralOk

  return Response.json({ ok, ...checks })
}
