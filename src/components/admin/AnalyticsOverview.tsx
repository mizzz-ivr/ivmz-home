import { cachedGA4Summary } from '@/ops/ga4'

const card = {
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 8,
  padding: '14px 16px',
} as const

/** Authenticated, aggregate-only overview; never embeds a Google key in the browser. */
export async function AnalyticsOverview() {
  const summary = await cachedGA4Summary()

  return (
    <section aria-label="サイト閲覧統計" style={{ marginTop: 28 }}>
      <h3 style={{ margin: '0 0 10px' }}>サイト閲覧統計（GA4）</h3>
      {summary.state === 'not-configured' ? (
        <p>
          未設定です。GA4_PROPERTY_ID と GA4_SERVICE_ACCOUNT_JSON を設定すると集計が表示されます。
        </p>
      ) : summary.state === 'unavailable' ? (
        <p role="status">
          Google Analyticsの集計を取得できませんでした。権限またはAPIの状態をご確認ください。
        </p>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            }}
          >
            {[
              ['直近7日・閲覧数', summary.last7d.views],
              ['直近7日・アクティブユーザー', summary.last7d.activeUsers],
              ['直近30日・閲覧数', summary.last30d.views],
              ['直近30日・アクティブユーザー', summary.last30d.activeUsers],
            ].map(([title, value]) => (
              <div style={card} key={title}>
                <p style={{ fontSize: 12, margin: 0 }}>{title}</p>
                <strong style={{ display: 'block', fontSize: 25, marginTop: 4 }}>
                  {Number(value).toLocaleString('ja-JP')}
                </strong>
              </div>
            ))}
          </div>
          <h4 style={{ margin: '18px 0 8px' }}>よく見られているページ（直近30日）</h4>
          {summary.topPages.length === 0 ? (
            <p>集計対象のページはまだありません。</p>
          ) : (
            <ol style={{ margin: 0, paddingLeft: 24 }}>
              {summary.topPages.map(({ path, views }) => (
                <li key={path}>
                  <span>{path}</span> — {views.toLocaleString('ja-JP')}回
                </li>
              ))}
            </ol>
          )}
          <p style={{ fontSize: 12, margin: '12px 0 0' }}>
            同意した訪問者のみの集計です。正確な全訪問数ではありません。
          </p>
        </>
      )}
      <p style={{ marginTop: 10, fontSize: 12 }}>
        <a
          href="https://analytics.google.com/analytics/web/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Analyticsで詳細を見る ↗
        </a>
      </p>
    </section>
  )
}
