import { PageCTA, PageHero } from '@/components/site/PageFoundation'

export default function NotFound() {
  return (
    <main id="main-content" className="route-page detail-page">
      <PageHero
        index="404 / NO SIGNAL"
        title="Signal not found."
        description={
          <p>
            このURLで公開中のコンテンツは見つかりません。未公開・draftの存在有無も公開routeからは区別しません。
          </p>
        }
        signal="NOT FOUND / PRIVATE"
      />
      <PageCTA
        title="Return to a public destination."
        body="公開中のWorks・Blog・Newsは各一覧から辿れます。"
        href="/"
        label="Back home"
      />
    </main>
  )
}
