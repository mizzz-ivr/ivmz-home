import type { GitHubProfile } from '@/lib/github-profile'

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

/** Live public GitHub facts for the site owner. Renders nothing when the API had no answer. */
export function GitHubProfilePanel({ profile }: { profile: GitHubProfile | null }) {
  if (!profile) return null

  return (
    <div className="github-panel">
      <div className="github-panel-head">
        <p className="github-panel-title">
          GitHub <span>@{profile.login}</span>
        </p>
        <a href={profile.profileUrl} target="_blank" rel="noreferrer">
          プロフィールを見る <span aria-hidden="true">↗</span>
        </a>
      </div>
      <ul className="github-panel-stats">
        <li>
          <strong>{profile.publicRepos}</strong>
          <span>public repos</span>
        </li>
        <li>
          <strong>{profile.followers}</strong>
          <span>followers</span>
        </li>
        <li>
          <strong>★ {profile.totalStars}</strong>
          <span>stars (own repos)</span>
        </li>
      </ul>
      {profile.languages.length > 0 ? (
        <ul className="github-panel-langs" aria-label="よく使う言語">
          {profile.languages.map((language) => (
            <li key={language.name}>
              {language.name} <span>×{language.count}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {profile.recentRepos.length > 0 ? (
        <ul className="github-panel-repos">
          {profile.recentRepos.map((repo) => {
            const updated = formatDate(repo.pushedAt)
            return (
              <li key={repo.name}>
                <a href={repo.url} target="_blank" rel="noreferrer">
                  {repo.name}
                </a>
                <span>
                  {repo.language ? `${repo.language} · ` : ''}★ {repo.stars}
                  {updated ? ` · updated ${updated}` : ''}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
