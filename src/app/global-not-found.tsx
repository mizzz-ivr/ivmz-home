import type { Metadata } from 'next'

import './globals.css'
import './responsive-foundation.css'
import './reduced-motion.css'
import './(site)/pages.css'
import './(site)/site-shell.css'
import './(site)/enhance.css'
import './(site)/pop.css'
import './(site)/digital.css'
import './(site)/errors.css'
import { ErrorScreen } from '@/components/site/ErrorScreen'
import { SiteHeader } from '@/components/site/SiteExperience'
import { SiteFooter } from '@/components/site/SiteFooter'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false },
}

const themeBootScript = `(() => {
  try {
    const saved = localStorage.getItem('ivmz-theme');
    const theme = saved === 'light' || saved === 'dark'
      ? saved
      : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
})();`

/** 404 for URLs that match no route at all. Matches the styled not-found inside the site layout. */
export default function GlobalNotFound() {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          本文へスキップ
        </a>
        <SiteHeader />
        <ErrorScreen
          code="404"
          label="NOT FOUND"
          title="Page not found."
          bubble="道に迷っちゃった…"
          message={
            <p>
              お探しのページは見つかりませんでした。URLが変更されたか、公開を終了した可能性があります。
            </p>
          }
          actions={
            <>
              <a className="action-link action-primary" href="/">
                トップページへ戻る <span aria-hidden="true">→</span>
              </a>
              <a className="action-link" href="/contact">
                見つからないときは連絡する
              </a>
            </>
          }
        />
        <SiteFooter />
      </body>
    </html>
  )
}
