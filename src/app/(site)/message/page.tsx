import { AnonymousMessageForm } from '@/components/site/AnonymousMessageForm'
import { PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'

import './message.css'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Message',
  description: '名前やメールアドレスを入力せずに、300文字以内のひとことを送れます。',
  path: '/message',
})

export default function MessagePage() {
  const enabled =
    process.env.ANONYMOUS_MESSAGES_ENABLED === 'true' &&
    Boolean(process.env.TURNSTILE_SECRET_KEY) &&
    Boolean(process.env.ANONYMOUS_MESSAGE_HASH_KEY?.length && process.env.ANONYMOUS_MESSAGE_HASH_KEY.length >= 32) &&
    Boolean(process.env.TURNSTILE_SITE_KEY)

  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="MESSAGE / 07"
        title={<>Leave a signal.</>}
        description={
          <p>
            名前もメールアドレスもいりません。気軽にひとこと、感想や応援を送ってください。
          </p>
        }
        signal="MESSAGE / ANONYMOUS"
      />
      <PageSection
        title="ひとことを送る"
        description={
          <p>300文字以内のテキストを受け付けます。内容を確認してから送信できます。</p>
        }
      >
        {enabled ? (
          <AnonymousMessageForm siteKey={process.env.TURNSTILE_SITE_KEY!} />
        ) : (
          <div className="message-unavailable" role="status">
            <span className="signal-label">COMING SOON / UNDER CONSTRUCTION</span>
            <h3>ひとこと機能は準備中です。</h3>
            <p>
              安全に投稿を受け付けるため、公開準備を進めています。
              ご相談・お仕事のお問い合わせは、これまでどおりContactからお願いします。
            </p>
            <a className="action-link action-primary" href="/contact">
              Contactへ <span aria-hidden="true">→</span>
            </a>
          </div>
        )}
      </PageSection>
      <PageSection
        title="ご利用にあたって"
        description={
          <p>
            送信した文章は管理者のみが確認し、公開や返信を保証するものではありません。
            住所・連絡先などの個人情報や秘密情報は入力しないでください。
            詳細は<a className="inline-link" href="/legal/privacy">プライバシーポリシー</a>をご覧ください。
          </p>
        }
      >
        <p className="message-guidance">
          名前・メールアドレスの入力は不要です。長文でのご相談や返信をご希望の場合は
          <a className="inline-link" href="/contact">Contact</a>をご利用ください。
        </p>
      </PageSection>
    </main>
  )
}
