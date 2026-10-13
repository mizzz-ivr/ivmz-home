import { EmptyState, PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getNewsListContent } from '@/lib/public-list-content'

export const revalidate = 300

export const metadata = createPageMetadata({
  title: 'News',
  description: 'リリース、告知、イベントなど、最近の活動のお知らせ。',
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
      <PageHero
        index="NEWS / 04"
        title={<>What is moving now.</>}
        description={
          <p>リリースや告知、イベントなど、最近の活動を短いお知らせとしてまとめています。</p>
        }
        signal="ACTIVITY / RELEASE"
      />
      <PageSection
        title="Latest updates"
        description={<p>新しいお知らせから順に表示しています。</p>}
      >
        {content.state === 'error' ? (
          <EmptyState title="お知らせを読み込めませんでした">
            時間をおいて、もう一度お試しください。
          </EmptyState>
        ) : content.items.length === 0 ? (
          <EmptyState title="お知らせはまだありません">
            新しい情報があれば、こちらに掲載します。
          </EmptyState>
        ) : (
          <div className="content-list">
            {content.items.map((item) => (
              <article className="content-row" key={item.id}>
                <div className="content-row-copy">
                  <span>{item.type}</span>
                  <h3>{item.title}</h3>
                  <p>{compact(item.body)}</p>
                </div>
                <div className="content-row-meta">
                  <span>
                    {item.publishedAt
                      ? new Intl.DateTimeFormat('ja-JP').format(new Date(item.publishedAt))
                      : 'PUBLISHED'}
                  </span>
                  <a href={`/news/${encodeURIComponent(item.slug)}`}>Read update →</a>
                  {item.externalUrl && (
                    <a href={item.externalUrl} target="_blank" rel="noreferrer">
                      Open source ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </PageSection>
      <PageCTA
        title="これからの予定"
        body="公開できるイベントやリリースの予定はScheduleにまとめています。"
        href="/schedule"
        label="Open Schedule"
      />
    </main>
  )
}
