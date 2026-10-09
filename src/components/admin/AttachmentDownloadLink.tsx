'use client'

import { useFormFields } from '@payloadcms/ui'

type Props = { path?: string }

function formatBytes(value: unknown) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * One-click download for an attachment row in the Inbox. Every stored attachment already passed the
 * malware scan and content checks. The route redirects to a 60-second signed URL that forces a
 * download and requires an admin session.
 */
export function AttachmentDownloadLink({ path }: Props) {
  const rowPath = path ? path.replace(/\.[^.]+$/, '') : ''
  const id = useFormFields(([fields]) => fields[`${rowPath}.id`]?.value)
  const filename = useFormFields(([fields]) => fields[`${rowPath}.filename`]?.value)
  const size = useFormFields(([fields]) => fields[`${rowPath}.size`]?.value)

  if (!id) {
    return <p style={{ opacity: 0.7 }}>保存後にダウンロードできます。</p>
  }

  return (
    <p style={{ margin: '0 0 16px' }}>
      <a
        download
        href={`/api/contact/attachments/download?row=${encodeURIComponent(String(id))}`}
        rel="noreferrer"
        style={{ fontWeight: 700 }}
      >
        ⬇ {String(filename ?? 'ダウンロード')} をダウンロード
      </a>{' '}
      <small style={{ opacity: 0.7 }}>
        {formatBytes(size)}・ウイルススキャン済み・リンクは60秒で失効します
      </small>
    </p>
  )
}
