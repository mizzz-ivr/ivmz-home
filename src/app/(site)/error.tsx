'use client'

import { useEffect } from 'react'

import { ErrorScreen } from '@/components/site/ErrorScreen'

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Only the digest is logged: it ties the browser to the server log without leaking details.
    console.error('SITE_ERROR', error.digest ?? 'no-digest')
  }, [error])

  return (
    <ErrorScreen
      code="500"
      label="SOMETHING WENT WRONG"
      title="Something went wrong."
      bubble="ごめんなさい、調子が悪いみたい…"
      message={
        <p>
          ページの表示中に問題が起きました。時間を置いて、もう一度お試しください。直らないときは、お問い合わせからお知らせいただけると助かります。
        </p>
      }
      actions={
        <>
          <button className="action-link action-primary" type="button" onClick={() => reset()}>
            もう一度試す <span aria-hidden="true">↻</span>
          </button>
          <a className="action-link" href="/">
            トップページへ戻る
          </a>
        </>
      }
    />
  )
}
