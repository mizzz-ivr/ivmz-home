import { json, readGuardedJson } from '@/contact/attachments/http'
import { getAttachmentRuntime } from '@/contact/attachments/runtime'
import { finalizeUpload } from '@/contact/attachments/service'
import { scheduleOpsAlert } from '@/ops/schedule-alert'

export const runtime = 'nodejs'

/** Step 3 (polled): reports scan progress, and only on a clean + verified file returns the attachment token. */
export async function POST(request: Request) {
  const guarded = await readGuardedJson(request, { limit: 120, scope: 'attachments-finalize' })
  if (!guarded.ok) return guarded.response

  const attachments = await getAttachmentRuntime()
  if (!attachments) return json({ code: 'disabled', ok: false }, 403)

  try {
    const result = await finalizeUpload(attachments, guarded.body.uploadToken)
    if (result.status === 'invalid_token') return json({ code: 'invalid_token', ok: false }, 400)
    if (result.status === 'rejected') {
      if (result.reason === 'malware_detected' || result.reason === 'scan_failed') {
        scheduleOpsAlert({
          detail: '添付ファイルは保存されていません。',
          key: `attachment-${result.reason}`,
          severity: 'warning',
          title:
            result.reason === 'malware_detected'
              ? '添付ファイルでウイルスを検知しました'
              : '添付ファイルのスキャンが完了しませんでした',
        })
      }
      return json({ ok: false, reason: result.reason, status: 'rejected' }, 422)
    }
    if (result.status === 'clean') return json({ ok: true, ...result }, 200)
    return json({ ok: true, status: result.status }, 202)
  } catch (error) {
    console.error(
      'CONTACT_ATTACHMENT_FINALIZE_FAILED',
      JSON.stringify({ error: error instanceof Error ? error.name : 'UnknownError' }),
    )
    scheduleOpsAlert({
      detail:
        '添付ファイルのスキャン結果を取得できませんでした(AWSの設定や権限を確認してください)。',
      key: 'attachment-scan-unavailable',
      severity: 'warning',
      title: '添付ファイルのスキャンが利用できません',
    })
    return json({ code: 'scan_unavailable', ok: false }, 502)
  }
}
