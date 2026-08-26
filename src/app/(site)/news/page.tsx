import { EmptyState, PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getNewsListContent } from '@/lib/public-list-content'

export const revalidate = 300

export const metadata = createPageMetadata({
  title: 'News',
  description: 'リリース、告知、イベント、公開活動をまとめるNews一覧。',
  path: '/news',
})

function compact(value: string, maxLength = 260) {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

export default async function NewsPage() {
  const content = await getNewsListContent()

  return (
    <main id="main-content" className="route-page">
      <PageHero index="NEWS / 04" title={<>What is moving now.</>} description={<p>リリース・告知・イベント・publication・activityを、長文記事とは分けて追えるようにします。</p>} signal="ACTIVITY / RELEASE" />
      <PageSection title="Activity stream" description={<p>公開済みNewsだけを新しい順に表示します。</p>}>
        {content.state === 'error' ? (
          <EmptyState title="News is temporarily unavailable.">CMS queryに失敗しました。このrouteだけ安全に縮退しています。</EmptyState>
        ) : content.items.length === 0 ? (
          <EmptyState title="No published news yet.">CMSは正常です。公開されたNewsがここに並びます。</EmptyState>
        ) : (
          <div className="content-list">
            {content.items.map((item) => (
              <article className="content-row" key={item.id}>
                <div className="content-row-copy"><span>{item.type}</span><h3>{item.title}</h3><p>{compact(item.body)}</p></div>
                <div className="content-row-meta"><span>{item.publishedAt ? new Intl.DateTimeFormat('ja-JP').format(new Date(item.publishedAt)) : 'PUBLISHED'}</span>{item.externalUrl ? <a href={item.externalUrl}>Open source ↗</a> : <small>Detail route coming next</small>}</div>
              </article>
            ))}
          </div>
        )}
      </PageSection>
      <PageCTA title="See what comes next." body="外部へ見せてよいイベント・公開・リリース予定はScheduleへ分離しています。" href="/schedule" label="Open Schedule" />
    </main>
  )
}
