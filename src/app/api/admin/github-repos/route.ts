import { fetchOwnerRepos, toWorkDraft } from '@/lib/github-repo-list'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function plain(status: number) {
  return new Response(null, { headers: { 'Cache-Control': 'no-store' }, status })
}

/**
 * Admin-only list of the owner's public GitHub repositories, for the picker in the Works editor.
 * Requires a Payload admin session. Public data only; nothing is stored.
 */
export async function GET(request: Request) {
  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('../../../../payload.config'),
  ])
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return plain(401)

  const repos = await fetchOwnerRepos()
  if (!repos)
    return Response.json(
      { repos: [], unavailable: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )

  return Response.json(
    { repos: repos.map((repo) => ({ ...repo, draft: toWorkDraft(repo) })) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
