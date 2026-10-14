/**
 * Public repositories of the site owner, for the "pick a repository" helper in the Works editor.
 * Server-side only, public data only: it never lists private repositories and never stores anything.
 */
import { site } from '@/lib/site'

export type GitHubRepoSummary = {
  archived: boolean
  description: string | null
  fork: boolean
  language: string | null
  name: string
  pushedAt: string | null
  stars: number
  topics: string[]
  url: string
}

export type WorkDraft = {
  githubUrl: string
  stack: string[]
  summary: string
  title: string
}

const REQUEST_TIMEOUT_MS = 4_000
const MAX_REPOS = 100
const MAX_TOPICS = 6
const MAX_SUMMARY = 240

/** The GitHub account the site belongs to, taken from the site constants (never from user input). */
export function ownerLogin(): string {
  return new URL(site.githubUrl).pathname.split('/').filter(Boolean)[0] ?? ''
}

function asRepo(item: unknown): GitHubRepoSummary | null {
  if (typeof item !== 'object' || item === null) return null
  const data = item as Record<string, unknown>
  if (typeof data.name !== 'string' || typeof data.html_url !== 'string') return null
  if (data.private === true) return null
  if (!data.html_url.startsWith('https://github.com/')) return null

  return {
    archived: data.archived === true,
    description: typeof data.description === 'string' ? data.description : null,
    fork: data.fork === true,
    language: typeof data.language === 'string' ? data.language : null,
    name: data.name,
    pushedAt: typeof data.pushed_at === 'string' ? data.pushed_at : null,
    stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : 0,
    topics: Array.isArray(data.topics)
      ? data.topics.filter((topic): topic is string => typeof topic === 'string')
      : [],
    url: data.html_url,
  }
}

export async function fetchOwnerRepos(
  fetcher: typeof fetch = fetch,
  token: string | undefined = process.env.GITHUB_API_TOKEN,
): Promise<GitHubRepoSummary[] | null> {
  const owner = ownerLogin()
  if (!owner) return null

  try {
    const response = await fetcher(
      `https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=${MAX_REPOS}&sort=pushed&type=owner`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'ivmz-home',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      } as RequestInit,
    )
    if (!response.ok) return null
    const body: unknown = await response.json()
    if (!Array.isArray(body)) return null
    return body.flatMap((item) => {
      const repo = asRepo(item)
      return repo ? [repo] : []
    })
  } catch {
    return null
  }
}

/** Starting values for a Work from a repository. The editor reviews and edits them. */
export function toWorkDraft(repo: GitHubRepoSummary): WorkDraft {
  const stack = [repo.language, ...repo.topics.slice(0, MAX_TOPICS)]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, all) => all.indexOf(value) === index)

  return {
    githubUrl: repo.url,
    stack,
    summary: (repo.description ?? '').trim().slice(0, MAX_SUMMARY),
    title: repo.name,
  }
}
