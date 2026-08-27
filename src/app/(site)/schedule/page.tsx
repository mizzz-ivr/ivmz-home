import { EmptyState, PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getScheduleListContent } from '@/lib/public-list-content'
import { formatPublicDateTime } from '@/lib/public-content-safety'

export const revalidate = 300

export const metadata = createPageMetadata({
  title: 'Schedule',
  description: '外部公開してよいイベント、リリース、publication等だけを扱うPublic Schedule。',
  path: '/schedule',
})

function formatScheduleRange(startAt: string, endAt: string | null | undefined, timezone: string) {
  const start = formatPublicDateTime(startAt, timezone)
  if (!start) return 'Schedule time unavailable'

  const end = endAt ? formatPublicDateTime(endAt, timezone) : null
  return end ? `${start} – ${end}` : start
}

export default async function SchedulePage() {
  const content = await getScheduleListContent()

  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="SCHEDULE / 05"
        title={<>Public plans, only.</>}
        description={
          <p>個人の全カレンダーではなく、サイトで公開してよい予定だけをCMSから表示します。</p>
        }
        signal="TIME / PUBLIC"
      />
      <PageSection
        title="Upcoming"
        description={<p>`visibility = public` かつ現在以降のScheduleだけを取得します。</p>}
      >
        {content.state === 'error' ? (
          <EmptyState title="Schedule is temporarily unavailable.">
            CMS queryに失敗しました。非公開予定へフォールバックすることはありません。
          </EmptyState>
        ) : content.items.length === 0 ? (
          <EmptyState title="Nothing public is scheduled.">
            CMSは正常です。公開予定がない状態をそのまま表示しています。
          </EmptyState>
        ) : (
          <div className="content-list">
            {content.items.map((item) => (
              <article className="content-row" key={item.id}>
                <div className="content-row-copy">
                  <span>{item.type}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description || 'Public schedule item.'}</p>
                </div>
                <div className="content-row-meta">
                  <span>{formatScheduleRange(item.startAt, item.endAt, item.timezone)}</span>
                  <small>{item.timezone}</small>
                  {item.location && <small>{item.location}</small>}
                  {item.url && <a href={item.url}>Open details ↗</a>}
                </div>
              </article>
            ))}
          </div>
        )}
      </PageSection>
      <PageCTA
        title="Need to reach out?"
        body="仕事・開発相談・コラボ等の正式な入口はContactへ集約します。"
        href="/contact"
        label="Open Contact"
      />
    </main>
  )
}
