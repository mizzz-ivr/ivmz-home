import { PageCTA, PageHero } from '@/components/site/PageFoundation'

export default function NotFound() {
  return (
    <main id="main-content" className="route-page detail-page">
      <PageHero
        index="404 / NOT FOUND"
        title="Page not found."
        description={
          <p>
            お探しのページは見つかりませんでした。URLが変更されたか、公開を終了した可能性があります。
          </p>
        }
        signal="404 / NOT FOUND"
      />
      <PageCTA
        title="トップページへ戻る"
        body="公開中のWorks・Blog・Newsは、トップページや各一覧からご覧いただけます。"
        href="/"
        label="Back home"
      />
    </main>
  )
}
