'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ANALYTICS_CHOICE_KEY, isTrackablePath, parseMeasurementId } from '@/lib/analytics'

const MEASUREMENT_ID = parseMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
const OPEN_SETTINGS_EVENT = 'ivmz:analytics-settings'

type Choice = 'accepted' | 'declined' | 'undecided'
type AnalyticsWindow = Window & {
  dataLayer?: unknown[][]
  gtag?: (...args: unknown[]) => void
}

function readChoice(): Choice {
  try {
    const saved = window.localStorage.getItem(ANALYTICS_CHOICE_KEY)
    return saved === 'accepted' || saved === 'declined' ? saved : 'undecided'
  } catch {
    return 'undecided'
  }
}

/** Load the third-party tag only after explicit opt-in. No cookieless pings before consent. */
function loadGoogleTag(id: string) {
  const analytics = window as AnalyticsWindow
  if (document.getElementById('ivmz-ga4-script')) return

  analytics.dataLayer = analytics.dataLayer ?? []
  analytics.gtag = (...args: unknown[]) => {
    analytics.dataLayer?.push(args)
  }
  analytics.gtag('js', new Date())
  analytics.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  })
  analytics.gtag('config', id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    anonymize_ip: true,
  })

  const script = document.createElement('script')
  script.id = 'ivmz-ga4-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(script)
}

/** A visible footer action lets visitors change their earlier choice at any time. */
export function AnalyticsSettingsButton() {
  if (!MEASUREMENT_ID) return null

  return (
    <button
      type="button"
      className="analytics-preference"
      onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
    >
      アクセス解析の設定
    </button>
  )
}

export function AnalyticsConsent() {
  const pathname = usePathname()
  const [choice, setChoice] = useState<Choice | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (MEASUREMENT_ID) setChoice(readChoice())
  }, [])

  useEffect(() => {
    if (!MEASUREMENT_ID) return
    const open = () => setSettingsOpen(true)
    window.addEventListener(OPEN_SETTINGS_EVENT, open)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open)
  }, [])

  useEffect(() => {
    if (!MEASUREMENT_ID || choice !== 'accepted' || !isTrackablePath(pathname)) return

    loadGoogleTag(MEASUREMENT_ID)
    const analytics = window as AnalyticsWindow
    // Do not send the full URL: query parameters may contain private information.
    analytics.gtag?.('event', 'page_view', {
      page_location: window.location.origin + pathname,
      page_path: pathname,
      page_title: document.title,
    })
  }, [choice, pathname])

  if (!MEASUREMENT_ID || choice === null || (choice !== 'undecided' && !settingsOpen)) {
    return null
  }

  const decide = (next: Exclude<Choice, 'undecided'>) => {
    const previous = choice
    try {
      window.localStorage.setItem(ANALYTICS_CHOICE_KEY, next)
    } catch {
      // A decision without local storage applies for this page only.
    }
    setChoice(next)
    setSettingsOpen(false)

    if (previous === 'accepted' && next === 'declined') {
      // Reset the loaded analytics tag. On the next page, no Google scripts are loaded.
      window.location.reload()
    }
  }

  return (
    <section
      className="analytics-consent"
      role="dialog"
      aria-modal="false"
      aria-label="アクセス解析への同意"
    >
      <div>
        <strong>サイトの改善にご協力ください ✦</strong>
        <p>
          同意された場合のみGoogle Analyticsで閲覧状況を集計します。
          メッセージ内容やお問い合わせ情報は送りません。
          <a href="/legal/privacy">プライバシーポリシー</a>
        </p>
      </div>
      <div className="analytics-consent-actions">
        <button type="button" onClick={() => decide('declined')}>
          同意しない
        </button>
        <button type="button" className="analytics-consent-accept" onClick={() => decide('accepted')}>
          同意する
        </button>
      </div>
    </section>
  )
}
