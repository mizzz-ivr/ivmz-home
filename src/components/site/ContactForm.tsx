'use client'

import { useRef, useState } from 'react'

import type { ContactField, ContactValidationErrors } from '@/contact/schema'

const categories = [
  ['personal', 'General / Personal'],
  ['development', 'Technical / OSS / Development'],
  ['job', 'Job / Work'],
  ['collaboration', 'Collaboration'],
  ['media', 'Media / Interview'],
  ['community', 'ivRooom / Community'],
  ['team', 'ivRooom / Team'],
  ['security', 'Security'],
] as const

type SubmitState = 'idle' | 'submitting' | 'success' | 'preview' | 'error'

type ContactResponse = {
  code?: string
  errors?: ContactValidationErrors
  mode?: 'preview' | 'sent'
  ok?: boolean
  requestId?: string
}

type ContactFormProps = {
  generalEmail: string
  securityEmail: string
}

export function ContactForm({ generalEmail, securityEmail }: ContactFormProps) {
  const feedbackRef = useRef<HTMLDivElement>(null)
  // Idempotency key: kept across failed retries of the same content, dropped when the content changes.
  const attemptIdRef = useRef<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ContactValidationErrors>({})
  const [state, setState] = useState<SubmitState>('idle')

  const focusFeedback = () => {
    requestAnimationFrame(() => feedbackRef.current?.focus())
  }

  const clearFieldError = (field: ContactField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (state === 'submitting') return

    const form = event.currentTarget
    const formData = new FormData(form)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    setFieldErrors({})
    setState('submitting')
    attemptIdRef.current ??= crypto.randomUUID()

    try {
      const response = await fetch('/api/contact', {
        body: JSON.stringify({
          category: formData.get('category'),
          email: formData.get('email'),
          message: formData.get('message'),
          name: formData.get('name'),
          requestId: attemptIdRef.current,
          subject: formData.get('subject'),
          website: formData.get('website'),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        signal: controller.signal,
      })

      const payload = (await response.json().catch(() => ({}))) as ContactResponse

      if (response.status === 422 && payload.errors) {
        setFieldErrors(payload.errors)
        setState('error')
        focusFeedback()
        return
      }

      if (!response.ok || !payload.ok) {
        setState('error')
        focusFeedback()
        return
      }

      if (payload.mode === 'preview') {
        setState('preview')
      } else {
        setState('success')
      }

      attemptIdRef.current = null
      form.reset()
      focusFeedback()
    } catch {
      setState('error')
      focusFeedback()
    } finally {
      clearTimeout(timeout)
    }
  }

  const feedback =
    state === 'success'
      ? '送信しました。返信が必要な場合は入力されたメールアドレスへ連絡します。'
      : state === 'preview'
        ? '送信内容を検証しました。Deploy Previewでは実メールは送信されません。'
        : state === 'error'
          ? '送信できませんでした。入力内容は残っています。時間を置いて再送するか、下記メールアドレスをご利用ください。'
          : ''

  return (
    <div className="contact-form-shell">
      <form
        className="contact-form"
        onChange={() => {
          attemptIdRef.current = null
        }}
        onSubmit={submit}
      >
        <div className="contact-field-grid">
          <div className="contact-field">
            <label htmlFor="contact-name">お名前</label>
            <input
              aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
              aria-invalid={Boolean(fieldErrors.name)}
              autoComplete="name"
              id="contact-name"
              maxLength={80}
              name="name"
              onChange={() => clearFieldError('name')}
              required
              type="text"
            />
            {fieldErrors.name ? (
              <p className="contact-field-error" id="contact-name-error">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div className="contact-field">
            <label htmlFor="contact-email">メールアドレス</label>
            <input
              aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
              id="contact-email"
              maxLength={254}
              name="email"
              onChange={() => clearFieldError('email')}
              required
              type="email"
            />
            {fieldErrors.email ? (
              <p className="contact-field-error" id="contact-email-error">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="contact-field">
          <label htmlFor="contact-category">カテゴリ</label>
          <select
            aria-describedby={fieldErrors.category ? 'contact-category-error' : undefined}
            aria-invalid={Boolean(fieldErrors.category)}
            defaultValue=""
            id="contact-category"
            name="category"
            onChange={() => clearFieldError('category')}
            required
          >
            <option disabled value="">
              選択してください
            </option>
            {categories.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {fieldErrors.category ? (
            <p className="contact-field-error" id="contact-category-error">
              {fieldErrors.category}
            </p>
          ) : null}
        </div>

        <div className="contact-field">
          <label htmlFor="contact-subject">件名</label>
          <input
            aria-describedby={fieldErrors.subject ? 'contact-subject-error' : undefined}
            aria-invalid={Boolean(fieldErrors.subject)}
            id="contact-subject"
            maxLength={160}
            name="subject"
            onChange={() => clearFieldError('subject')}
            required
            type="text"
          />
          {fieldErrors.subject ? (
            <p className="contact-field-error" id="contact-subject-error">
              {fieldErrors.subject}
            </p>
          ) : null}
        </div>

        <div className="contact-field">
          <label htmlFor="contact-message">問い合わせ内容</label>
          <textarea
            aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
            aria-invalid={Boolean(fieldErrors.message)}
            id="contact-message"
            maxLength={8000}
            name="message"
            onChange={() => clearFieldError('message')}
            required
            rows={9}
          />
          {fieldErrors.message ? (
            <p className="contact-field-error" id="contact-message-error">
              {fieldErrors.message}
            </p>
          ) : null}
        </div>

        <div aria-hidden="true" className="contact-honeypot">
          <label htmlFor="contact-website">Website</label>
          <input autoComplete="off" id="contact-website" name="website" tabIndex={-1} type="text" />
        </div>

        <div className="contact-submit-row">
          <button className="contact-submit" disabled={state === 'submitting'} type="submit">
            {state === 'submitting' ? 'Sending…' : 'Send message ↗'}
          </button>
          <p>配送先はカテゴリからserver-sideで決定され、入力内容から変更できません。</p>
        </div>
      </form>

      {feedback ? (
        <div
          className={`contact-feedback contact-feedback-${state}`}
          ref={feedbackRef}
          role={state === 'error' ? 'alert' : 'status'}
          tabIndex={-1}
        >
          {feedback}
        </div>
      ) : null}

      <div className="contact-form-fallback">
        <p>フォームを利用できない場合はメールでも受け付けています。</p>
        <p>
          General:{' '}
          <a className="inline-link" href={`mailto:${generalEmail}`}>
            {generalEmail}
          </a>
          <br />
          Security:{' '}
          <a className="inline-link" href={`mailto:${securityEmail}`}>
            {securityEmail}
          </a>
        </p>
      </div>
    </div>
  )
}
