import { PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { site } from '@/lib/site'

export const metadata = createPageMetadata({
  title: 'Contact',
  description: '仕事、開発相談、コラボ、取材等の正式なContact destination。',
  path: '/contact',
})

export default function ContactPage() {
  return (
    <main id="main-content" className="route-page">
      <PageHero index="CONTACT / 06" title={<>One entrance. Clear routing.</>} description={<p>配送先アドレスを利用者に選ばせるのではなく、将来のフォームでは問い合わせカテゴリからserver-sideでroutingします。</p>} signal="CONTACT / ROUTING" />
      <PageSection title="Current contact" description={<p>フォームbackendはまだ実装していないため、送信可能に見えるダミーUIは置きません。</p>}>
        <div className="contact-baseline">
          <p>現時点の一般的な問い合わせはUnified Personal Identityの窓口へ送れます。フォーム実装時は personal / job / collaboration / media、development / OSS、ivRooom / community / team を内部で適切なIdentityへroutingします。</p>
          <div className="contact-primary"><div><span>GENERAL / PERSONAL</span><strong>{site.contactEmail}</strong></div><a className="action-link action-primary" href={`mailto:${site.contactEmail}`}>Open mail app ↗</a></div>
          <p>脆弱性報告などセキュリティに関する連絡は <a className="inline-link" href={`mailto:${site.securityEmail}`}>{site.securityEmail}</a> を利用してください。</p>
        </div>
      </PageSection>
      <PageSection title="Form boundary" description={<p>次のフォーム実装で守る境界を先に固定します。</p>}>
        <div className="profile-lines">
          <div className="profile-line"><span>ROUTING</span><p>カテゴリからserver-side routingし、配送先メールアドレスを選択UIにしない。</p></div>
          <div className="profile-line"><span>VALIDATION</span><p>server-side validation、bot protection、rate limit、spam対策を前提とする。</p></div>
          <div className="profile-line"><span>PORTABLE</span><p>特定hosting providerへ問い合わせ処理を密結合しない。</p></div>
        </div>
      </PageSection>
    </main>
  )
}
