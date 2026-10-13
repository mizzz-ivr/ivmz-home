import { EmptyState, PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getPostsListContent } from '@/lib/public-list-content'

export const revalidate = 300

export const metadata = createPageMetadata({
  title: 'Blog',
  description: '技術記事、制作の振り返り、開発ログを公開しています。',
  path: '/blog',
})

export default async function BlogPage() {
  const content = await getPostsListContent()

  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="BLOG / 03"
        title={<>Notes that remain useful.</>}
        description={<p>実装で得た知見や判断の理由を、あとから使える形で書き残しています。</p>}
        signal="WRITING / KNOWLEDGE"
      />
      <PageSection title="Latest writing" description={<p>新しい記事から順に表示しています。</p>}>
        {content.state === 'error' ? (
          <EmptyState title="記事を読み込めませんでした">
            時間をおいて、もう一度お試しください。
          </EmptyState>
        ) : content.items.length === 0 ? (
          <EmptyState title="記事を準備中です">公開され次第、こちらに掲載します。</EmptyState>
        ) : (
          <div className="content-list">
            {content.items.map((post) => (
              <article className="content-row" key={post.id}>
                <div className="content-row-copy">
                  <span>{post.category}</span>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                </div>
                <div className="content-row-meta">
                  <span>
                    {post.publishedAt
                      ? new Intl.DateTimeFormat('ja-JP').format(new Date(post.publishedAt))
                      : 'PUBLISHED'}
                  </span>
                  <small>{post.tags?.join(' · ') || 'Writing'}</small>
                  <a href={`/blog/${encodeURIComponent(post.slug)}`}>Read details →</a>
                  {post.canonicalUrl && (
                    <a href={post.canonicalUrl} target="_blank" rel="noreferrer">
                      Original article ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </PageSection>
      <PageCTA
        title="最新の動きを知りたい方へ"
        body="リリースや活動の短いお知らせはNewsにまとめています。"
        href="/news"
        label="Open News"
      />
    </main>
  )
}
