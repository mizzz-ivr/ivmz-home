import Image from 'next/image'
import type { ReactNode } from 'react'

import { site } from '@/lib/site'

type ErrorScreenProps = {
  /** Status shown as the big number, for example 404 or 500. */
  code: string
  /** Short mono label after the code in the eyebrow. */
  label: string
  /** The page's h1. */
  title: string
  message: ReactNode
  /** Speech bubble next to the character. */
  bubble: string
  /** Primary actions (links or buttons). */
  actions: ReactNode
}

const quickLinks = [
  { href: '/', label: 'HOME', note: 'トップへ' },
  { href: '/works', label: 'WORKS', note: '制作物' },
  { href: '/about', label: 'ABOUT', note: 'プロフィール' },
  { href: '/contact', label: 'CONTACT', note: 'ご相談' },
] as const

/** Shared screen for HTTP errors (404, 500, ...): big status code, character and ways back. */
export function ErrorScreen({ code, label, title, message, bubble, actions }: ErrorScreenProps) {
  return (
    <main id="main-content" className="route-page error-screen" data-error-code={code}>
      <div className="error-stage">
        <div className="error-copy">
          <p className="signal-label">
            {code} / {label}
          </p>
          <div className="error-code" aria-hidden="true">
            {Array.from(code).map((digit, index) => (
              <span key={index} style={{ '--i': index } as React.CSSProperties}>
                {digit}
              </span>
            ))}
          </div>
          <h1>{title}</h1>
          <div className="error-message">{message}</div>
          <div className="error-actions">{actions}</div>
        </div>

        <figure className="error-character">
          <div className="error-bubble" role="img" aria-label={bubble}>
            {bubble}
          </div>
          <div className="error-avatar" aria-hidden="true">
            <Image src={site.githubAvatarUrl} alt="" width={320} height={320} priority />
          </div>
          <span className="pop-sticker error-sticker" aria-hidden="true">
            ✦ {code}
          </span>
        </figure>
      </div>

      <nav className="error-links" aria-label="ほかのページ">
        {quickLinks.map((link) => (
          <a key={link.href} href={link.href}>
            <b>{link.label}</b>
            <span>{link.note}</span>
            <i aria-hidden="true">→</i>
          </a>
        ))}
      </nav>
    </main>
  )
}
