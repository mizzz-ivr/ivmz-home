import type { GitHubRepoStats } from '@/lib/github-repo'

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

/** Public GitHub facts for a linked repository. Renders nothing when the API had no answer. */
export function RepoStats({ stats }: { stats: GitHubRepoStats | undefined }) {
  if (!stats) return null
  const updated = formatDate(stats.pushedAt)

  return (
    <ul className="repo-stats" aria-label="GitHub repository facts">
      <li aria-label={`${stats.stars} stars`}>★ {stats.stars}</li>
      <li aria-label={`${stats.forks} forks`}>⑂ {stats.forks}</li>
      {stats.language ? <li>{stats.language}</li> : null}
      {updated ? <li>updated {updated}</li> : null}
      {stats.archived ? <li className="repo-stats-archived">archived</li> : null}
    </ul>
  )
}
