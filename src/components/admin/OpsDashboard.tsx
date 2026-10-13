import type { ServerProps } from 'payload'

import { readOpsConfig, type OpsConfig } from '@/ops/config'
import { resolveRetentionDays } from '@/ops/retention'
import { collectOpsStats, deriveHealth, type OpsStats } from '@/ops/stats'

const card = {
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 8,
  padding: '14px 16px',
} as const

const label = { color: 'var(--theme-elevation-600)', fontSize: 12, margin: 0 } as const
const big = { fontSize: 28, fontWeight: 700, lineHeight: 1.2, margin: '4px 0 0' } as const

function Stat({ title, value, note }: { title: string; value: number | string; note?: string }) {
  return (
    <div style={card}>
      <p style={label}>{title}</p>
      <p style={big}>{value}</p>
      {note ? <p style={{ ...label, marginTop: 4 }}>{note}</p> : null}
    </div>
  )
}

const HEALTH: Record<string, { color: string; text: string }> = {
  degraded: { color: '#b45309', text: '要確認' },
  down: { color: '#b91c1c', text: '障害' },
  ok: { color: '#15803d', text: '正常' },
}

const CHECKS: Array<{ hint: string; key: keyof OpsConfig; title: string }> = [
  {
    hint: 'CONTACT_* とSESの設定で、管理者へのメール通知が有効になります。',
    key: 'mail',
    title: '管理者へのメール通知',
  },
  { hint: 'CONTACT_AUTOREPLY=off で無効化できます。', key: 'autoreply', title: '受付確認メール' },
  {
    hint: 'CONTACT_ATTACH_* の環境変数が必要です。',
    key: 'attachmentsStorage',
    title: '添付ファイルの保管先',
  },
  {
    hint: 'Contact settings の「Allow file attachments」で有効にします。',
    key: 'attachmentsEnabled',
    title: '添付ファイル(CMSで有効)',
  },
  {
    hint: 'TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY(任意)。',
    key: 'turnstile',
    title: 'ボット対策(Turnstile)',
  },
  {
    hint: 'OPS_ALERT_WEBHOOK_URL を設定すると、失敗がDiscord/Slackに届きます。',
    key: 'alertWebhook',
    title: '失敗時のアラート通知',
  },
  {
    hint: 'OPS_HEALTH_TOKEN(24文字以上)を設定すると、ヘルスチェックの窓口が有効になります。定期チェックには GitHub の Secrets にも同じ値が必要です。',
    key: 'healthToken',
    title: 'ヘルスチェックの窓口(サーバー側)',
  },
  {
    hint: '確認後に RETENTION_PURGE_ENABLED=true で有効化します(未設定=削除しません)。',
    key: 'purgeEnabled',
    title: '保存期間を過ぎた問い合わせの削除許可(サーバー側)',
  },
]

/**
 * Operations overview on the admin home: inbox volume, notification health, attachments, setup
 * checklist and retention. Read-only, aggregated numbers only (no names, emails or messages).
 */
export async function OpsDashboard({ payload, user }: ServerProps) {
  if (!user) return null

  let stats: OpsStats | null = null
  try {
    stats = await collectOpsStats(payload, {
      retentionDays: resolveRetentionDays(process.env.CONTACT_RETENTION_DAYS),
    })
  } catch {
    stats = null
  }
  const config = await readOpsConfig(payload)
  const health = HEALTH[deriveHealth(stats)]

  return (
    <section aria-label="運用ダッシュボード" style={{ marginBottom: 32 }}>
      <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>運用ダッシュボード</h2>
        <span
          style={{
            background: health.color,
            borderRadius: 999,
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            padding: '2px 10px',
          }}
        >
          {health.text}
        </span>
      </div>

      {stats ? (
        <>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            }}
          >
            <Stat title="今日(24時間)の問い合わせ" value={stats.received.last24h} />
            <Stat title="直近7日" value={stats.received.last7d} />
            <Stat title="直近30日" value={stats.received.last30d} />
            <Stat title="累計" value={stats.received.total} />
            <Stat note="ステータスが New のもの" title="未対応" value={stats.unread} />
            <Stat
              note="直近30日(スキャン済みのみ保存)"
              title="添付つき"
              value={stats.withAttachments30d}
            />
          </div>

          <h3 style={{ margin: '20px 0 8px' }}>メール通知の状態(直近7日)</h3>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            }}
          >
            <Stat title="送信済み" value={stats.notification.sent} />
            <Stat title="失敗" value={stats.notification.failed} />
            <Stat
              note="タイムアウト。メールボックスで確認"
              title="不明"
              value={stats.notification.unknown}
            />
            <Stat note="メール通知が未設定" title="スキップ" value={stats.notification.skipped} />
            <Stat note="15分以上" title="送信待ち" value={stats.notification.stuckPending} />
          </div>

          {stats.latestFailures.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <p style={{ ...label, marginBottom: 6 }}>
                直近の通知エラー(問い合わせ自体は保存されています)
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {stats.latestFailures.map((failure) => (
                  <li key={String(failure.id)}>
                    <a href={`/admin/collections/contact-submissions/${failure.id}`}>
                      {failure.createdAt.slice(0, 16).replace('T', ' ')} UTC
                    </a>{' '}
                    ・{failure.category} ・{failure.state}
                    {failure.error ? ` ・${failure.error}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <h3 style={{ margin: '20px 0 8px' }}>
            保存期間(最後の更新から {stats.retention.days} 日)
          </h3>
          <p style={{ margin: 0 }}>
            期間を過ぎた対応済みの問い合わせ: <strong>{stats.retention.eligible}</strong> 件
            {config.purgeEnabled
              ? '(サーバー側の削除許可はオン。実際の削除は毎週の定期実行で RETENTION_APPLY=true のときだけ行われます)'
              : '(削除は許可されていません。削除されません)'}
            ／ 期間を過ぎても未対応(New): <strong>{stats.retention.staleUnhandled}</strong> 件
            (未対応は削除されません)
          </p>
        </>
      ) : (
        <p style={{ color: '#b91c1c' }}>
          統計を取得できませんでした。データベースの状態を確認してください。
        </p>
      )}

      <h3 style={{ margin: '20px 0 8px' }}>設定チェック</h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {CHECKS.map((check) => (
          <li key={check.key} style={{ margin: '4px 0' }}>
            <span aria-hidden="true" style={{ color: config[check.key] ? '#15803d' : '#b45309' }}>
              {config[check.key] ? '✓' : '○'}
            </span>{' '}
            {check.title}
            {config[check.key] ? (
              ''
            ) : (
              <span style={{ color: 'var(--theme-elevation-600)' }}> — {check.hint}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
