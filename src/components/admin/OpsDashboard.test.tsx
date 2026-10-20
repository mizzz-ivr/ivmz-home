import type { ServerProps } from 'payload'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { readOpsConfig, type OpsConfig } from '@/ops/config'
import { collectOpsStats, type OpsStats } from '@/ops/stats'

import { OpsDashboard } from './OpsDashboard'

vi.mock('@/ops/config', () => ({ readOpsConfig: vi.fn() }))
vi.mock('@/ops/stats', () => ({
  collectOpsStats: vi.fn(),
  deriveHealth: () => 'ok',
}))

const stats: OpsStats = {
  checkedAt: '2026-10-20T00:00:00.000Z',
  databaseLatencyMs: 10,
  failures24h: 0,
  latestFailures: [],
  notification: { failed: 0, sent: 0, skipped: 0, stuckPending: 0, unknown: 0 },
  received: { last24h: 0, last30d: 0, last7d: 0, total: 4 },
  retention: { days: 365, eligible: 2, staleUnhandled: 1, withAttachments: 1 },
  unread: 1,
  withAttachments30d: 0,
}

const config: OpsConfig = {
  alertWebhook: false,
  attachmentsEnabled: false,
  attachmentsStorage: false,
  autoreply: false,
  healthToken: false,
  mail: false,
  purgeEnabled: false,
  turnstile: false,
}

async function renderDashboard(purgeEnabled: boolean) {
  vi.mocked(collectOpsStats).mockResolvedValue(stats)
  vi.mocked(readOpsConfig).mockResolvedValue({ ...config, purgeEnabled })
  const element = await OpsDashboard({ user: { id: 1 } } as unknown as ServerProps)
  return renderToStaticMarkup(element)
}

describe('OpsDashboard retention display', () => {
  it('reports dry-run only and the disabled manual deletion path', async () => {
    const markup = await renderDashboard(false)
    expect(markup).toContain('最終更新から期間を過ぎた対応済み')
    expect(markup).toContain('上記のうち添付参照あり（安全なDB/S3整合削除が必要）')
    expect(markup).toContain('添付参照ありはS3実体が残っている件数ではありません')
    expect(markup).toContain('期間を過ぎても未対応(New)')
    expect(markup).toContain('未対応(New)は受付日時（作成日）')
    expect(markup).toContain('最後のやり取り')
    expect(markup).toContain('週次ジョブ・直接APIともに件数確認（dry-run）のみ')
    expect(markup).toContain('apply: trueによる削除はコード側で拒否（HTTP 403）')
    expect(markup).not.toContain('RETENTION_APPLY=true')
    expect(markup).not.toContain('role="alert"')
  })

  it('warns about a legacy deletion flag despite the hard server-side block', async () => {
    const markup = await renderDashboard(true)
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('RETENTION_PURGE_ENABLED=true')
    expect(markup).toContain('apply: trueによる削除をHTTP 403で拒否')
    expect(markup).toContain('S3添付との削除整合')
    expect(markup).not.toContain('RETENTION_APPLY=true')
  })

  it('keeps the purge warning visible when database statistics fail', async () => {
    vi.mocked(collectOpsStats).mockRejectedValue(new Error('Database unavailable'))
    vi.mocked(readOpsConfig).mockResolvedValue({ ...config, purgeEnabled: true })
    const element = await OpsDashboard({ user: { id: 1 } } as unknown as ServerProps)
    const markup = renderToStaticMarkup(element)
    expect(markup).toContain('統計を取得できませんでした')
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('RETENTION_PURGE_ENABLED=true')
    expect(markup).not.toContain('Database unavailable')
  })
})
