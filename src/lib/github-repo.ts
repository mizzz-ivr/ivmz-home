/**
 * Phase 1 of GitHub-linked Works: derive `owner/repo` from the Work's existing `githubUrl` and show
 * public repo facts next to it. Nothing is stored, only repositories that an editor linked from a
 * published Work are ever requested, and every failure degrades to "no stats".
 */

export type GitHubRepoRef = { owner: string; repo: string }

export type GitHubRepoStats = {
  archived: boolean
  forks: number
  language: string | null
  pushedAt: string | null
  stars: number
}

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/
const REQUEST_TIMEOUT_MS = 2_500
const REVALIDATE_SECONDS = 3_600
/** Unauthenticated GitHub API allows 60 requests/hour per IP; stay well below it per render. */
export const MAX_REPOS_PER_RENDER = 12

/** Accepts only `https://github.com/<owner>/<repo>` (optional `.git` and trailing slash). */
export function parseGitHubRepo(value: string | null | undefined): GitHubRepoRef | null {
  if (!value) return null

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' || url.hostname !== 'github.com') return null
  if (url.username || url.password || url.port) return null

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length !== 2) return null

  const owner = segments[0]
  const repo = segments[1].replace(/\.git$/, '')
  if (!OWNER_PATTERN.test(owner) || !REPO_PATTERN.test(repo)) return null
  if (repo === '.' || repo === '..') return null

  return { owner, repo }
}

function asRepoStats(body: unknown): GitHubRepoStats | null {
  if (typeof body !== 'object' || body === null) return null
  const data = body as Record<string, unknown>
  if (typeof data.stargazers_count !== 'number' || typeof data.forks_count !== 'number') return null

  return {
    archived: data.archived === true,
    forks: data.forks_count,
    language: typeof data.language === 'string' ? data.language : null,
    pushedAt: typeof data.pushed_at === 'string' ? data.pushed_at : null,
    stars: data.stargazers_count,
  }
}

export async function fetchGitHubRepoStats(
  ref: GitHubRepoRef,
  fetcher: typeof fetch = fetch,
  token: string | undefined = process.env.GITHUB_API_TOKEN,
): Promise<GitHubRepoStats | null> {
  try {
    const response = await fetcher(
      `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'ivmz-home',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      } as RequestInit,
    )
    if (!response.ok) return null
    return asRepoStats(await response.json())
  } catch {
    return null
  }
}

/** Stats for a list of Works, keyed by their `githubUrl`. Capped so one page can't exhaust the API budget. */
export async function getGitHubRepoStatsByUrl(
  urls: ReadonlyArray<string | null | undefined>,
  fetcher: typeof fetch = fetch,
): Promise<Map<string, GitHubRepoStats>> {
  const refs = new Map<string, GitHubRepoRef>()
  for (const url of urls) {
    const ref = parseGitHubRepo(url)
    if (url && ref && !refs.has(url) && refs.size < MAX_REPOS_PER_RENDER) refs.set(url, ref)
  }

  const entries = await Promise.all(
    [...refs].map(async ([url, ref]) => [url, await fetchGitHubRepoStats(ref, fetcher)] as const),
  )

  const result = new Map<string, GitHubRepoStats>()
  for (const [url, stats] of entries) if (stats) result.set(url, stats)
  return result
}
