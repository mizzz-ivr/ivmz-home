import { ContactForm } from '@/components/site/ContactForm'
import { PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { getTurnstileSecret } from '@/security/turnstile'
import { site } from '@/lib/site'

// Decide at request time whether the bot check is on, so the widget and the API (which reads the
// secret at runtime) can never disagree because of build-time vs runtime environment scopes.
export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Contact',
  description:
    'お仕事・開発のご相談、コラボレーション、取材・登壇のご依頼などのお問い合わせフォーム。',
  path: '/contact',
})

export default function ContactPage() {
  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="CONTACT / 06"
        title={<>Let’s talk.</>}
        description={
          <p>
            お仕事・開発のご相談、コラボレーション、取材・登壇のご依頼などはこちらから。内容を確認のうえ、順次ご返信します。
          </p>
        }
        signal="CONTACT / FORM"
      />

      <PageSection
        title="Send a message"
        description={<p>必要事項をご入力ください。送信前に内容を確認できます。</p>}
      >
        <ContactForm
          generalEmail={site.contactEmail}
          securityEmail={site.securityEmail}
          // The widget is only shown when the server can also verify it (secret present); otherwise the
          // form would look protected while the API accepts anything.
          turnstileSiteKey={
            getTurnstileSecret() ? process.env.TURNSTILE_SITE_KEY || undefined : undefined
          }
        />
      </PageSection>

      <PageSection
        title="Direct contact"
        description={<p>フォームを利用できない場合も、メールの連絡先を維持しています。</p>}
      >
        <div className="contact-baseline">
          <div className="contact-primary">
            <div>
              <span>GENERAL / PERSONAL</span>
              <strong>
                <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
              </strong>
            </div>
            <a className="action-link action-primary" href={`mailto:${site.contactEmail}`}>
              Open mail app ↗
            </a>
          </div>
          <p>
            匿名のひとことメッセージは現在準備中です。受付開始までは通常のお問い合わせフォームをご利用ください。
          </p>
          <p>
            脆弱性報告などセキュリティに関する連絡は{' '}
            <a className="inline-link" href={`mailto:${site.securityEmail}`}>
              {site.securityEmail}
            </a>{' '}
            を利用してください。
          </p>
        </div>
      </PageSection>
    </main>
  )
}
