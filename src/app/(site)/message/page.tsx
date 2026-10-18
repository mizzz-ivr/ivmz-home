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
  const hashKey = process.env.ANONYMOUS_MESSAGE_HASH_KEY
  const enabled =
    process.env.ANONYMOUS_MESSAGES_ENABLED === 'true' &&
    Boolean(process.env.TURNSTILE_SECRET_KEY) &&
    Boolean(hashKey && hashKey.length >= 32) &&
    Boolean(process.env.TURNSTILE_SITE_KEY)

  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="MESSAGE / 07"
        title={<>Leave a signal.</>}
        description={<p>名前もメールアドレスもいりません。感想や応援を気軽に送ってください。</p>}
        signal="MESSAGE / ANONYMOUS"
      />
      <PageSection
        title="ひとことを送る"
        description={<p>300文字以内のテキストを、確認画面から送信できます。</p>}
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
        description={<p>管理者のみが確認し、公開や返信を保証しません。個人情報や秘密情報は送らないでください。</p>}
      >
        <div className="message-guidance">
          <p>名前・メールアドレスは不要です。長文のご相談や返信をご希望の場合はContactへ。</p>
          <p><a className="inline-link" href="/legal/privacy">プライバシーポリシー →</a></p>
          <p><a className="inline-link" href="/contact">Contact →</a></p>
        </div>
      </PageSection>
    </main>
  )
}
