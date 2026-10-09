'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { PublicAttachmentPolicy } from '@/contact/attachments/policy'

type ItemStatus = 'checking' | 'uploading' | 'scanning' | 'clean' | 'rejected' | 'error'

type Item = {
  localId: string
  message?: string
  name: string
  size: number
  status: ItemStatus
  token?: string
}

type Props = {
  disabled?: boolean
  onChange: (state: { busy: boolean; tokens: string[] }) => void
}

const SCAN_POLL_DELAYS_MS = [1_500, 2_000, 2_500, 3_000]
const SCAN_TIMEOUT_MS = 120_000

const REJECTION_MESSAGES: Record<string, string> = {
  malware_detected: 'ウイルスの疑いがあるため添付できません。',
  office_active_content: 'マクロや埋め込みオブジェクトを含むファイルは添付できません。',
  office_external_reference: '外部テンプレートや外部参照を含むファイルは添付できません。',
  office_macro: 'マクロを含むファイルは添付できません。',
  pdf_active_content: 'スクリプトや自動実行を含むPDFは添付できません。',
  scan_failed: 'スキャンを完了できませんでした。別のファイルでお試しください。',
  size_mismatch: 'ファイルが正しくアップロードされませんでした。',
  type_mismatch: 'ファイルの中身が選択した形式と一致しません。',
}

const INIT_MESSAGES: Record<string, string> = {
  disabled: '現在、添付ファイルは受け付けていません。',
  invalid_size: 'ファイルサイズを確認してください。',
  rate_limited: '短時間に操作が集中しています。少し待ってからお試しください。',
  too_large: 'ファイルが大きすぎます。',
  type_not_allowed: 'この形式のファイルは添付できません。',
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  checking: '確認中…',
  clean: '安全を確認済み',
  error: 'エラー',
  rejected: '添付できません',
  scanning: 'ウイルススキャン中…',
  uploading: 'アップロード中…',
}

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('aborted', 'AbortError'))
      },
      { once: true },
    )
  })

async function postJson(url: string, body: unknown, signal: AbortSignal) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  })
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  return { payload, status: response.status }
}

export function ContactAttachments({ disabled = false, onChange }: Props) {
  const [policy, setPolicy] = useState<PublicAttachmentPolicy | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [announcement, setAnnouncement] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const controllers = useRef(new Map<string, AbortController>())
  const itemsRef = useRef<Item[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/contact/attachments/policy')
      .then((response) => (response.ok ? response.json() : null))
      .then((value: PublicAttachmentPolicy | null) => {
        if (!cancelled && value?.enabled) setPolicy(value)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const active = controllers.current
    return () => active.forEach((controller) => controller.abort())
  }, [])

  const update = useCallback((localId: string, patch: Partial<Item>) => {
    setItems((current) => {
      const next = current.map((item) => (item.localId === localId ? { ...item, ...patch } : item))
      itemsRef.current = next
      return next
    })
    if (patch.message) setAnnouncement(patch.message)
    else if (patch.status) setAnnouncement(STATUS_LABEL[patch.status])
  }, [])

  useEffect(() => {
    onChange({
      busy: items.some((item) => ['checking', 'uploading', 'scanning'].includes(item.status)),
      tokens: items.flatMap((item) => (item.status === 'clean' && item.token ? [item.token] : [])),
    })
  }, [items, onChange])

  const processFile = useCallback(
    async (localId: string, file: File, mime: string, signal: AbortSignal) => {
      try {
        const init = await postJson(
          '/api/contact/attachments',
          { name: file.name, size: file.size, type: mime },
          signal,
        )
        if (init.status !== 201) {
          const code = String(init.payload.code ?? '')
          update(localId, {
            message: INIT_MESSAGES[code] ?? 'アップロードを開始できませんでした。',
            status: 'rejected',
          })
          return
        }

        const upload = init.payload.upload as { fields: Record<string, string>; url: string }
        const form = new FormData()
        Object.entries(upload.fields).forEach(([key, value]) => form.append(key, value))
        form.append('file', file) // S3 requires the file to be the last field.

        update(localId, { status: 'uploading' })
        const stored = await fetch(upload.url, { body: form, method: 'POST', signal })
        if (!stored.ok) {
          update(localId, { message: 'アップロードに失敗しました。', status: 'error' })
          return
        }

        update(localId, { status: 'scanning' })
        const startedAt = Date.now()
        for (let attempt = 0; Date.now() - startedAt < SCAN_TIMEOUT_MS; attempt += 1) {
          await sleep(
            SCAN_POLL_DELAYS_MS[Math.min(attempt, SCAN_POLL_DELAYS_MS.length - 1)],
            signal,
          )
          const result = await postJson(
            '/api/contact/attachments/finalize',
            { uploadToken: init.payload.uploadToken },
            signal,
          )

          if (result.status === 200 && result.payload.status === 'clean') {
            update(localId, {
              message: `${file.name}: 安全を確認しました`,
              status: 'clean',
              token: String(result.payload.attachmentToken),
            })
            return
          }
          if (result.status === 422) {
            update(localId, {
              message:
                REJECTION_MESSAGES[String(result.payload.reason)] ??
                'このファイルは添付できません。',
              status: 'rejected',
            })
            return
          }
          if (result.status >= 400) {
            update(localId, { message: 'スキャン結果を確認できませんでした。', status: 'error' })
            return
          }
        }
        update(localId, {
          message: 'スキャンに時間がかかっています。削除して再度お試しください。',
          status: 'error',
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        update(localId, { message: '通信に失敗しました。', status: 'error' })
      } finally {
        controllers.current.delete(localId)
      }
    },
    [update],
  )

  const addFiles = (files: FileList | null) => {
    if (!policy || !files) return

    const added: Item[] = []
    let count = itemsRef.current.filter(
      (item) => item.status !== 'rejected' && item.status !== 'error',
    ).length
    let total = itemsRef.current
      .filter((item) => item.status !== 'rejected' && item.status !== 'error')
      .reduce((sum, item) => sum + item.size, 0)

    for (const file of Array.from(files)) {
      const localId = crypto.randomUUID()
      // Match by extension only: browsers often report an empty/generic MIME for csv/md. This is a
      // convenience check; the server verifies the real bytes and the declared MIME we send.
      const type = policy.types.find((candidate) =>
        candidate.extensions.includes(extensionOf(file.name)),
      )
      const base = { localId, name: file.name, size: file.size }

      if (!type) {
        added.push({ ...base, message: 'この形式のファイルは添付できません。', status: 'rejected' })
      } else if (file.size < 1 || file.size > policy.maxFileBytes) {
        added.push({
          ...base,
          message: `1ファイル${formatBytes(policy.maxFileBytes)}以内にしてください。`,
          status: 'rejected',
        })
      } else if (count >= policy.maxFiles) {
        added.push({
          ...base,
          message: `添付は${policy.maxFiles}ファイルまでです。`,
          status: 'rejected',
        })
      } else if (total + file.size > policy.maxTotalBytes) {
        added.push({
          ...base,
          message: `合計${formatBytes(policy.maxTotalBytes)}以内にしてください。`,
          status: 'rejected',
        })
      } else {
        count += 1
        total += file.size
        added.push({ ...base, status: 'checking' })
        const controller = new AbortController()
        controllers.current.set(localId, controller)
        void processFile(localId, file, type.mime, controller.signal)
      }
    }

    const next = [...itemsRef.current, ...added]
    itemsRef.current = next
    setItems(next)
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (localId: string) => {
    controllers.current.get(localId)?.abort()
    controllers.current.delete(localId)
    const next = itemsRef.current.filter((item) => item.localId !== localId)
    itemsRef.current = next
    setItems(next)
  }

  if (!policy) return null

  const extensions = Array.from(new Set(policy.types.flatMap((type) => type.extensions)))

  return (
    <fieldset className="contact-attachments" disabled={disabled}>
      <legend>ファイルを添付（任意）</legend>

      <div className="contact-attachments-picker">
        <label className="contact-attachments-button" htmlFor="contact-attachments-input">
          ファイルを選択
        </label>
        <input
          accept={extensions.map((extension) => `.${extension}`).join(',')}
          className="contact-attachments-input"
          id="contact-attachments-input"
          multiple
          onChange={(event) => addFiles(event.target.files)}
          ref={inputRef}
          type="file"
        />
        <p id="contact-attachments-hint">
          対応形式: {extensions.join(' / ')}・1ファイル{formatBytes(policy.maxFileBytes)}まで・最大
          {policy.maxFiles}ファイル（合計{formatBytes(policy.maxTotalBytes)}）。
          選んだファイルは専用の隔離領域でウイルススキャンされ、安全が確認されたものだけが添付されます。
        </p>
      </div>

      {items.length > 0 ? (
        <ul className="contact-attachments-list">
          {items.map((item) => (
            <li
              className={`contact-attachment contact-attachment-${item.status}`}
              key={item.localId}
            >
              <div>
                <strong>{item.name}</strong>
                <small>{formatBytes(item.size)}</small>
              </div>
              <span>
                {item.status === 'rejected' || item.status === 'error'
                  ? item.message
                  : STATUS_LABEL[item.status]}
              </span>
              <button
                aria-label={`${item.name} を削除`}
                onClick={() => remove(item.localId)}
                type="button"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p aria-live="polite" className="contact-visually-hidden" role="status">
        {announcement}
      </p>
    </fieldset>
  )
}
