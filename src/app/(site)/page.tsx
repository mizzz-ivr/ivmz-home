import Image from 'next/image'
import { HeroPointerSignal } from '@/components/site/SiteExperience'
import { getHomeViewModel } from '@/lib/home-content'
import { site } from '@/lib/site'

export default function HomePage() {
  const home = getHomeViewModel()

  return (
    <main id="main-content">
      <section className="hero section-shell" id="top" aria-labelledby="hero-title">
        <HeroPointerSignal />
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="signal-label">PERSONAL WEB / PORTFOLIO PLATFORM</p>
          <h1 id="hero-title">
            <span className="hero-name">いゔる。</span>
            <span className="hero-alias">a.k.a. mizzz（ずーみー）</span>
          </h1>
          <p className="hero-role">Product-minded Full Stack Developer / Creator</p>
          <p className="hero-description">
            Web・Realtime AI・Discord・API・DB・運用まで。
            <br className="desktop-break" />
            アイデアを、触れて、使えて、育てられるプロダクトへ。
          </p>
          <div className="hero-actions">
            <a className="action-link action-primary" href="#works">
              Selected Works <span aria-hidden="true">↗</span>
            </a>
            <a className="action-link" href="#contact">
              Contact <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="hero-status" aria-label="Current focus">
            <span>
              <i aria-hidden="true" /> CURRENT SIGNAL
            </span>
            <strong>BUILD SMALL · POLISH FAST · OPERATE SAFELY</strong>
          </div>
        </div>

        <div className="identity-stage" aria-label="mizzz original character identity">
          <div className="depth-plane depth-plane-back" aria-hidden="true">
            WEB / AI / OSS
          </div>
          <div className="avatar-frame">
            <Image
              src={site.githubAvatarUrl}
              alt="mizzzのGitHubアイコンに使用しているオリジナルキャラクター"
              width={720}
              height={720}
              priority
              sizes="(max-width: 760px) 70vw, 42vw"
            />
          </div>
          <div className="selection-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <span className="floating-note note-a" aria-hidden="true">
            [ creator / engineer ]
          </span>
          <span className="floating-note note-b" aria-hidden="true">
            building...
          </span>
          <span className="floating-note note-c" aria-hidden="true">
            01 / identity
          </span>
          <svg className="rough-line" viewBox="0 0 180 70" aria-hidden="true">
            <path d="M4 54 C36 10 68 68 96 28 S144 50 176 8" />
          </svg>
        </div>
        <a className="scroll-signal" href="#works">
          SCROLL TO SIGNAL <span aria-hidden="true">↓</span>
        </a>
      </section>

      <section className="section-shell works-section" id="works" aria-labelledby="works-title">
        <div className="section-intro">
          <p className="signal-label">01 / SELECTED WORKS</p>
          <h2 id="works-title">
            Built in public.
            <br />
            Decisions included.
          </h2>
          <p>完成画面だけではなく、役割・制約・技術・運用までCase Studyとして見せる。</p>
        </div>
        <div className="works-rail">
          {home.works.map((work, index) => (
            <article className="work-entry" key={work.title}>
              <div className="work-number" aria-hidden="true">
                0{index + 1}
              </div>
              <div className="work-copy">
                <span>{work.signal}</span>
                <h3>{work.title}</h3>
                <p>{work.summary}</p>
              </div>
              <div className="work-meta">
                <span>{work.role}</span>
                <small>{work.stack}</small>
                <a href={work.href}>
                  View repository <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="section-shell capability-section"
        id="what-i-do"
        aria-labelledby="capability-title"
      >
        <div className="section-intro compact-intro">
          <p className="signal-label">02 / WHAT I DO</p>
          <h2 id="capability-title">
            From interface
            <br />
            to operation.
          </h2>
        </div>
        <div className="capability-lines">
          {home.capabilities.map((item, index) => (
            <article key={item.title}>
              <span className="capability-index">0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <small>{item.tools}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell about-section" id="about" aria-labelledby="about-title">
        <div className="about-copy">
          <p className="signal-label">03 / ABOUT SNAPSHOT</p>
          <h2 id="about-title">画面の向こう側まで、つくる。</h2>
          <p className="about-lead">
            実装することが好きです。設計を理解したうえで手を動かし、小さく公開して、反応と運用から磨き続けます。
          </p>
          <p>
            コード・UI・インフラを別々の成果物として扱わず、「人が使い続けられるか」を境界に考えるのが自分の開発スタイルです。
          </p>
          <a className="text-link" href={site.githubUrl}>
            Explore GitHub activity <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="about-workbench" aria-label="Development workbench fragments">
          <div className="workbench-window window-main">
            <div className="window-chrome">
              <span />
              <span />
              <span />
              <b>workbench.ts</b>
            </div>
            <pre aria-label="Development philosophy code fragment">
              <code>{`const build = async () => {
  understand();
  implement();
  shipSmall();
  observe();
  polish();
}`}</code>
            </pre>
          </div>
          <div className="workbench-window window-note" aria-hidden="true">
            <span>signal.log</span>
            <strong>ship → learn → refine</strong>
          </div>
          <div className="workbench-cross" aria-hidden="true">
            +
          </div>
        </div>
      </section>

      <section
        className="section-shell writing-section"
        id="writing"
        aria-labelledby="writing-title"
      >
        <div className="section-intro">
          <p className="signal-label">04 / LATEST WRITING</p>
          <h2 id="writing-title">
            Notes become
            <br />
            reusable knowledge.
          </h2>
        </div>
        <div className="editorial-stack">
          {home.writing.map((item, index) => (
            <article key={item.title}>
              <div>
                <span>{item.label}</span>
                <small>0{index + 1}</small>
              </div>
              <h3>{item.title}</h3>
              <p>{item.meta}</p>
              {item.href && (
                <a href={item.href}>
                  Read on Qiita <span aria-hidden="true">↗</span>
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      <section
        className="section-shell activity-section"
        id="activity"
        aria-labelledby="activity-title"
      >
        <div className="section-intro compact-intro">
          <p className="signal-label">05 / NEWS & ACTIVITY</p>
          <h2 id="activity-title">What is moving now.</h2>
        </div>
        <div className="activity-stream">
          {home.activity.map((item) => (
            <article key={item.title}>
              <span>{item.label}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.meta}</p>
              </div>
              {item.href ? (
                <a href={item.href} aria-label={`${item.title}を開く`}>
                  ↗
                </a>
              ) : (
                <b aria-hidden="true">•</b>
              )}
            </article>
          ))}
        </div>
      </section>

      <section
        className="section-shell schedule-section"
        id="schedule"
        aria-labelledby="schedule-title"
      >
        <div className="section-intro compact-intro">
          <p className="signal-label">06 / SCHEDULE</p>
          <h2 id="schedule-title">
            Public plans,
            <br />
            not a private calendar.
          </h2>
          <p>イベント・公開・リリースなど、外部へ見せてよい予定だけを扱います。</p>
        </div>
        <div className="timeline-rail" role="list">
          {home.schedule.map((item, index) => (
            <div role="listitem" key={item.label}>
              <i aria-hidden="true" />
              <span>0{index + 1}</span>
              <strong>{item.label}</strong>
              <div>
                <b>{item.title}</b>
                <small>{item.meta}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell social-section" id="social" aria-labelledby="social-title">
        <div className="section-intro compact-intro">
          <p className="signal-label">07 / SOCIAL SIGNAL</p>
          <h2 id="social-title">Find the live edges.</h2>
          <p>外部サービスが落ちてもこのサイトは残る。最新活動はリンクを常時fallbackとして持つ。</p>
        </div>
        <div className="social-links">
          {home.socials.map((social, index) => (
            <a href={social.href} key={social.label}>
              <span>0{index + 1}</span>
              <strong>{social.label}</strong>
              <small>{social.handle}</small>
              <b aria-hidden="true">↗</b>
            </a>
          ))}
        </div>
      </section>

      <section
        className="section-shell contact-section"
        id="contact"
        aria-labelledby="contact-title"
      >
        <div className="contact-signal-art" aria-hidden="true">
          IVMZ / SIGNAL / CONTACT
        </div>
        <div className="contact-copy">
          <p className="signal-label">08 / CONTACT</p>
          <h2 id="contact-title">
            Let’s make something
            <br />
            people can use.
          </h2>
          <p>
            開発相談、仕事、コラボ、取材など。用途ごとのIdentityを保ちつつ、ここを入口にします。
          </p>
        </div>
        <div className="contact-routes">
          <a href={`mailto:${site.contactEmail}`}>
            <span>GENERAL / PERSONAL</span>
            <strong>{site.contactEmail}</strong>
            <b aria-hidden="true">↗</b>
          </a>
          <a href={`mailto:${site.developerEmail}`}>
            <span>DEVELOPMENT / OSS</span>
            <strong>{site.developerEmail}</strong>
            <b aria-hidden="true">↗</b>
          </a>
          <a href={`mailto:${site.teamEmail}`}>
            <span>IVROOOM / TEAM</span>
            <strong>{site.teamEmail}</strong>
            <b aria-hidden="true">↗</b>
          </a>
          <a href={`mailto:${site.securityEmail}`}>
            <span>SECURITY</span>
            <strong>{site.securityEmail}</strong>
            <b aria-hidden="true">↗</b>
          </a>
        </div>
        <footer className="site-footer">
          <span>© 2026 ivmz</span>
          <span>Canonical / ivmz.ivrm.jp</span>
          <a href="#top">BACK TO TOP ↑</a>
        </footer>
      </section>
    </main>
  )
}
