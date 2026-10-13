import { hasValidOpsToken } from '@/ops/auth'
import { sendOpsAlert } from '@/ops/alert'
import { readOpsConfig } from '@/ops/config'
import { resolveRetentionDays } from '@/ops/retention'
import { collectOpsStats, deriveHealth, type OpsStats } from '@/ops/stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'no-store' }

/**
 * Machine-readable health report for the scheduled check (GitHub Actions). Token protected, and
 * disabled entirely until OPS_HEALTH_TOKEN is set. The body has numbers only, no personal data.
 */
export async function GET(request: Request) {
  if (!process.env.OPS_HEALTH_TOKEN) return new Response(null, { headers, status: 404 })
  if (!hasValidOpsToken(request)) return new Response(null, { headers, status: 401 })

  let stats: OpsStats | null = null
  let config = null
  try {
    const [{ getPayload }, { default: payloadConfig }] = await Promise.all([
      import('payload'),
      import('@/payload.config'),
    ])
    const payload = await getPayload({ config: payloadConfig })
    stats = await collectOpsStats(payload, {
      retentionDays: resolveRetentionDays(process.env.CONTACT_RETENTION_DAYS),
    })
    config = await readOpsConfig(payload)
  } catch (error) {
    console.error(
      'OPS_HEALTH_FAILED',
      JSON.stringify({ error: error instanceof Error ? error.name : 'UnknownError' }),
    )
  }

  const status = deriveHealth(stats)
  if (status !== 'ok') {
    const detail = stats
      ? `通知の失敗(24時間): ${stats.failures24h}件 / 送信待ちのまま: ${stats.notification.stuckPending}件`
      : 'データベースに接続できません。'
    await sendOpsAlert({
      detail,
      key: `health-${status}`,
      severity: status === 'down' ? 'critical' : 'warning',
      title:
        status === 'down' ? 'サイトのヘルスチェックに失敗しました' : 'サイトの状態に注意が必要です',
    })
  }

  return Response.json(
    {
      checkedAt: new Date().toISOString(),
      config,
      stats,
      status,
    },
    { headers, status: status === 'down' ? 503 : 200 },
  )
}
