import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { EmptyState, PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getPublishedWorkBySlug } from '@/lib/payload-content'

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
  const work = await getPublishedWorkBySlug(slug)

  if (!work) return { robots: { index: false, follow: false } }

  return createPageMetadata({
    title: work.title,
    description: work.summary,
    path: `/works/${encodeURIComponent(work.slug)}`,
  })
}

export default async function WorkDetailPage({ params }: DetailPageProps) {
  const { slug } = await params
  const work = await getPublishedWorkBySlug(slug)
  if (!work) notFound()

  const mediaCount = work.gallery?.length ?? 0

  return (
    <main id="main-content" className="route-page detail-page">
      <Link className="detail-back-link" href="/works">
        <span aria-hidden="true">←</span> All works
      </Link>
      <PageHero
        index="WORK / DETAIL"
        title={work.title}
        description={<p>{work.summary}</p>}
        signal="CASE STUDY / BUILD"
      />
      <PageSection
        title="Project profile"
        description={<p>役割・状態・公開日と、公開Content Modelに登録された技術情報です。</p>}
      >
        <dl className="detail-facts">
          <div>
            <dt>Role</dt>
            <dd>{work.role}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{work.projectStatus}</dd>
          </div>
          <div>
            <dt>Published</dt>
            <dd>{formatDate(work.publishedAt)}</dd>
          </div>
          <div>
            <dt>Media</dt>
            <dd>
              {mediaCount > 0 ? `${mediaCount} asset${mediaCount === 1 ? '' : 's'}` : 'None'}
            </dd>
          </div>
        </dl>
      </PageSection>
      <PageSection title="Technology" description={<p>この制作物で使っている主要スタック。</p>}>
        <ul className="detail-tags" aria-label="Technology stack">
          {work.stack.map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>
      </PageSection>
      <PageSection
        title="Highlights"
        description={<p>実装・設計上の要点を短く追えるようにします。</p>}
      >
        {work.highlights && work.highlights.length > 0 ? (
          <ul className="detail-list">
            {work.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No highlights published yet.">
            Highlightsが公開された時点でここに反映されます。
          </EmptyState>
        )}
      </PageSection>
      <PageSection
        title="Case study"
        description={<p>CMS上のCase Study本文を安全なテキストとして表示します。</p>}
      >
        {work.caseStudy ? (
          <div className="detail-prose">
            <p>{work.caseStudy}</p>
          </div>
        ) : (
          <EmptyState title="Case study is being prepared.">
            routeとmetadataは利用可能なまま、本文未登録を明示します。
          </EmptyState>
        )}
      </PageSection>
      {(work.githubUrl || work.liveUrl) && (
        <PageSection
          title="Links"
          description={<p>内部Case Studyとは別の外部destinationです。</p>}
        >
          <div className="detail-actions">
            {work.githubUrl && (
              <a href={work.githubUrl} target="_blank" rel="noreferrer">
                Open GitHub <span aria-hidden="true">↗</span>
              </a>
            )}
            {work.liveUrl && (
              <a href={work.liveUrl} target="_blank" rel="noreferrer">
                Open live site <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </PageSection>
      )}
      <PageCTA
        title="Read the implementation notes."
        body="技術的な判断やBuild LogはBlogへ分離して蓄積します。"
        href="/blog"
        label="Open Blog"
      />
    </main>
  )
}
