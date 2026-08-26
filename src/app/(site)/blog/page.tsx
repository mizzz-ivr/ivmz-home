import { EmptyState, PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getPostsListContent } from '@/lib/public-list-content'

export const revalidate = 300

export const metadata = createPageMetadata({
  title: 'Blog',
  description: '技術記事、Case Study、Build Logを公開するWriting一覧。',
  path: '/blog',
})

export default async function BlogPage() {
  const content = await getPostsListContent()

  return (
    <main id="main-content" className="route-page">
      <PageHero index="BLOG / 03" title={<>Notes that remain useful.</>} description={<p>実装で得た知見、判断、制約を再利用できる形で残すためのWriting destinationです。</p>} signal="WRITING / KNOWLEDGE" />
      <PageSection title="Latest writing" description={<p>PayloadでpublishされたPostsを新しい順に表示します。</p>}>
        {content.state === 'error' ? (
          <EmptyState title="Writing is temporarily unavailable.">CMS queryに失敗しました。外部サービスやHomeを巻き込まず、この一覧だけ縮退します。</EmptyState>
        ) : content.items.length === 0 ? (
          <EmptyState title="No published posts yet.">CMSは正常です。記事の公開後、この一覧へ自動的に反映されます。</EmptyState>
        ) : (
          <div className="content-list">
            {content.items.map((post) => (
              <article className="content-row" key={post.id}>
                <div className="content-row-copy"><span>{post.category}</span><h3>{post.title}</h3><p>{post.excerpt}</p></div>
                <div className="content-row-meta"><span>{post.publishedAt ? new Intl.DateTimeFormat('ja-JP').format(new Date(post.publishedAt)) : 'PUBLISHED'}</span><small>{post.tags?.join(' · ') || 'Writing'}</small>{post.canonicalUrl ? <a href={post.canonicalUrl}>Read article ↗</a> : <small>Detail route coming next</small>}</div>
              </article>
            ))}
          </div>
        )}
      </PageSection>
      <PageCTA title="Follow the moving parts." body="リリースや活動の短い更新はNewsへ分離しています。" href="/news" label="Open News" />
    </main>
  )
}
