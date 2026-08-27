import { EmptyState, PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getWorksListContent } from '@/lib/public-list-content'

export const revalidate = 300

export const metadata = createPageMetadata({
  title: 'Works',
  description: '公開中の制作物を、役割・技術・状態とともに一覧するWorksページ。',
  path: '/works',
})

const copy = {
  hero: '公開済みの制作物をPayload CMSから取得します。詳細Case Study routeは次PRでslugへ接続します。',
  queryError:
    'CMS queryに失敗しました。Homeの既存fallbackは維持され、この一覧だけ安全に縮退しています。',
  empty: 'CMSは正常です。公開済みWorksが登録されるまで、このempty stateを表示します。',
} as const

export default async function WorksPage() {
  const content = await getWorksListContent()

  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="WORKS / 02"
        title="Work, with the decisions attached."
        description={<p>{copy.hero}</p>}
        signal="BUILD / CASE STUDY"
      />
      <PageSection
        title="Published works"
        description={<p>公開状態 `_status = published` のコンテンツだけを表示します。</p>}
      >
        {content.state === 'error' ? (
          <EmptyState title="Works are temporarily unavailable.">{copy.queryError}</EmptyState>
        ) : content.items.length === 0 ? (
          <EmptyState title="No published works yet.">{copy.empty}</EmptyState>
        ) : (
          <div className="content-list">
            {content.items.map((work) => (
              <article className="content-row" key={work.id}>
                <div className="content-row-copy">
                  <span>{work.projectStatus}</span>
                  <h3>{work.title}</h3>
                  <p>{work.summary}</p>
                </div>
                <div className="content-row-meta">
                  <span>{work.role}</span>
                  <small>{work.stack.join(' · ')}</small>
                  {work.githubUrl && <a href={work.githubUrl}>GitHub ↗</a>}
                  {!work.githubUrl && work.liveUrl && <a href={work.liveUrl}>Live site ↗</a>}
                  {!work.githubUrl && !work.liveUrl && <small>Detail route coming next</small>}
                </div>
              </article>
            ))}
          </div>
        )}
      </PageSection>
      <PageCTA
        title="Want the build log too?"
        body="技術記事・制作記録はBlogへ集約していきます。"
        href="/blog"
        label="Open Blog"
      />
    </main>
  )
}
