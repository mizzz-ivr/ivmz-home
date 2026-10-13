import { EmptyState, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getSocialLinksListContent } from '@/lib/public-list-content'
import { site } from '@/lib/site'
import { SocialEmbedCard } from '@/components/site/SocialEmbedCard'
import { getLatestYouTubeVideos } from '@/lib/youtube-feed'
import { getIntegrationSettings } from '@/lib/integration-settings'
import { parseSocialEmbeds } from '@/lib/social-embed'

export const revalidate = 300

export const metadata = createPageMetadata({
  title: 'Links',
  description: 'GitHub、X、Instagram、YouTubeなど、各サービスのプロフィールへのリンク集。',
  path: '/links',
})

const stableFallback = [
  { platform: 'GitHub', handle: 'mizzz-ivr', url: site.githubUrl },
  { platform: 'ivRooom', handle: 'ivrm.jp', url: site.communityUrl },
]

export default async function LinksPage() {
  const settings = await getIntegrationSettings()
  const [content, videos] = await Promise.all([
    getSocialLinksListContent(),
    getLatestYouTubeVideos(settings.youtubeChannel),
  ])
  const embeds = parseSocialEmbeds(settings.embedUrls)
  const links = content.state === 'error' ? stableFallback : content.items

  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="LINKS / 07"
        title="Find the live edges."
        description={<p>GitHub、SNS、YouTubeなど、活動の場へのリンクをまとめています。</p>}
        signal="SOCIAL / EXTERNAL"
      />
      <PageSection title="Directory" description={<p>各サービスのプロフィールはこちらから。</p>}>
        {content.state === 'error' && (
          <EmptyState title="リンクを読み込めませんでした">
            代わりに、主要なリンクだけを表示しています。
          </EmptyState>
        )}
        {content.state === 'ready' && content.items.length === 0 && (
          <EmptyState title="リンクを準備中です">公開され次第、こちらに掲載します。</EmptyState>
        )}
        {links.length > 0 && (
          <div className="link-directory">
            {links.map((link, index) => (
              <a href={link.url} key={`${link.platform}-${link.url}`}>
                <span>0{index + 1}</span>
                <strong>{link.platform}</strong>
                <small>{link.handle ?? link.platform}</small>
                <b aria-hidden="true">↗</b>
              </a>
            ))}
          </div>
        )}
      </PageSection>
      {videos.length > 0 && (
        <PageSection title="Latest videos" description={<p>YouTubeチャンネルの最新動画です。</p>}>
          <ul className="video-grid">
            {videos.map((video) => (
              <li key={video.id}>
                <a href={video.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={video.thumbnail} alt="" loading="lazy" width={320} height={180} />
                  <strong>{video.title}</strong>
                  {video.publishedAt && <small>{video.publishedAt.slice(0, 10)}</small>}
                </a>
              </li>
            ))}
          </ul>
        </PageSection>
      )}
      {embeds.length > 0 && (
        <PageSection
          title="Posts"
          description={
            <p>X・Instagram・TikTok・YouTubeの投稿を、クリックしたときだけ読み込んで表示します。</p>
          }
        >
          <div className="social-embed-grid">
            {embeds.map((embed) => (
              <SocialEmbedCard embed={embed} key={embed.src} />
            ))}
          </div>
        </PageSection>
      )}
    </main>
  )
}
