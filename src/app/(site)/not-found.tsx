import { ErrorScreen } from '@/components/site/ErrorScreen'

export default function NotFound() {
  return (
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
  )
}
