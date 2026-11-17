/**
 * Public GitHub profile facts for the About page panel, derived from the site's own
 * `githubUrl`. Nothing is stored; every failure degrades to "no panel" (fail-closed),
 * mirroring the discipline of `github-repo.ts`.
 */

export type GitHubProfileRepo = {
  language: string | null
  name: string
  pushedAt: string | null
  stars: number
  url: string
}

export type GitHubProfile = {
  followers: number
  languages: Array<{ count: number; name: string }>
  login: string
  profileUrl: string
  publicRepos: number
  recentRepos: GitHubProfileRepo[]
  totalStars: number
}

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const REQUEST_TIMEOUT_MS = 2_500
const REVALIDATE_SECONDS = 3_600
const MAX_RECENT_REPOS = 3
const MAX_LANGUAGES = 4

/** Accepts only `https://github.com/<owner>` (optional trailing slash). */
export function parseGitHubProfileUrl(value: string | null | undefined): string | null {
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
  if (segments.length !== 1) return null

  const owner = segments[0]
  return OWNER_PATTERN.test(owner) ? owner : null
}

type RepoBody = {
  fork?: unknown
  html_url?: unknown
  language?: unknown
  name?: unknown
  pushed_at?: unknown
  stargazers_count?: unknown
}

/** Pure aggregation over the two API bodies, exported for tests. */
export function buildGitHubProfile(
  login: string,
  profileUrl: string,
  userBody: unknown,
  reposBody: unknown,
): GitHubProfile | null {
  if (typeof userBody !== 'object' || userBody === null) return null
  const user = userBody as Record<string, unknown>
  if (typeof user.public_repos !== 'number' || typeof user.followers !== 'number') return null
  if (!Array.isArray(reposBody)) return null

  const own = (reposBody as RepoBody[]).filter(
    (repo) =>
      repo && typeof repo === 'object' && repo.fork !== true && typeof repo.name === 'string',
  )

  const totalStars = own.reduce(
    (sum, repo) => sum + (typeof repo.stargazers_count === 'number' ? repo.stargazers_count : 0),
    0,
  )

  const languageCounts = new Map<string, number>()
  for (const repo of own) {
    if (typeof repo.language === 'string' && repo.language) {
      languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1)
    }
  }
  const languages = [...languageCounts.entries()]
    .map(([name, count]) => ({ count, name }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, MAX_LANGUAGES)

  const recentRepos = [...own]
    .sort((a, b) =>
      String(typeof b.pushed_at === 'string' ? b.pushed_at : '').localeCompare(
        String(typeof a.pushed_at === 'string' ? a.pushed_at : ''),
      ),
    )
    .slice(0, MAX_RECENT_REPOS)
    .map((repo) => ({
      language: typeof repo.language === 'string' ? repo.language : null,
      name: repo.name as string,
      pushedAt: typeof repo.pushed_at === 'string' ? repo.pushed_at : null,
      stars: typeof repo.stargazers_count === 'number' ? repo.stargazers_count : 0,
      url: typeof repo.html_url === 'string' ? repo.html_url : profileUrl,
    }))

  return {
    followers: user.followers,
    languages,
    login,
    profileUrl,
    publicRepos: user.public_repos,
    recentRepos,
    totalStars,
  }
}

async function fetchJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ivmz-home',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  } as RequestInit)
  if (!response.ok) return null
  return response.json()
}

export async function getGitHubProfile(
  profileUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<GitHubProfile | null> {
  const login = parseGitHubProfileUrl(profileUrl)
  if (!login) return null

  try {
    const [userBody, reposBody] = await Promise.all([
      fetchJson(`https://api.github.com/users/${encodeURIComponent(login)}`, fetcher),
      fetchJson(
        `https://api.github.com/users/${encodeURIComponent(login)}/repos?per_page=100&type=owner`,
        fetcher,
      ),
    ])
    return buildGitHubProfile(login, profileUrl, userBody, reposBody)
  } catch {
    return null
  }
}
