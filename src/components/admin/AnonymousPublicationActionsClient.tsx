'use client'

import { useDocumentInfo, useFormModified, useFormProcessing } from '@payloadcms/ui'
import { useRef, useState } from 'react'

type Action = 'publish' | 'unpublish'
type PublicationResponse = { code?: string; ok?: boolean; publicId?: string }

const errors: Record<string, string> = {
  already_public: 'この投稿はすでに公開済みです。画面を再読み込みしてください。',
  forbidden: '公開操作の権限がありません。',
  forbidden_origin: '画面の接続元を確認できません。ページを再読み込みしてください。',
  not_enabled: '公開承認機能は運用設定で無効化されています。',
  not_found: '対象の投稿が見つかりません。画面を再読み込みしてください。',
  not_public: 'この投稿は非公開です。画面を再読み込みしてください。',
  reply_not_ready: '保存済みの返信とステータスを確認してください。',
  service_unavailable: '処理を完了できませんでした。再読み込みして状態を確認してください。',
  unauthorized: '管理者の認証が切れています。再度ログインしてください。',
}

export function AnonymousPublicationActionsClient({ enabled }: { enabled: boolean }) {
  const { collectionSlug, data, id } = useDocumentInfo()
  const modified = useFormModified()
  const processing = useFormProcessing()
  const [confirmAction, setConfirmAction] = useState<Action | null>(null)
  const [message, setMessage] = useState('')
  const [completed, setCompleted] = useState(false)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  const messageId = typeof id === 'number' ? id : Number(id)
  const hasId = Number.isSafeInteger(messageId) && messageId > 0
  if (collectionSlug !== 'anonymous-messages' || !hasId) return null

  const isPublic = data?.isPublic === true
  const status = data?.status
  const reply = typeof data?.reply === 'string' ? data.reply.trim() : ''
  const content = typeof data?.message === 'string' ? data.message.trim() : ''
  const canPublish = status === 'replied' && Boolean(reply && content)
  const blocked = Boolean(modified || processing || busy || completed)
  const action: Action = isPublic ? 'unpublish' : 'publish'
  const ready = enabled && !blocked && (isPublic || canPublish)
  const isConfirming = confirmAction === action

  async function apply() {
    if (!ready || !isConfirming || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setMessage('')

    try {
      const response = await fetch('/api/message/admin/publication', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, action }),
      })
      const result = (await response.json().catch(() => ({}))) as PublicationResponse
      if (!response.ok || result.ok !== true) {
        setMessage(
          errors[result.code ?? ''] ?? '操作に失敗しました。再読み込みして状態を確認してください。',
        )
        setConfirmAction(null)
        return
      }
      setCompleted(true)
      setConfirmAction(null)
      setMessage(
        action === 'publish'
          ? '公開を承認し、監査履歴に記録しました。最新状態を再読み込みしてください。'
          : '公開を取り下げ、監査履歴に記録しました。共有IDは無効になりました。',
      )
    } catch {
      setMessage(
        '通信が中断されました。処理済みの可能性があります。再読み込みして確認してください。',
      )
      setConfirmAction(null)
      setCompleted(true)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <section
      aria-label="匿名メッセージの公開管理"
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 8,
        margin: '0 0 24px',
        padding: 16,
      }}
    >
      <h3 style={{ margin: '0 0 8px' }}>公開承認・取り下げ</h3>
      <p style={{ margin: '0 0 8px' }}>
        現在の保存状態：<strong>{isPublic ? '公開中' : '非公開'}</strong>
      </p>
      {!enabled ? (
        <p role="status">公開操作は準備中です。管理者の運用設定が有効になるまで利用できません。</p>
      ) : (
        <>
          <p style={{ fontSize: 13, margin: '0 0 12px' }}>
            {isPublic
              ? '取り下げると共有IDが無効になります。再公開する場合は新しいIDが発行されます。'
              : '返信を保存し、ステータスを「Replied」にしたあとで承認できます。送信者へ通知はしません。'}
          </p>
          {modified || processing ? (
            <p role="status">
              未保存の編集があります。先に変更を保存してから承認・取り下げしてください。
            </p>
          ) : null}
          {!isPublic && !canPublish ? (
            <p role="status">承認には投稿本文・保存済みの返信・Repliedステータスが必要です。</p>
          ) : null}
          {isConfirming && !completed ? (
            <div>
              <p style={{ fontWeight: 700 }}>
                {action === 'publish'
                  ? 'この投稿と返信を公開してよろしいですか？'
                  : 'この投稿の公開を取り下げてよろしいですか？'}
              </p>
              {action === 'publish' ? (
                <>
                  <p style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                    投稿：{content}
                  </p>
                  <p style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>返信：{reply}</p>
                </>
              ) : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                <button disabled={!ready} onClick={apply} style={{ minHeight: 44 }} type="button">
                  {busy
                    ? '処理中…'
                    : action === 'publish'
                      ? '公開を確定する'
                      : '取り下げを確定する'}
                </button>
                <button
                  disabled={busy}
                  onClick={() => setConfirmAction(null)}
                  style={{ minHeight: 44 }}
                  type="button"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              disabled={!ready}
              onClick={() => {
                setMessage('')
                setConfirmAction(action)
              }}
              style={{ minHeight: 44 }}
              type="button"
            >
              {isPublic ? '公開を取り下げる' : '公開を承認する'}
            </button>
          )}
        </>
      )}
      {message ? (
        <p role="status" style={{ margin: '12px 0 0' }}>
          {message}
        </p>
      ) : null}
      {completed ? (
        <a
          href={`/admin/collections/anonymous-messages/${encodeURIComponent(String(messageId))}`}
          style={{ display: 'inline-block', marginTop: 12 }}
        >
          最新の保存状態を再読み込み →
        </a>
      ) : null}
    </section>
  )
}
