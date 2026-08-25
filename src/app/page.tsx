import Image from 'next/image'
import { site } from '@/lib/site'

const works = [
  {
    title: 'RooMate Voice',
    summary: 'Discord × Realtime AI Voice Bot。会話体験から運用までつなぐOSS。',
    stack: 'TypeScript / React / Realtime AI / Discord / Docker',
    href: 'https://github.com/mizzz-ivr/roomate-voice',
  },
  {
    title: 'QuizVerse',
    summary: 'クイズ作成・公開・プレイ・ランキング・レビューを扱うWeb Platform。',
    stack: 'React / Flask / PostgreSQL / Docker',
    href: 'https://github.com/mizzz-ivr/quizverse',
  },
  {
    title: 'Site Sentry Go',
    summary: '複数URLの定期監視、UP/DOWN、応答時間、履歴を扱う軽量監視ツール。',
    stack: 'Go / SQLite / HTTP / Docker',
    href: 'https://github.com/mizzz-ivr/site-sentry-go',
  },
] as const

const focus = [
  ['WEB', 'React / TypeScript'],
  ['AI', 'Realtime / Agents'],
  ['COMMUNITY', 'Discord / Voice'],
  ['OPS', 'Docker / CI / Cloud'],
] as const

export default function HomePage() {
  return (
    <main>
      <header className="site-header" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="mizzz home">mizzz</a>
        <nav>
          <a href="#works">Works</a>
          <a href="#about">About</a>
          <a href="#writing">Writing</a>
          <a href="#schedule">Schedule</a>
          <a className="nav-cta" href="#contact">Contact</a>
        </nav>
      </header>

      <section className="hero scene" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">
            <span>いゔる。</span>
            <small>a.k.a. mizzz（ずーみー）</small>
          </h1>
          <p className="hero-role">Product-minded Full Stack Developer</p>
          <p className="hero-description">
            Web・Realtime AI・Discord・API・DB・運用まで、アイデアを触れるものにして、育てられる状態までつなげます。
          </p>
          <p className="hero-motto">BUILD SMALL · POLISH FAST · OPERATE SAFELY</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#works">Selected Works</a>
            <a className="button button-ghost" href="#contact">Contact</a>
          </div>
        </div>

        <div className="identity-stage" aria-label="mizzz original character identity">
          <div className="identity-shadow" aria-hidden="true" />
          <div className="avatar-frame">
            <Image
              src={site.githubAvatarUrl}
              alt="mizzzのGitHubアイコンに使用しているオリジナルキャラクター"
              width={460}
              height={460}
              priority
            />
          </div>
          <span className="scribble scribble-a" aria-hidden="true">/////</span>
          <span className="scribble scribble-b" aria-hidden="true">BUILDING...</span>
          <span className="signal-tag tag-a" aria-hidden="true">React</span>
          <span className="signal-tag tag-b" aria-hidden="true">Realtime</span>
          <span className="signal-tag tag-c" aria-hidden="true">OSS</span>
          <span className="cursor-mark" aria-hidden="true">↗</span>
        </div>
        <a className="scroll-cue" href="#works">SCROLL ↓</a>
      </section>

      <section className="scene works" id="works" aria-labelledby="works-title">
        <div className="section-heading">
          <p>01 / SELECTED WORKS</p>
          <h2 id="works-title">Public builds, with the decisions left in.</h2>
          <span>完成画面だけでなく、役割・判断・運用までCase Studyとして見せる。</span>
        </div>
        <div className="works-corridor">
          {works.map((work, index) => (
            <article className={`work-panel work-${index + 1}`} key={work.title}>
              <span className="work-index">0{index + 1}</span>
              <h3>{work.title}</h3>
              <p>{work.summary}</p>
              <small>{work.stack}</small>
              <a href={work.href}>View repository ↗</a>
            </article>
          ))}
        </div>
      </section>

      <section className="scene about" id="about" aria-labelledby="about-title">
        <div className="section-heading about-heading">
          <p>02 / ABOUT</p>
          <h2 id="about-title">画面の向こう側までつくる。</h2>
          <span>UIだけで終わらせず、API・データ・権限・ログ・デプロイまで。</span>
        </div>
        <div className="about-layers">
          {focus.map(([label, text], index) => (
            <div className={`about-plane about-plane-${index + 1}`} key={label}>
              <strong>{label}</strong><span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="scene writing" id="writing" aria-labelledby="writing-title">
        <div className="section-heading">
          <p>03 / WRITING</p>
          <h2 id="writing-title">Notes become reusable knowledge.</h2>
          <span>技術記事・設計判断・制作記録を、読み返せる形で積み上げる。</span>
        </div>
        <div className="writing-stack">
          <article><small>TECHNICAL</small><h3>Engineering Notes</h3><p>実装で得た知見を再現可能な形に。</p></article>
          <article><small>CASE STUDY</small><h3>Build Decisions</h3><p>選定理由・制約・トレードオフまで残す。</p></article>
          <article><small>ACTIVITY</small><h3>Release Log</h3><p>公開・改善・運用を継続して記録する。</p></article>
        </div>
      </section>

      <section className="scene schedule" id="schedule" aria-labelledby="schedule-title">
        <div className="section-heading">
          <p>04 / SCHEDULE</p>
          <h2 id="schedule-title">Public plans, not a private calendar.</h2>
          <span>Event / Release / Meetup / Publication / Availabilityだけを公開する。</span>
        </div>
        <div className="timeline" role="list">
          <div role="listitem"><i /><strong>EVENT</strong><span>Public schedule entry</span></div>
          <div role="listitem"><i /><strong>RELEASE</strong><span>Product / OSS release</span></div>
          <div role="listitem"><i /><strong>PUBLICATION</strong><span>Article / announcement</span></div>
        </div>
      </section>

      <section className="scene contact" id="contact" aria-labelledby="contact-title">
        <div className="contact-signal" aria-hidden="true">mizzz / signal / contact</div>
        <div className="contact-copy">
          <p>05 / CONTACT</p>
          <h2 id="contact-title">Let’s make something people can use.</h2>
          <span>問い合わせカテゴリからserver-sideで配送先を決定します。</span>
        </div>
        <div className="contact-routes">
          <a href={`mailto:${site.contactEmail}`}><strong>Personal / Development / Job / Collaboration / Media</strong><span>{site.contactEmail}</span></a>
          <a href={`mailto:${site.teamEmail}`}><strong>ivRooom / Community / Team</strong><span>{site.teamEmail}</span></a>
          <a href={`mailto:${site.securityEmail}`}><strong>Security</strong><span>{site.securityEmail}</span></a>
        </div>
        <footer>
          <a href={site.githubUrl}>GitHub</a><a href={site.communityUrl}>ivRooom</a><a href={site.url}>mizzz.ivrm.jp</a>
        </footer>
      </section>
    </main>
  )
}
