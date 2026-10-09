'use client'

import { useFormFields } from '@payloadcms/ui'

function formatBytes(value: unknown) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

type Row = { filename: string; id: string; size: unknown }

/**
 * One-click downloads for the attachments of a submission. Every stored attachment already passed the
 * malware scan and content checks. The route redirects to a 60-second signed URL that forces a
 * download and requires an admin session.
 */
export function AttachmentDownloads() {
  const rows = useFormFields(([fields]) => {
    const list =
      (fields['attachments'] as { rows?: Array<{ id?: string }> } | undefined)?.rows ?? []
    return list.flatMap((row, index): Row[] => {
      const id = (fields[`attachments.${index}.id`]?.value as string | undefined) ?? row.id
      if (!id) return []
      return [
        {
          filename: String(fields[`attachments.${index}.filename`]?.value ?? 'attachment'),
          id,
          size: fields[`attachments.${index}.size`]?.value,
        },
      ]
    })
  })

  if (rows.length === 0) return null

  return (
    <div style={{ margin: '0 0 24px' }}>
      <p style={{ fontWeight: 700, margin: '0 0 8px' }}>Attachments (scanned, download)</p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((row) => (
          <li key={row.id} style={{ margin: '0 0 6px' }}>
            <a
              download
              href={`/api/contact/attachments/download?row=${encodeURIComponent(row.id)}`}
              rel="noreferrer"
              style={{ fontWeight: 700 }}
            >
              ⬇ {row.filename}
            </a>{' '}
            <small style={{ opacity: 0.7 }}>
              {formatBytes(row.size)} · ウイルススキャン済み · リンクは60秒で失効します
            </small>
          </li>
        ))}
      </ul>
    </div>
  )
}
