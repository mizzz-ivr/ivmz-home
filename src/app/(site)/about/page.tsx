import { PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'

export const metadata = createPageMetadata({
  title: 'About',
  description: 'いゔる。 a.k.a. mizzz の開発領域、ものづくりの姿勢、現在のフォーカスをまとめたAboutページ。',
  path: '/about',
})

export default function AboutPage() {
  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="ABOUT / 01"
        title={<>Build across the boundary.</>}
        description={<p>UIだけ、APIだけで区切らず、触れる体験からデータ・運用までを一つのプロダクトとして実装します。</p>}
        signal="IDENTITY / BUILD"
      />

      <PageSection title="Identity" description={<p>Repositoryと現在のHomeで確定している公開Identityだけを掲載します。</p>}>
        <div className="profile-lines">
          <div className="profile-line"><span>NAME</span><p>いゔる。 a.k.a. mizzz（ずーみー）</p></div>
          <div className="profile-line"><span>ROLE</span><p>Product-minded Full Stack Developer / Creator</p></div>
          <div className="profile-line"><span>STYLE</span><p>設計を理解したうえで手を動かし、小さく公開して、反応と運用から磨き続ける。</p></div>
        </div>
      </PageSection>

      <PageSection title="What I build" description={<p>Personal Web Platformの正式な公開領域に合わせた開発フィールド。</p>}>
        <div className="editorial-columns">
          <article className="editorial-column"><span>01 / WEB</span><h3>Web Product</h3><p>React / Next.js / TypeScriptを中心に、画面・認証・API・データを一続きで扱います。</p></article>
          <article className="editorial-column"><span>02 / REALTIME</span><h3>Realtime & AI</h3><p>Realtime AI、音声、Discordなど、操作と応答が連続する体験をプロダクトへ落とし込みます。</p></article>
          <article className="editorial-column"><span>03 / DATA</span><h3>Backend & Data</h3><p>API、PostgreSQL、Payload、権限、migrationをフロントから切り離さずに設計します。</p></article>
          <article className="editorial-column"><span>04 / OPERATE</span><h3>Ship & Operate</h3><p>Docker、CI、Deploy Preview、運用まで含めて、変更し続けられる状態を作ります。</p></article>
        </div>
      </PageSection>

      <PageSection title="Development philosophy">
        <div className="profile-lines">
          <div className="profile-line"><span>01</span><p>完成画面だけではなく、制約・判断・運用まで成果物の一部として扱う。</p></div>
          <div className="profile-line"><span>02</span><p>まず小さく出し、実際の利用とレビューから改善する。</p></div>
          <div className="profile-line"><span>03</span><p>アクセシビリティ、セキュリティ、レスポンシブを後付けにしない。</p></div>
        </div>
      </PageSection>

      <PageCTA title="See what is being built." body="公開プロジェクトはWorksで、継続的な実装はGitHubとWritingで追える構成へ育てています。" href="/works" label="Explore Works" />
    </main>
  )
}
