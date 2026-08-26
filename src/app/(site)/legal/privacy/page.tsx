import { LegalLayout, PageHero } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { site } from '@/lib/site'

export const metadata = createPageMetadata({
  title: 'Privacy Policy',
  description: 'ivmz Personal Web PlatformのPrivacy Policy。',
  path: '/legal/privacy',
})

export default function PrivacyPage() {
  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="LEGAL / PRIVACY"
        title={<>Privacy Policy</>}
        description={
          <p>
            このページは現在の公開サイト構成に合わせたbaselineです。新しい収集機能を導入する際は実装と同時に更新します。
          </p>
        }
        signal="LEGAL / DATA"
      />
      <LegalLayout>
        <section>
          <h2>1. Scope</h2>
          <p>本ポリシーは、{site.url} で提供するPersonal Web Platformに適用します。</p>
        </section>
        <section>
          <h2>2. Data handled by the site</h2>
          <p>
            現行のContact
            routeには送信フォームbackendを実装していません。一般問い合わせはメールアプリへ遷移するリンクを提供しています。HostingやWeb配信の運用上、アクセス時のIPアドレス、User-Agent、時刻などがインフラ側ログとして処理される場合があります。
          </p>
        </section>
        <section>
          <h2>3. External services</h2>
          <p>
            GitHub等の外部サイトへのリンクを掲載します。リンク先でのデータ処理は各サービスのポリシーに従います。
          </p>
        </section>
        <section>
          <h2>4. Purpose</h2>
          <p>
            取得・処理される情報は、サイト提供、セキュリティ、障害調査、問い合わせ対応など必要な範囲で利用します。
          </p>
        </section>
        <section>
          <h2>5. Changes</h2>
          <p>
            Analytics、Contact
            form、Newsletter、Store等の新機能を導入する場合、実際の処理内容に合わせて本ポリシーを更新します。
          </p>
        </section>
        <section>
          <h2>6. Contact</h2>
          <p>
            Privacyに関する連絡は{' '}
            <a className="inline-link" href={`mailto:${site.contactEmail}`}>
              {site.contactEmail}
            </a>{' '}
            へ送付してください。
          </p>
        </section>
      </LegalLayout>
    </main>
  )
}
