import type { Metadata } from 'next'
import Link from 'next/link'
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
      <Link className="detail-back-link" href="/blog">
        <span aria-hidden="true">←</span> All writing
      </Link>
      <PageHero
        index="BLOG / DETAIL"
        title={post.title}
        description={<p>{post.excerpt}</p>}
        signal="WRITING / KNOWLEDGE"
      />
      <PageSection
        title="Article profile"
        description={<p>公開日時・category・tagsをまとめます。</p>}
      >
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
          <p>
            {externalCanonical
              ? '外部canonicalを正本として扱い、このrouteでは本文を重複掲載しません。'
              : 'CMSのMarkdown/plain-text baselineをHTMLとして解釈せず、安全なテキストで表示します。'}
          </p>
        }
      >
        {externalCanonical && post.canonicalUrl ? (
          <div className="external-publication">
            <p>
              このページはサイト内の安定した導線とtaxonomyを保持するsummary
              pageです。本文の正本は外部公開先にあります。
            </p>
            <a href={post.canonicalUrl} target="_blank" rel="noreferrer">
              Read canonical article <span aria-hidden="true">↗</span>
            </a>
          </div>
        ) : (
          <div className="detail-prose">
            <p>{post.body}</p>
          </div>
        )}
      </PageSection>
      <PageCTA
        title="Follow the latest activity."
        body="短いリリース・告知・活動記録はNewsへ分離しています。"
        href="/news"
        label="Open News"
      />
    </main>
  )
}
