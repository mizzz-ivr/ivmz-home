import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { StructuredData } from '@/components/seo/StructuredData'
import { PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getPublishedPostBySlug } from '@/lib/payload-content'
import { hasExternalCanonical, createBlogStructuredData } from '@/lib/structured-data'

export const revalidate = 300

type DetailPageProps = {
  params: Promise<{ slug: string }>
}

function formatDate(value?: string | null) {
  if (!value) return 'Published'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Published'
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long' }).format(date)
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)

  if (!post) return { robots: { index: false, follow: false } }

  return createPageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${encodeURIComponent(post.slug)}`,
    canonicalUrl: post.canonicalUrl,
  })
}

export default async function BlogDetailPage({ params }: DetailPageProps) {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)
  if (!post) notFound()

  const path = `/blog/${encodeURIComponent(post.slug)}`
  const externalCanonical = hasExternalCanonical(path, post.canonicalUrl)

  return (
    <main id="main-content" className="route-page detail-page">
      <StructuredData data={createBlogStructuredData(post)} />
      <a className="detail-back-link" href="/blog">
        <span aria-hidden="true">←</span> All writing
      </a>
      <PageHero
        index="BLOG / DETAIL"
        title={post.title}
        description={<p>{post.excerpt}</p>}
        signal="WRITING / KNOWLEDGE"
      />
      <PageSection title="Article profile" description={<p>公開日やカテゴリ、タグです。</p>}>
        <dl className="detail-facts">
          <div>
            <dt>Category</dt>
            <dd>{post.category}</dd>
          </div>
          <div>
            <dt>Published</dt>
            <dd>{formatDate(post.publishedAt)}</dd>
          </div>
          <div>
            <dt>Tags</dt>
            <dd>{post.tags?.length ?? 0}</dd>
          </div>
          <div>
            <dt>Related works</dt>
            <dd>{post.relatedWorks?.length ?? 0}</dd>
          </div>
        </dl>
        {post.tags && post.tags.length > 0 && (
          <ul className="detail-tags detail-tags-spaced" aria-label="Article tags">
            {post.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </PageSection>
      <PageSection
        title={externalCanonical ? 'Original publication' : 'Article'}
        description={
          <p>{externalCanonical ? 'この記事は外部サイトで公開しています。' : '記事の本文です。'}</p>
        }
      >
        {externalCanonical && post.canonicalUrl ? (
          <div className="external-publication">
            <p>
              この記事の本文は、外部サイトで公開しています。以下のリンクからお読みいただけます。
            </p>
            <a href={post.canonicalUrl} target="_blank" rel="noreferrer">
              Read the article <span aria-hidden="true">↗</span>
            </a>
          </div>
        ) : (
          <div className="detail-prose">
            <p>{post.body}</p>
          </div>
        )}
      </PageSection>
      <PageCTA
        title="最新の活動も見る"
        body="短いお知らせや活動の記録はNewsにまとめています。"
        href="/news"
        label="Open News"
      />
    </main>
  )
}
