import { LegalLayout, PageHero } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'
import { site } from '@/lib/site'

export const metadata = createPageMetadata({
  title: 'Terms',
  description: 'ivmz Personal Web Platformの利用条件。',
  path: '/legal/terms',
})

export default function TermsPage() {
  return (
    <main id="main-content" className="route-page">
      <PageHero index="LEGAL / TERMS" title={<>Terms</>} description={<p>Portfolio、Writing、News、Schedule、外部linkを閲覧する公開サイトとしてのbaseline利用条件です。</p>} signal="LEGAL / USE" />
      <LegalLayout>
        <section><h2>1. Use of this site</h2><p>本サイトは、制作物、技術情報、活動情報、公開予定、連絡先等を提供するPersonal Web Platformです。</p></section>
        <section><h2>2. Content and links</h2><p>掲載内容は更新・変更・削除される場合があります。外部サイトへのリンク先の内容や可用性について、本サイトが管理するものではありません。</p></section>
        <section><h2>3. Intellectual property</h2><p>各コンテンツの権利は、明示されたライセンスまたは各権利者に帰属します。公開GitHub repositoryのコードは各repositoryに記載されたライセンスを確認してください。</p></section>
        <section><h2>4. Availability</h2><p>保守、障害、外部サービス障害等により、一部または全部の機能が一時的に利用できない場合があります。</p></section>
        <section><h2>5. Store and accounts</h2><p>Store、決済、会員機能は現在のPhase 1 scopeには含まれません。これらを公開する際は必要な条件を別途整備します。</p></section>
        <section><h2>6. Contact</h2><p>本サイトに関する連絡は <a className="inline-link" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> へ送付してください。</p></section>
      </LegalLayout>
    </main>
  )
}
