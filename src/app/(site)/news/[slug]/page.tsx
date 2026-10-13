import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { StructuredData } from '@/components/seo/StructuredData'
import { PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getPublishedNewsBySlug } from '@/lib/payload-content'
import { createNewsStructuredData } from '@/lib/structured-data'

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

  const description = compact(item.body)

  return (
    <main id="main-content" className="route-page detail-page">
      <StructuredData
        data={createNewsStructuredData({
          slug: item.slug,
          title: item.title,
          description,
          publishedAt: item.publishedAt,
        })}
      />
      <a className="detail-back-link" href="/news">
        <span aria-hidden="true">←</span> All news
      </a>
      <PageHero
        index="NEWS / DETAIL"
        title={item.title}
        description={<p>{description}</p>}
        signal="ACTIVITY / RELEASE"
      />
      <PageSection title="Update profile" description={<p>お知らせの種類と公開日です。</p>}>
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
      <PageSection title="Update" description={<p>お知らせの内容です。</p>}>
        <div className="detail-prose">
          <p>{item.body}</p>
        </div>
      </PageSection>
      {item.externalUrl && (
        <PageSection title="Source" description={<p>詳しくは、こちらをご覧ください。</p>}>
          <div className="detail-actions">
            <a href={item.externalUrl} target="_blank" rel="noreferrer">
              Open the source <span aria-hidden="true">↗</span>
            </a>
          </div>
        </PageSection>
      )}
      <PageCTA
        title="これからの予定"
        body="公開できるイベントやリリースの予定はScheduleにまとめています。"
        href="/schedule"
        label="Open Schedule"
      />
    </main>
  )
}
