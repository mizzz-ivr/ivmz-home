import { EmptyState, PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { RepoStats } from '@/components/site/RepoStats'
import { getGitHubRepoStatsByUrl } from '@/lib/github-repo'
import { createPageMetadata } from '@/lib/metadata'
import { workAreas } from '@/lib/work-areas'
import { getWorksListContent } from '@/lib/public-list-content'

export const revalidate = 300

export const metadata = createPageMetadata({
  title: 'Works',
  description: 'これまでに公開した制作物を、役割・技術・現在の状態とともに紹介します。',
  path: '/works',
})

const copy = {
  hero: 'これまでに手がけた制作物を、役割・使った技術・現在の状態とあわせて紹介します。',
  queryError: '制作物の一覧を読み込めませんでした。時間をおいて、もう一度お試しください。',
  empty: '公開できる制作物を準備中です。しばらくお待ちください。',
} as const

export default async function WorksPage() {
  const content = await getWorksListContent()
  const repoStats = await getGitHubRepoStatsByUrl(content.items.map((work) => work.githubUrl))

  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="WORKS / 02"
        title="Work, with the story."
        description={<p>{copy.hero}</p>}
        signal="BUILD / CASE STUDY"
      />
      <PageSection
        title="Work areas"
        description={<p>つくるもの、担うことを3つの領域に整理しています。</p>}
      >
        <div className="area-grid">
          {workAreas.map((area, index) => (
            <article
              className="area-card"
              id={`area-${area.id}`}
              key={area.id}
              data-reveal="pop"
              data-spotlight
              style={{ '--reveal-delay': `${index * 90}ms` } as React.CSSProperties}
            >
              <span className="area-index">{area.index}</span>
              <b className="area-label">{area.label}</b>
              <h3>{area.title}</h3>
              <p>{area.description}</p>
              <ul className="stack-chips" aria-label="Keywords">
                {area.keywords.map((keyword) => (
                  <li key={keyword}>{keyword}</li>
                ))}
              </ul>
              <small>{area.related}</small>
            </article>
          ))}
        </div>
      </PageSection>
      <PageSection title="Published works" description={<p>公開中のプロジェクトです。</p>}>
        {content.state === 'error' ? (
          <EmptyState title="一覧を読み込めませんでした">{copy.queryError}</EmptyState>
        ) : content.items.length === 0 ? (
          <EmptyState title="準備中です">{copy.empty}</EmptyState>
        ) : (
          <div className="content-list">
            {content.items.map((work) => (
              <article className="content-row" key={work.id} data-reveal>
                <div className="content-row-copy">
                  <span>{work.projectStatus}</span>
                  <h3>{work.title}</h3>
                  <p>{work.summary}</p>
                </div>
                <div className="content-row-meta">
                  <span>{work.role}</span>
                  <small>{work.stack.join(' · ')}</small>
                  <RepoStats stats={work.githubUrl ? repoStats.get(work.githubUrl) : undefined} />
                  <a href={`/works/${encodeURIComponent(work.slug)}`}>View case study →</a>
                  {work.githubUrl && (
                    <a href={work.githubUrl} target="_blank" rel="noreferrer">
                      GitHub ↗
                    </a>
                  )}
                  {work.liveUrl && (
                    <a href={work.liveUrl} target="_blank" rel="noreferrer">
                      Live site ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </PageSection>
      <PageCTA
        title="制作の過程も読みたい方へ"
        body="技術記事や制作の記録はBlogにまとめています。"
        href="/blog"
        label="Open Blog"
      />
    </main>
  )
}
