'use client'

import { useRef, useState, type FormEvent } from 'react'

import {
  ANONYMOUS_MESSAGE_MAX_CHARACTERS,
  anonymousMessageCharacterCount,
  parseAnonymousMessageSubmission,
} from '@/messages/schema'

import { TurnstileWidget } from './TurnstileWidget'

type Phase = 'edit' | 'review' | 'submitting' | 'sent'
type MessageResponse = {
  code?: string
  errors?: { message?: string; requestId?: string }
  ok?: boolean
}

const failureText: Record<string, string> = {
  captcha_failed: 'ボット対策の確認に失敗しました。もう一度お試しください。',
  forbidden_origin: '安全確認に失敗しました。ページを再読み込みしてください。',
  idempotency_conflict: '別の文章との送信識別子が重複しました。内容を修正して再送してください。',
  rate_limited: '送信回数の上限に達しました。10分ほど時間をおいてからお試しください。',
  service_unavailable: '現在メッセージを受け付けられません。時間をおいてお試しください。',
}

export function AnonymousMessageForm({ siteKey }: { siteKey: string }) {
  const [message, setMessage] = useState('')
  const [draft, setDraft] = useState('')
  const [phase, setPhase] = useState<Phase>('edit')
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaKey, setCaptchaKey] = useState(0)
  const attemptId = useRef<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const reviewRef = useRef<HTMLElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)

  const count = anonymousMessageCharacterCount(message)
  const tooLong = count > ANONYMOUS_MESSAGE_MAX_CHARACTERS
  const preview = phase === 'review' || phase === 'submitting'

  function edit(next: string) {
    setMessage(next)
    setError('')
    attemptId.current = null
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sendingRef.current) return

    const result = parseAnonymousMessageSubmission({
      message,
      requestId: attemptId.current ?? crypto.randomUUID(),
    })
    if (result.kind !== 'valid') {
      setError(
        result.kind === 'invalid'
          ? (result.errors.message ?? '入力内容を確認してください。')
          : '入力内容を確認してください。',
      )
      return
    }

    setDraft(result.value.message)
    setError('')
    setPhase('review')
    requestAnimationFrame(() => reviewRef.current?.focus())
  }

  function backToEdit() {
    if (sendingRef.current) return
    setPhase('edit')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  async function send() {
    if (sendingRef.current || phase !== 'review' || !captchaToken) return
    sendingRef.current = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    const requestId = (attemptId.current ??= crypto.randomUUID())
    setError('')
    setPhase('submitting')

    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draft, requestId, turnstileToken: captchaToken, website: '' }),
        signal: controller.signal,
      })
      const result = (await response.json().catch(() => ({}))) as MessageResponse
      if (response.ok && result.ok) {
        attemptId.current = null
        setMessage('')
        setDraft('')
        setPhase('sent')
        requestAnimationFrame(() => feedbackRef.current?.focus())
      } else {
        if (response.status === 409) attemptId.current = null
        setError(
          (response.status === 422 && result.errors?.message) ||
            failureText[result.code ?? ''] ||
            '送信できませんでした。内容を残していますので、時間をおいて再送してください。',
        )
        setPhase('review')
        requestAnimationFrame(() => feedbackRef.current?.focus())
      }
    } catch {
      setError('通信が完了しませんでした。同じ内容のまま再送できます。')
      setPhase('review')
      requestAnimationFrame(() => feedbackRef.current?.focus())
    } finally {
      sendingRef.current = false
      clearTimeout(timeout)
      setCaptchaToken(null)
      setCaptchaKey((current) => current + 1)
    }
  }

  if (phase === 'sent') {
    return (
      <div className="message-result contact-feedback" ref={feedbackRef} role="status" tabIndex={-1}>
        <h3>受け付けました！</h3>
        <p>メッセージを預かりました。公開や返信は保証していません。</p>
        <button className="contact-review-back" type="button" onClick={() => setPhase('edit')}>
          別のひとことを書く →
        </button>
      </div>
    )
  }

  return (
    <div className="contact-form-shell message-form-shell">
      <form className="contact-form" hidden={preview} onSubmit={review}>
        <div className="contact-field">
          <label htmlFor="anonymous-message">メッセージ（匿名）</label>
          <textarea
            ref={textareaRef}
            id="anonymous-message"
            name="message"
            rows={7}
            value={message}
            onChange={(event) => edit(event.target.value)}
            aria-describedby="anonymous-message-hint anonymous-message-counter"
            aria-invalid={tooLong || Boolean(error)}
            required
            placeholder="感想、応援、気になることなど、お気軽にどうぞ。"
          />
          <div className="message-field-meta">
            <p id="anonymous-message-hint">名前や連絡先は入力不要です。個人情報や秘密情報は送らないでください。</p>
            <output
              id="anonymous-message-counter"
              aria-live="polite"
              className={tooLong ? 'message-count-over' : undefined}
            >
              {count} / {ANONYMOUS_MESSAGE_MAX_CHARACTERS}文字
            </output>
          </div>
          {tooLong ? <p className="contact-field-error" role="alert">300文字以内にしてください。</p> : null}
        </div>
        <div className="contact-honeypot" aria-hidden="true">
          <label htmlFor="anonymous-website">Website</label>
          <input id="anonymous-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="contact-submit-row">
          <button className="contact-submit" type="submit" disabled={tooLong || !message.trim()}>
            内容を確認する ↗
          </button>
          <p>メッセージは管理者が確認します。自動的に公開されることはありません。</p>
        </div>
      </form>

      {preview ? (
        <section className="contact-review" aria-labelledby="anonymous-review-title" ref={reviewRef} tabIndex={-1}>
          <h3 id="anonymous-review-title">送信前の確認</h3>
          <p>こちらの文章を匿名で送信します。内容に問題がなければ送信してください。</p>
          <p className="message-review-text">{draft}</p>
          <TurnstileWidget key={captchaKey} siteKey={siteKey} onToken={setCaptchaToken} />
          <div className="contact-submit-row">
            <button
              type="button"
              className="contact-review-back"
              disabled={phase === 'submitting'}
              onClick={backToEdit}
            >
              ← 修正する
            </button>
            <button
              type="button"
              className="contact-submit"
              disabled={phase === 'submitting' || !captchaToken}
              onClick={send}
            >
              {phase === 'submitting' ? '送信中…' : '匿名で送信する →'}
            </button>
          </div>
        </section>
      ) : null}

      {error ? (
        <div
          ref={feedbackRef}
          className="contact-feedback contact-feedback-error"
          role="alert"
          tabIndex={-1}
        >
          {error}
        </div>
      ) : null}
    </div>
  )
}
