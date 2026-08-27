import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getPublishedNewsBySlug } from '@/lib/payload-content'

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

function compact(value: string, maxLength = 260) {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const item = await getPublishedNewsBySlug(slug)

  if (!item) return { robots: { index: false, follow: false } }

  return createPageMetadata({
    title: item.title,
    description: compact(item.body),
    path: `/news/${encodeURIComponent(item.slug)}`,
  })
}

export default async function NewsDetailPage({ params }: DetailPageProps) {
  const { slug } = await params
  const item = await getPublishedNewsBySlug(slug)
  if (!item) notFound()

  return (
    <main id="main-content" className="route-page detail-page">
      <Link className="detail-back-link" href="/news">
        <span aria-hidden="true">←</span> All news
      </Link>
      <PageHero
        index="NEWS / DETAIL"
        title={item.title}
        description={<p>{compact(item.body)}</p>}
        signal="ACTIVITY / RELEASE"
      />
      <PageSection title="Update profile" description={<p>公開済みNewsのtypeと公開日。</p>}>
        <dl className="detail-facts">
          <div>
            <dt>Type</dt>
            <dd>{item.type}</dd>
          </div>
          <div>
            <dt>Published</dt>
            <dd>{formatDate(item.publishedAt)}</dd>
          </div>
        </dl>
      </PageSection>
      <PageSection title="Update" description={<p>News本文を安全なテキストとして表示します。</p>}>
        <div className="detail-prose">
          <p>{item.body}</p>
        </div>
      </PageSection>
      {item.externalUrl && (
        <PageSection title="Source" description={<p>内部News detailとは別の外部参照先です。</p>}>
          <div className="detail-actions">
            <a href={item.externalUrl} target="_blank" rel="noreferrer">
              Open external source <span aria-hidden="true">↗</span>
            </a>
          </div>
        </PageSection>
      )}
      <PageCTA
        title="See what comes next."
        body="公開予定・イベント・リリース予定はScheduleへ。"
        href="/schedule"
        label="Open Schedule"
      />
    </main>
  )
}
