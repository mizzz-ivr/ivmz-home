import Image from 'next/image'
import { SectionIndex } from '@/components/site/SiteEnhancements'
import { HeroPointerSignal } from '@/components/site/SiteExperience'
import { getHomeViewModel } from '@/lib/home-content'
import { site } from '@/lib/site'

export const revalidate = 300

const sectionIndex = [
  { id: 'top', label: 'TOP' },
  { id: 'works', label: 'WORKS' },
  { id: 'what-i-do', label: 'WHAT I DO' },
  { id: 'process', label: 'PROCESS' },
  { id: 'about', label: 'ABOUT' },
  { id: 'writing', label: 'WRITING' },
  { id: 'activity', label: 'NEWS' },
  { id: 'schedule', label: 'SCHEDULE' },
  { id: 'social', label: 'SOCIAL' },
  { id: 'contact', label: 'CONTACT' },
] as const

const toolbox = [
  'TypeScript',
  'Next.js',
  'React',
  'Node.js',
  'Go',
  'Flask',
  'PostgreSQL',
  'Payload CMS',
  'Docker',
  'GitHub Actions',
  'Netlify',
  'Discord',
  'Realtime AI',
] as const

const buildSteps = [
  {
    step: 'UNDERSTAND',
    title: '課題と制約を読む',
    description: '誰が・何のために・どこまで使うのか。作る前に前提と境界を言葉にします。',
  },
  {
    step: 'IMPLEMENT',
    title: '設計を理解して手を動かす',
    description: 'UI・API・データを分断せず、一本の体験として実装します。',
  },
  {
    step: 'SHIP SMALL',
    title: '小さく公開する',
    description: 'Previewとリリースを早く回し、実際に触れる状態で判断できるようにします。',
  },
  {
    step: 'OBSERVE',
    title: '反応と運用を見る',
    description: 'ログ・監視・フィードバックから、直すべき場所を事実で見つけます。',
  },
  {
    step: 'POLISH',
    title: '磨き続ける',
    description: '変更し続けられる状態を保ったまま、体験と品質を少しずつ上げていきます。',
  },
] as const

const contactTopics = ['開発相談', 'お仕事', 'コラボ', '取材・登壇'] as const

export default async function HomePage() {
  const home = await getHomeViewModel()

  return (
    <main id="main-content">
      <SectionIndex items={sectionIndex} />
      <section className="hero section-shell" id="top" aria-labelledby="hero-title">
        <HeroPointerSignal />
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="signal-label">PERSONAL WEB / PORTFOLIO PLATFORM</p>
          <h1 id="hero-title">
            <span className="hero-name">いゔる。</span>
            <span className="hero-alias">
              a.k.a. mizzz（ずーみー）
              <svg className="hero-underline" viewBox="0 0 320 16" aria-hidden="true">
                <path d="M3 10 C48 3 92 14 142 7 S246 5 317 9" />
              </svg>
            </span>
          </h1>
          <p className="hero-role">Product-minded Full Stack Developer / Creator</p>
          <p className="hero-description">
            Web・Realtime AI・Discord・API・DB・運用まで。
            <br className="desktop-break" />
            アイデアを、触れて、使えて、育てられるプロダクトへ。
          </p>
          <div className="hero-actions">
            <a className="action-link action-primary" href="/works">
              Selected Works <span aria-hidden="true">↗</span>
            </a>
            <a className="action-link" href="/contact">
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

      <div className="toolbox-marquee" role="group" aria-label="主なツールと技術">
        <ul className="toolbox-track">
          {toolbox.map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
        <ul className="toolbox-track" aria-hidden="true">
          {toolbox.map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
      </div>

      <section className="section-shell works-section" id="works" aria-labelledby="works-title">
        <div className="section-intro" data-reveal>
          <p className="signal-label">01 / SELECTED WORKS</p>
          <h2 id="works-title">
            Built in public.
            <br />
            Decisions included.
          </h2>
          <p>完成画面だけではなく、役割・制約・技術・運用までCase Studyとして見せる。</p>
          <a className="snapshot-destination" href="/works">
            View all Works →
          </a>
        </div>
        <div className="works-rail">
          {home.works.map((work, index) => (
            <article
              className="work-entry"
              key={work.title}
              data-reveal
              data-spotlight
              style={{ '--reveal-delay': `${index * 90}ms` } as React.CSSProperties}
            >
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
                <ul className="stack-chips" aria-label="Tech stack">
                  {work.stack.split(' · ').map((tech) => (
                    <li key={tech}>{tech}</li>
                  ))}
                </ul>
                <a className="stretched-link" href={work.href}>
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
        <div className="section-intro compact-intro" data-reveal>
          <p className="signal-label">02 / WHAT I DO</p>
          <h2 id="capability-title">
            From interface
            <br />
            to operation.
          </h2>
        </div>
        <div className="capability-lines">
          {home.capabilities.map((item, index) => (
            <article
              key={item.title}
              data-reveal
              data-spotlight
              style={{ '--reveal-delay': `${index * 80}ms` } as React.CSSProperties}
            >
              <span className="capability-index">0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <small>{item.tools}</small>
            </article>
          ))}
        </div>
      </section>

      <section
        className="section-shell process-section"
        id="process"
        aria-labelledby="process-title"
      >
        <div className="section-intro compact-intro" data-reveal>
          <p className="signal-label">03 / HOW I BUILD</p>
          <h2 id="process-title">
            Understand,
            <br />
            ship, refine.
          </h2>
          <p>作って終わりにしない。公開してから磨く、一周ぶんの開発の流れです。</p>
        </div>
        <ol className="process-steps">
          {buildSteps.map((item, index) => (
            <li
              key={item.step}
              data-reveal
              data-spotlight
              style={{ '--reveal-delay': `${index * 70}ms` } as React.CSSProperties}
            >
              <span className="process-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <b>{item.step}</b>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section-shell about-section" id="about" aria-labelledby="about-title">
        <div className="about-copy" data-reveal>
          <p className="signal-label">04 / ABOUT SNAPSHOT</p>
          <h2 id="about-title">画面の向こう側まで、つくる。</h2>
          <p className="about-lead">
            実装することが好きです。設計を理解したうえで手を動かし、小さく公開して、反応と運用から磨き続けます。
          </p>
          <p>
            コード・UI・インフラを別々の成果物として扱わず、「人が使い続けられるか」を境界に考えるのが自分の開発スタイルです。
          </p>
          <a className="snapshot-destination" href="/about">
            More about me →
          </a>
        </div>
        <div className="about-workbench" data-reveal aria-label="Development workbench fragments">
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
        <div className="section-intro" data-reveal>
          <p className="signal-label">05 / LATEST WRITING</p>
          <h2 id="writing-title">
            Notes become
            <br />
            reusable knowledge.
          </h2>
          <a className="snapshot-destination" href="/blog">
            View all Writing →
          </a>
        </div>
        <div className="editorial-stack" data-reveal>
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
        <div className="section-intro compact-intro" data-reveal>
          <p className="signal-label">06 / NEWS &amp; ACTIVITY</p>
          <h2 id="activity-title">What is moving now.</h2>
          <a className="snapshot-destination" href="/news">
            View all News →
          </a>
        </div>
        <div className="activity-stream" data-reveal>
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
        <div className="section-intro compact-intro" data-reveal>
          <p className="signal-label">07 / SCHEDULE</p>
          <h2 id="schedule-title">
            Public plans,
            <br />
            not a private calendar.
          </h2>
          <p>イベント・公開・リリースなど、外部へ見せてよい予定だけを扱います。</p>
          <a className="snapshot-destination" href="/schedule">
            Open full Schedule →
          </a>
        </div>
        <div className="timeline-rail" role="list" data-reveal>
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
        <div className="section-intro compact-intro" data-reveal>
          <p className="signal-label">08 / SOCIAL SIGNAL</p>
          <h2 id="social-title">Find the live edges.</h2>
          <p>外部サービスが落ちてもこのサイトは残る。最新活動はリンクを常時fallbackとして持つ。</p>
          <a className="snapshot-destination" href="/links">
            Open Links →
          </a>
        </div>
        <div className="social-links" data-reveal>
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
        <div className="contact-copy" data-reveal>
          <p className="signal-label">09 / CONTACT</p>
          <h2 id="contact-title">
            Let’s make something
            <br />
            people can use.
          </h2>
          <p>
            開発相談、仕事、コラボ、取材など。配送先を選ばせず、Contactを一つの正式destinationへ整理します。
          </p>
          <ul className="topic-chips" aria-label="ご相談の例">
            {contactTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </div>
        <div className="contact-routes" data-reveal>
          <a href="/contact">
            <span>CONTACT / ROUTING</span>
            <strong>Open contact destination</strong>
            <b aria-hidden="true">→</b>
          </a>
        </div>
      </section>
    </main>
  )
}
