import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageHero, PageSection } from '@/components/site/PageFoundation'
import { site } from '@/lib/site'
import { readApprovedAnonymousMessage } from '@/messages/public-reader'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type Props = { params: Promise<{ publicId: string }> }

const excerpt = (value: string, max = 110) => {
  const characters = Array.from(value.replace(/\s+/g, ' ').trim())
  return characters.length > max ? `${characters.slice(0, max).join('')}…` : characters.join('')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params
  const approved = await readApprovedAnonymousMessage(publicId)
  // This page must never be indexed, even when the message is publicly shareable.
  if (!approved || approved.publicId !== publicId) {
    return { robots: { index: false, follow: false } }
  }

  const url = new URL(`/message/${approved.publicId}`, site.url).toString()
  const description = excerpt(approved.message)
  return {
    title: 'Anonymous message',
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: `Anonymous message | ${site.shortName}`,
      description,
      locale: 'ja_JP',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Anonymous message | ${site.shortName}`,
      description,
    },
  }
}

export default async function ApprovedMessagePage({ params }: Props) {
  const { publicId } = await params
  const approved = await readApprovedAnonymousMessage(publicId)
  if (!approved || approved.publicId !== publicId) notFound()

  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="MESSAGE / SHARED"
        title={<>A little signal.</>}
        description={<p>匿名で届いたひとことと、管理者からの返信です。</p>}
        signal="PUBLIC / APPROVED"
      />
      <PageSection title="Message" description={<p>投稿者の名前や連絡先は表示しません。</p>}>
        <div style={{ display: 'grid', gap: 22, maxWidth: 800 }}>
          <blockquote
            style={{
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
              margin: 0,
              fontSize: 'clamp(1.15rem, 2.3vw, 1.65rem)',
            }}
          >
            {approved.message}
          </blockquote>
          <section
            aria-label="管理者からの返信"
            style={{ padding: '22px', border: '1px solid var(--color-line-strong)' }}
          >
            <p className="signal-label">REPLY / IVMZ</p>
            <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{approved.reply}</p>
          </section>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
            公開日時：
            {new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long', timeZone: 'Asia/Tokyo' }).format(
              new Date(approved.publishedAt),
            )}
          </p>
          <a className="action-link" href="/contact">
            Contact <span aria-hidden="true">→</span>
          </a>
        </div>
      </PageSection>
    </main>
  )
}
