import { AutoSyncBadge } from '@/components/site/AutoSyncBadge'
import { EmptyState, PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { getIntegrationSettings } from '@/lib/integration-settings'
import { createPageMetadata } from '@/lib/metadata'
import { getScheduleListContent } from '@/lib/public-list-content'
import { formatPublicDateTime } from '@/lib/public-content-safety'
import { getUpcomingGoogleCalendarEvents, type CalendarEvent } from '@/lib/google-calendar'

export const revalidate = 300

export const metadata = createPageMetadata({
  title: 'Schedule',
  description: '公開しているイベントやリリースなどの予定。',
  path: '/schedule',
})

function formatScheduleRange(startAt: string, endAt: string | null | undefined, timezone: string) {
  const start = formatPublicDateTime(startAt, timezone)
  if (!start) return 'Schedule time unavailable'

  const end = endAt ? formatPublicDateTime(endAt, timezone) : null
  return end ? `${start} – ${end}` : start
}

function formatCalendarWhen(event: CalendarEvent) {
  const options: Intl.DateTimeFormatOptions = event.allDay
    ? { dateStyle: 'medium', timeZone: 'UTC' }
    : { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tokyo' }
  return new Intl.DateTimeFormat('ja-JP', options).format(new Date(event.start))
}

export default async function SchedulePage() {
  const settings = await getIntegrationSettings()
  const [content, calendarEvents] = await Promise.all([
    getScheduleListContent(),
    getUpcomingGoogleCalendarEvents(settings.calendarId),
  ])

  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="SCHEDULE / 05"
        title={<>Public plans, only.</>}
        description={<p>イベントやリリースなど、公開できる予定をお知らせします。</p>}
        signal="TIME / PUBLIC"
      />
      <PageSection title="Upcoming" description={<p>これからの予定です。</p>}>
        {content.state === 'error' ? (
          <EmptyState title="予定を読み込めませんでした">
            時間をおいて、もう一度お試しください。
          </EmptyState>
        ) : content.items.length === 0 ? (
          <EmptyState title="現在、公開している予定はありません">
            予定が決まり次第、こちらに掲載します。
          </EmptyState>
        ) : (
          <div className="content-list">
            {content.items.map((item) => (
              <article className="content-row" key={item.id}>
                <div className="content-row-copy">
                  <span>{item.type}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description || ''}</p>
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
      {calendarEvents.length > 0 && (
        <PageSection
          title="Calendar"
          description={<p>Googleカレンダーの公開予定を、自動で表示しています。</p>}
        >
          <p className="autosync-row">
            <AutoSyncBadge source="Google Calendar" />
          </p>
          <div className="content-list">
            {calendarEvents.map((event) => (
              <article className="content-row" key={`${event.start}-${event.title}`}>
                <div className="content-row-copy">
                  <span>{event.allDay ? 'ALL DAY' : 'EVENT'}</span>
                  <h3>{event.title}</h3>
                </div>
                <div className="content-row-meta">
                  <span>{formatCalendarWhen(event)}</span>
                  {!event.allDay && <small>Asia/Tokyo</small>}
                  {event.location && <small>{event.location}</small>}
                  {event.url && (
                    <a href={event.url} target="_blank" rel="noreferrer">
                      Open details ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </PageSection>
      )}
      <PageSection
        title="Rhythm"
        description={
          <p>
            毎日の自動運転と、これからの節目です。人の予定だけでなく、運用のリズムも公開しています。
          </p>
        }
      >
        <div className="rhythm-grid">
          <article className="rhythm-card">
            <h3>DAILY RHYTHM — 毎日自動で回るもの</h3>
            <div className="rhythm-row">
              <span className="rhythm-time">01:15 JST</span>
              <div>
                <strong>DevIntel 夜間集計</strong>
                <p>全52 repo の開発活動を収集・集計します。翌朝の日報の元データになります。</p>
              </div>
            </div>
            <div className="rhythm-row">
              <span className="rhythm-time">03:15 JST</span>
              <div>
                <strong>データベースの日次バックアップ</strong>
                <p>PostgreSQL 17 上の各データベースを自動でバックアップします。</p>
              </div>
            </div>
            <div className="rhythm-row">
              <span className="rhythm-time">09:00 JST</span>
              <div>
                <strong>Daily Quiz 通知＋前日分の締切</strong>
                <p>当日分の受付は翌09:00まで。ボーナスは当日分のみ09:00に解放されます。</p>
              </div>
            </div>
          </article>
          <article className="rhythm-card">
            <h3>NEXT MILESTONES</h3>
            <div className="rhythm-row">
              <span className="rhythm-time">#176</span>
              <div>
                <strong>サイト刷新の継続</strong>
                <p>ページ単位で「実装 → 確認 → 本番反映」を繰り返しています。</p>
              </div>
            </div>
            <div className="rhythm-row">
              <span className="rhythm-time">#173</span>
              <div>
                <strong>開発ライブの公開</strong>
                <p>GitHub / DevIntel の集計値を、公開範囲だけフィードとして出す予定です。</p>
              </div>
            </div>
            <div className="rhythm-row">
              <span className="rhythm-time">#174/175</span>
              <div>
                <strong>ゲーム連携</strong>
                <p>Enka ショーケース（同意連動）と、Herta の活動の公開 API を設計中です。</p>
              </div>
            </div>
            <div className="rhythm-row">
              <span className="rhythm-time">2026-12-13</span>
              <div>
                <strong>監視 Console の枠が自動解除予定</strong>
                <p>ingest 再開後に、アラート改善の効果測定を再開する想定です。</p>
              </div>
            </div>
          </article>
        </div>
      </PageSection>
      <PageCTA
        title="ご相談はこちらから"
        body="お仕事・開発のご相談、コラボレーションなどはContactからご連絡ください。"
        href="/contact"
        label="Open Contact"
      />
    </main>
  )
}
