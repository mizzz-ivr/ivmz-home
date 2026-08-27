import { PageCTA, PageHero, PageSection } from '@/components/site/PageFoundation'
import { createPageMetadata } from '@/lib/metadata'

export const metadata = createPageMetadata({
  title: 'About',
  description:
    'いゔる。 a.k.a. mizzz の開発領域、ものづくりの姿勢、現在のフォーカスをまとめたAboutページ。',
  path: '/about',
})

const identityRows = [
  ['NAME', 'いゔる。 a.k.a. mizzz（ずーみー）'],
  ['ROLE', 'Product-minded Full Stack Developer / Creator'],
  ['STYLE', '設計を理解したうえで手を動かし、小さく公開して、反応と運用から磨き続ける。'],
] as const

const buildAreas = [
  {
    index: '01 / WEB',
    title: 'Web Product',
    description:
      'React / Next.js / TypeScriptを中心に、画面・認証・API・データを一続きで扱います。',
  },
  {
    index: '02 / REALTIME',
    title: 'Realtime & AI',
    description:
      'Realtime AI、音声、Discordなど、操作と応答が連続する体験をプロダクトへ落とし込みます。',
  },
  {
    index: '03 / DATA',
    title: 'Backend & Data',
    description: 'API、PostgreSQL、Payload、権限、migrationをフロントから切り離さずに設計します。',
  },
  {
    index: '04 / OPERATE',
    title: 'Ship & Operate',
    description: 'Docker、CI、Deploy Preview、運用まで含めて、変更し続けられる状態を作ります。',
  },
] as const

const principles = [
  '完成画面だけではなく、制約・判断・運用まで成果物の一部として扱う。',
  'まず小さく出し、実際の利用とレビューから改善する。',
  'アクセシビリティ、セキュリティ、レスポンシブを後付けにしない。',
] as const

export default function AboutPage() {
  return (
    <main id="main-content" className="route-page">
      <PageHero
        index="ABOUT / 01"
        title="Build across the boundary."
        description={
          <p>
            UIだけ、APIだけで区切らず、触れる体験からデータ・運用までを一つのプロダクトとして実装します。
          </p>
        }
        signal="IDENTITY / BUILD"
      />

      <PageSection
        title="Identity"
        description={<p>Repositoryと現在のHomeで確定している公開Identityだけを掲載します。</p>}
      >
        <div className="profile-lines">
          {identityRows.map(([label, value]) => (
            <div className="profile-line" key={label}>
              <span>{label}</span>
              <p>{value}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="What I build"
        description={<p>Personal Web Platformの正式な公開領域に合わせた開発フィールド。</p>}
      >
        <div className="editorial-columns">
          {buildAreas.map((area) => (
            <article className="editorial-column" key={area.index}>
              <span>{area.index}</span>
              <h3>{area.title}</h3>
              <p>{area.description}</p>
            </article>
          ))}
        </div>
      </PageSection>

      <PageSection title="Development philosophy">
        <div className="profile-lines">
          {principles.map((principle, index) => (
            <div className="profile-line" key={principle}>
              <span>0{index + 1}</span>
              <p>{principle}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageCTA
        title="See what is being built."
        body="公開プロジェクトはWorksで、継続的な実装はGitHubとWritingで追える構成へ育てています。"
        href="/works"
        label="Explore Works"
      />
    </main>
  )
}
