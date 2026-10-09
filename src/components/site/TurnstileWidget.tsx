'use client'

import { useEffect, useRef, useState } from 'react'

type TurnstileApi = {
  remove: (widgetId: string) => void
  render: (
    element: HTMLElement,
    options: {
      'error-callback': () => void
      'expired-callback': () => void
      callback: (token: string) => void
      language: string
      sitekey: string
    },
  ) => string
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_ID = 'cf-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadTurnstile(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile)

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')),
    )
    script.addEventListener('error', () => reject(new Error('turnstile failed to load')))
  })
}

/** Renders the Cloudflare Turnstile challenge and reports the single-use token (null when unavailable). */
export function TurnstileWidget({
  onToken,
  siteKey,
}: {
  onToken: (token: string | null) => void
  siteKey: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    let cancelled = false
    let widgetId: string | undefined
    const report = (token: string | null) => onTokenRef.current(token)

    loadTurnstile()
      .then((api) => {
        if (cancelled || !ref.current) return
        widgetId = api.render(ref.current, {
          callback: (token) => report(token),
          'error-callback': () => report(null),
          'expired-callback': () => report(null),
          language: 'ja',
          sitekey: siteKey,
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
        report(null)
      })

    return () => {
      cancelled = true
      if (widgetId) window.turnstile?.remove(widgetId)
      report(null)
    }
  }, [siteKey])

  return (
    <div className="contact-captcha">
      <div ref={ref} />
      {failed ? (
        <p role="alert">
          ボット対策の読み込みに失敗しました。ページを再読み込みするか、下記のメールをご利用ください。
        </p>
      ) : null}
    </div>
  )
}
