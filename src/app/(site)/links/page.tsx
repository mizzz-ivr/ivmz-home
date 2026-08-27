import { EmptyState, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getSocialLinksListContent } from '@/lib/public-list-content'
import { site } from '@/lib/site'

export const revalidate = 300

export const metadata = createPageMetadata({
  title: 'Links',
  description: 'GitHubなどの外部プロフィールをまとめるSocial Links destination。',
  path: '/links',
})

const stableFallback = [
  { platform: 'GitHub', handle: 'mizzz-ivr', url: site.githubUrl },
  { platform: 'ivRooom', handle: 'ivrm.jp', url: site.communityUrl },
]

export default async function LinksPage() {
  const content = await getSocialLinksListContent()
  const links = content.state === 'error' ? stableFallback : content.items

  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="LINKS / 07"
        title="Find the live edges."
        description={
          <p>
            Social Links
            Collectionを正本として使い、CMS障害時だけRepositoryで確定したstable linkへ縮退します。
          </p>
        }
        signal="SOCIAL / EXTERNAL"
      />
      <PageSection
        title="Directory"
        description={<p>CMSでは `enabled = true` のlinkだけがanonymous read対象です。</p>}
      >
        {content.state === 'error' && (
          <EmptyState title="CMS links could not be loaded.">
            ページ全体は壊さず、Repositoryで確定しているstable fallbackだけを表示します。
          </EmptyState>
        )}
        {content.state === 'ready' && content.items.length === 0 && (
          <EmptyState title="No CMS links are published yet.">
            CMSは正常です。enabledなSocial Linkがない状態をそのまま公開します。
          </EmptyState>
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
    </main>
  )
}
