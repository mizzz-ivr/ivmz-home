'use client'

/**
 * Last-resort screen when even the root layout fails. It has no stylesheet or layout, so it brings
 * its own minimal styling and no external assets.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#080811',
          color: '#f8f5ff',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <main>
          <p style={{ font: '800 14px monospace', letterSpacing: '0.14em', color: '#ffd84a' }}>
            500 / SOMETHING WENT WRONG
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.4rem)', margin: '12px 0' }}>
            Something went wrong.
          </h1>
          <p style={{ color: '#d4cfe2', lineHeight: 1.9 }}>
            ページを表示できませんでした。時間を置いて、もう一度お試しください。
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 20,
              padding: '12px 22px',
              border: '2px solid #1a1230',
              borderRadius: 999,
              background: '#ffd84a',
              color: '#1a1230',
              font: '800 16px system-ui, sans-serif',
              cursor: 'pointer',
            }}
          >
            もう一度試す
          </button>
        </main>
      </body>
    </html>
  )
}
