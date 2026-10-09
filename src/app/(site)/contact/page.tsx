import { ContactForm } from '@/components/site/ContactForm'
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
      <PageHero
        index="CONTACT / 06"
        title={<>One entrance. Clear routing.</>}
        description={
          <p>
            問い合わせカテゴリからserver-sideで適切なIdentityへroutingします。
            配送先メールアドレスを利用者が直接指定することはありません。
          </p>
        }
        signal="CONTACT / ROUTING"
      />

      <PageSection
        title="Send a message"
        description={<p>入力内容はserver-sideで検証し、カテゴリに応じて配送先を決定します。</p>}
      >
        <ContactForm generalEmail={site.contactEmail} securityEmail={site.securityEmail} />
      </PageSection>

      <PageSection
        title="Direct contact"
        description={<p>フォームを利用できない場合も、メールの連絡先を維持しています。</p>}
      >
        <div className="contact-baseline">
          <div className="contact-primary">
            <div>
              <span>GENERAL / PERSONAL</span>
              <strong>{site.contactEmail}</strong>
            </div>
            <a className="action-link action-primary" href={`mailto:${site.contactEmail}`}>
              Open mail app ↗
            </a>
          </div>
          <p>
            脆弱性報告などセキュリティに関する連絡は{' '}
            <a className="inline-link" href={`mailto:${site.securityEmail}`}>
              {site.securityEmail}
            </a>{' '}
            を利用してください。
          </p>
        </div>
      </PageSection>

      <PageSection
        title="Delivery boundary"
        description={<p>問い合わせ処理はhostingやmail providerへ密結合しない境界を維持します。</p>}
      >
        <div className="profile-lines">
          <div className="profile-line">
            <span>ROUTING</span>
            <p>カテゴリからserver-side routingし、recipientをclient inputとして受け取りません。</p>
          </div>
          <div className="profile-line">
            <span>VALIDATION</span>
            <p>
              server-side validation、origin check、honeypot、size limit、edge rate
              limitを適用します。
            </p>
          </div>
          <div className="profile-line">
            <span>DELIVERY</span>
            <p>
              Deploy Previewでは実メールを送りません。Productionでは送信内容をCMSの受信箱へ保存し、
              メール通知が有効な場合のみ通知します（通知が未設定でも受付は継続します）。
            </p>
          </div>
        </div>
      </PageSection>
    </main>
  )
}
