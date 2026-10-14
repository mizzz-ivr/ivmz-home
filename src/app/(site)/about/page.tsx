import Image from 'next/image'

import { PageCTA, PageSection } from '@/components/site/PageFoundation'
import {
  aboutAreas,
  buildSteps,
  consultTopics,
  playerStats,
  practices,
  principles,
  profileFacts,
  publicBuilds,
  stackGroups,
  storyParagraphs,
  tagline,
} from '@/lib/about-content'
import { createPageMetadata } from '@/lib/metadata'
import { site } from '@/lib/site'

export const metadata = createPageMetadata({
  title: 'About',
  description:
    'いゔる。 a.k.a. mizzz のプロフィール。開発の領域、技術スタック、ものづくりの進め方、大切にしていること、ご相談できる内容。',
  path: '/about',
})

export default function AboutPage() {
  return (
    <main id="main-content" className="route-page about-page">
      <header className="about-hero">
        <div className="about-hero-copy">
          <p className="signal-label">ABOUT / 01</p>
          <h1>
            画面の向こう側まで、
            <br />
            <mark className="marker">つくる。</mark>
          </h1>
          <p className="about-hero-lede">
            {site.name}
            。UIだけ、APIだけで区切らず、触れる体験からデータ・運用までを一つのプロダクトとして実装します。
          </p>
          <div className="about-hero-actions">
            <a className="action-link action-primary" href="/works">
              Works を見る <span aria-hidden="true">↗</span>
            </a>
            <a className="action-link" href="/contact">
              ご相談はこちら <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <figure className="about-portrait">
          <div className="about-portrait-frame">
            <Image
              src={site.githubAvatarUrl}
              alt="mizzzのGitHubアイコンに使用しているオリジナルキャラクター"
              width={640}
              height={640}
              priority
              sizes="(max-width: 860px) 70vw, 36vw"
            />
          </div>
          <span className="pop-sticker about-sticker" aria-hidden="true">
            ✦ BUILD · SHIP · POLISH
          </span>
          <figcaption>
            <b>いゔる。</b>
            <span>a.k.a. mizzz（ずーみー）</span>
          </figcaption>
        </figure>
      </header>

      <section className="about-facts" aria-label="プロフィール">
        <dl>
          {profileFacts.map((fact) => (
            <div key={fact.label} data-reveal>
              <dt>{fact.label}</dt>
              <dd>
                <strong>{fact.value}</strong>
                <span>{fact.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="about-player" aria-labelledby="about-player-title">
        <div className="about-player-head" data-reveal>
          <p className="signal-label">PLAYER CARD</p>
          <h2 id="about-player-title">
            ざっくり、<mark className="marker">わたし。</mark>
          </h2>
        </div>
        <ul className="player-stats">
          {playerStats.map((stat, index) => (
            <li
              key={stat.label}
              data-reveal="pop"
              style={
                {
                  '--reveal-delay': `${index * 70}ms`,
                  '--tilt': `${index % 2 ? 1.6 : -1.6}deg`,
                } as React.CSSProperties
              }
            >
              <span className="player-mark" aria-hidden="true">
                {stat.mark}
              </span>
              <small>{stat.label}</small>
              <strong>{stat.value}</strong>
              <span>{stat.note}</span>
            </li>
          ))}
        </ul>
        <p className="about-tagline" aria-label={tagline.join('、')} data-reveal>
          {tagline.map((word, index) => (
            <span key={word}>
              {word}
              {index < tagline.length - 1 ? <i aria-hidden="true">✦</i> : null}
            </span>
          ))}
        </p>
      </section>

      <PageSection title="Story" description={<p>どんな考え方で、ものをつくっているか。</p>}>
        <div className="about-story">
          {storyParagraphs.map((paragraph, index) => (
            <p key={index} data-reveal>
              {paragraph}
            </p>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="What I build"
        description={<p>得意としている4つの領域と、そこで手がけたプロジェクト。</p>}
      >
        <div className="about-areas">
          {aboutAreas.map((area, index) => (
            <article
              className="about-area"
              key={area.index}
              data-reveal="pop"
              data-spotlight
              style={{ '--reveal-delay': `${index * 80}ms` } as React.CSSProperties}
            >
              <span className="about-area-index">
                {area.index} / {area.label}
              </span>
              <h3>{area.title}</h3>
              <p>{area.description}</p>
              <ul>
                {area.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {area.project ? (
                <a className="about-area-project" href={area.project.href}>
                  代表例：{area.project.name} <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </PageSection>

      <PageSection title="Tech stack" description={<p>普段よく使っている技術です。</p>}>
        <div className="about-stack">
          {stackGroups.map((group) => (
            <div key={group.label} data-reveal>
              <h3>{group.label}</h3>
              <ul className="stack-chips" aria-label={`${group.label}の技術`}>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Public builds"
        description={<p>公開して育てているものです。GitHub のプロフィールにも載せています。</p>}
      >
        <ul className="about-builds">
          {publicBuilds.map((build, index) => (
            <li
              key={build.name}
              data-reveal="pop"
              data-spotlight
              style={{ '--reveal-delay': `${index * 70}ms` } as React.CSSProperties}
            >
              <span className="about-build-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3>{build.name}</h3>
              <p>{build.description}</p>
              <small>{build.stack}</small>
              {build.href ? (
                <a className="about-area-project" href={build.href}>
                  GitHub で見る <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection
        title="How I work"
        description={<p>作って終わりにせず、公開してから磨く。一周ぶんの進め方です。</p>}
      >
        <ol className="about-flow">
          {buildSteps.map((item, index) => (
            <li key={item.step} data-reveal>
              <span className="about-flow-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <b>{item.step}</b>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </PageSection>

      <PageSection title="Principles" description={<p>開発で大切にしていること。</p>}>
        <div className="about-principles">
          {principles.map((item, index) => (
            <article key={item.title} data-reveal data-spotlight>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </PageSection>

      <PageSection title="Practices" description={<p>いつも意識している、ものづくりの型です。</p>}>
        <ul className="stack-chips about-practices" aria-label="意識していること">
          {practices.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Elsewhere" description={<p>日々の更新は、ここでしています。</p>}>
        <ul className="about-elsewhere">
          {[
            { label: 'GitHub', href: site.githubUrl, note: '開発の記録' },
            { label: 'X', href: site.xUrl, note: '日々のこと' },
            { label: 'Instagram', href: site.instagramUrl, note: '写真・日常' },
            { label: 'YouTube', href: site.youtubeUrl, note: '動画' },
            { label: 'ivRooom', href: site.communityUrl, note: 'コミュニティ・チーム' },
          ].map((link) => (
            <li key={link.label}>
              <a href={link.href} rel="noopener noreferrer" target="_blank">
                <b>{link.label}</b>
                <span>{link.note}</span>
                <i aria-hidden="true">↗</i>
              </a>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Work with me" description={<p>こんなご相談をお待ちしています。</p>}>
        <div className="about-consult">
          {consultTopics.map((item) => (
            <article key={item.title} data-reveal>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </PageSection>

      <PageCTA
        title="まずは気軽にご相談ください"
        body="内容が固まっていなくても大丈夫です。フォームから、わかる範囲で教えてください。"
        href="/contact"
        label="Contact"
      />
    </main>
  )
}
