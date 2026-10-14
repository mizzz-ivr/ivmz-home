import Image from 'next/image'
import { SectionIndex, ToolboxMarquee } from '@/components/site/SiteEnhancements'
import { StructuredData } from '@/components/seo/StructuredData'
import { ChatOpenButton, FaqChat } from '@/components/site/FaqChat'
import { HeroPointerSignal } from '@/components/site/SiteExperience'
import { faqEntries } from '@/lib/faq-content'
import { createFaqStructuredData } from '@/lib/structured-data'
import { buildSteps } from '@/lib/about-content'
import { getHomeViewModel } from '@/lib/home-content'
import { site } from '@/lib/site'
import { workAreas } from '@/lib/work-areas'

export const revalidate = 300

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

const heroNameChars = Array.from('いゔる。')

const codeLines = [
  'const build = async () => {',
  '  understand();',
  '  implement();',
  '  shipSmall();',
  '  observe();',
  '  polish();',
  '}',
] as const

const bandWords = ['WEB', 'REALTIME AI', 'DISCORD', 'API', 'DATA', 'OPS', 'OSS'] as const

function CapabilityIcon({ index }: { index: number }) {
  const common = {
    'aria-hidden': true,
    className: 'capability-icon',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.6,
    viewBox: '0 0 32 32',
  }
  if (index === 0) {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="24" height="20" rx="3" />
        <path d="M4 12h24" />
        <circle cx="8.5" cy="9" r="0.6" />
        <circle cx="11.5" cy="9" r="0.6" />
        <path d="M11 20l-3-3 3-3M21 14l3 3-3 3M17 22l-2-10" />
      </svg>
    )
  }
  if (index === 1) {
    return (
      <svg {...common}>
        <path className="wave-a" d="M4 16h3M25 16h3" />
        <path className="wave-b" d="M9 11v10M13 7v18M17 12v8M21 9v14" />
      </svg>
    )
  }
  if (index === 2) {
    return (
      <svg {...common}>
        <ellipse cx="16" cy="8" rx="10" ry="4" />
        <path d="M6 8v8c0 2.2 4.5 4 10 4s10-1.8 10-4V8" />
        <path d="M6 16v8c0 2.2 4.5 4 10 4s10-1.8 10-4v-8" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M26 12a10 10 0 0 0-18-3M6 20a10 10 0 0 0 18 3" />
      <path d="M8 4v5h5M24 28v-5h-5" />
    </svg>
  )
}

const contactTopics = ['開発相談', 'お仕事', 'コラボ', '取材・登壇'] as const

export default async function HomePage() {
  const home = await getHomeViewModel()

  // Sections without real content are not shown at all (no empty headings on a fresh site).
  const latestColumns = [
    { key: 'writing', label: 'WRITING', href: '/blog', items: home.writing.slice(0, 3) },
    { key: 'news', label: 'NEWS', href: '/news', items: home.activity.slice(0, 3) },
    { key: 'schedule', label: 'SCHEDULE', href: '/schedule', items: home.schedule.slice(0, 3) },
  ].filter((column) => column.items.length > 0)

  const sectionIndex = [
    { id: 'top', label: 'TOP' },
    { id: 'works', label: 'WORKS' },
    { id: 'what-i-do', label: 'WHAT I DO' },
    { id: 'process', label: 'PROCESS' },
    { id: 'about', label: 'ABOUT' },
    ...(latestColumns.length > 0 ? [{ id: 'latest', label: 'LATEST' }] : []),
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'CONTACT' },
  ]

  return (
    <main id="main-content">
      <SectionIndex items={sectionIndex} />
      <section className="hero section-shell" id="top" aria-labelledby="hero-title">
        <HeroPointerSignal />
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="signal-label">PERSONAL WEB / PORTFOLIO PLATFORM</p>
          <h1 id="hero-title">
            <span className="hero-name">
              <span className="sr-only">いゔる。</span>
              <span className="hero-name-chars" aria-hidden="true">
                {heroNameChars.map((char, index) => (
                  <span key={index} style={{ '--i': index } as React.CSSProperties}>
                    {char}
                  </span>
                ))}
              </span>
            </span>
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
          <div className="avatar-halo" aria-hidden="true" />
          <div className="orbit" aria-hidden="true">
            <span className="orbit-ring" />
            <span className="orbit-sat sat-a">{'</>'}</span>
            <span className="orbit-sat sat-b">✦</span>
            <span className="orbit-sat sat-c">●</span>
          </div>
          <div className="avatar-frame avatar-orb">
            <Image
              src={site.githubAvatarUrl}
              alt="mizzzのGitHubアイコンに使用しているオリジナルキャラクター"
              width={720}
              height={720}
              priority
              sizes="(max-width: 760px) 70vw, 42vw"
            />
          </div>
          <span className="sparkle spark-a" aria-hidden="true">
            ✦
          </span>
          <span className="sparkle spark-b" aria-hidden="true">
            ✧
          </span>
          <span className="sparkle spark-c" aria-hidden="true">
            ✦
          </span>
          <span className="pop-sticker sticker-a" aria-hidden="true">
            ✦ BUILD · SHIP · POLISH
          </span>
          <span className="pop-sticker sticker-b" aria-hidden="true">
            ivmz ★
          </span>
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
          SCROLL <span aria-hidden="true">↓</span>
        </a>
      </section>

      <ToolboxMarquee tools={toolbox} />

      <section className="section-shell works-section" id="works" aria-labelledby="works-title">
        <div className="section-intro intro-ja" data-reveal>
          <p className="signal-label">01 / WORKS</p>
          <h2 id="works-title">
            公開しながら、<mark className="marker">つくる。</mark>
          </h2>
          <p>役割・制約・技術・運用まで含めて、つくったものを紹介します。</p>
          <a className="snapshot-destination" href="/works">
            Works をすべて見る →
          </a>
        </div>
        <ul className="area-chips" aria-label="Work areas">
          {workAreas.map((area) => (
            <li key={area.id}>
              <a href={`/works#area-${area.id}`}>
                <b>{area.index}</b>
                {area.title}
              </a>
            </li>
          ))}
        </ul>
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
                  詳しく見る <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="kinetic-band" aria-hidden="true">
        <div className="kinetic-track">
          {[0, 1].map((group) => (
            <span key={group}>
              {bandWords.map((word) => (
                <b key={`${group}-${word}`}>
                  {word}
                  <i>✦</i>
                </b>
              ))}
            </span>
          ))}
        </div>
      </div>

      <section
        className="section-shell capability-section"
        id="what-i-do"
        aria-labelledby="capability-title"
      >
        <div className="section-intro compact-intro intro-ja" data-reveal>
          <p className="signal-label">02 / WHAT I DO</p>
          <h2 id="capability-title">
            画面から、<mark className="marker">運用まで。</mark>
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
              <CapabilityIcon index={index} />
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
        <div className="section-intro compact-intro intro-ja" data-reveal>
          <p className="signal-label">03 / HOW I BUILD</p>
          <h2 id="process-title">
            作って終わりに<mark className="marker">しない。</mark>
          </h2>
          <p>公開してから磨く、一周ぶんの開発の流れです。</p>
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
          <p className="signal-label">04 / ABOUT</p>
          <h2 id="about-title">画面の向こう側まで、つくる。</h2>
          <p className="about-lead">
            実装することが好きです。設計を理解したうえで手を動かし、小さく公開して、反応と運用から磨き続けます。
          </p>
          <p>
            コード・UI・インフラを別々の成果物として扱わず、「人が使い続けられるか」を境界に考えるのが、自分の開発スタイルです。
          </p>
          <a className="snapshot-destination" href="/about">
            プロフィールを見る →
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
              <code>
                {codeLines.map((line, index) => (
                  <span
                    className="code-line"
                    key={line}
                    style={{ '--i': index } as React.CSSProperties}
                  >
                    {line}
                  </span>
                ))}
              </code>
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

      {latestColumns.length > 0 ? (
        <section
          className="section-shell latest-section"
          id="latest"
          aria-labelledby="latest-title"
        >
          <div className="section-intro compact-intro intro-ja" data-reveal>
            <p className="signal-label">05 / LATEST</p>
            <h2 id="latest-title">
              <mark className="marker">最新</mark>の動き
            </h2>
          </div>
          <div className="latest-grid" data-count={latestColumns.length}>
            {latestColumns.map((column, columnIndex) => (
              <div
                className="latest-column"
                key={column.key}
                data-reveal
                style={{ '--reveal-delay': `${columnIndex * 90}ms` } as React.CSSProperties}
              >
                <header>
                  <span>{column.label}</span>
                  <a href={column.href}>すべて見る →</a>
                </header>
                <ul>
                  {column.items.map((item) => (
                    <li key={`${item.label}-${item.title}`}>
                      <small>{item.label}</small>
                      {item.href ? (
                        <a href={item.href}>
                          <strong>{item.title}</strong>
                        </a>
                      ) : (
                        <strong>{item.title}</strong>
                      )}
                      <p>{item.meta}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-shell faq-section" id="faq" aria-labelledby="faq-title">
        <div className="section-intro compact-intro intro-ja" data-reveal>
          <p className="signal-label">{latestColumns.length > 0 ? '06' : '05'} / FAQ</p>
          <h2 id="faq-title">
            よくある<mark className="marker">質問。</mark>
          </h2>
          <p>知りたいことは、ここか、チャットで。わからないときは、フォームからどうぞ。</p>
        </div>
        <div className="faq-layout">
          <div className="faq-list" data-reveal>
            {faqEntries.map((entry) => (
              <details key={entry.id} className="faq-item">
                <summary>
                  <span>{entry.question}</span>
                  <i aria-hidden="true" />
                </summary>
                <div className="faq-answer">
                  {entry.answer.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {entry.link ? (
                    <a
                      className="snapshot-destination"
                      href={entry.link.href}
                      {...(entry.link.href.startsWith('https://')
                        ? { rel: 'noopener noreferrer', target: '_blank' }
                        : {})}
                    >
                      {entry.link.label} →
                    </a>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
          <aside className="faq-chat-cta" data-reveal data-spotlight>
            <span className="pop-sticker faq-sticker" aria-hidden="true">
              ✦ ASK ME
            </span>
            <h3>チャットで聞いてみる</h3>
            <p>質問を選ぶか、入力するだけ。FAQにあることなら、その場でお答えします。</p>
            <ChatOpenButton>
              チャットを開く <span aria-hidden="true">💬</span>
            </ChatOpenButton>
          </aside>
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
          <p className="signal-label">{latestColumns.length > 0 ? '07' : '06'} / CONTACT</p>
          <h2 id="contact-title">
            ご相談は、<mark className="marker">気軽に。</mark>
          </h2>
          <p>
            開発のご相談、お仕事、コラボレーション、取材・登壇など。内容が固まっていなくても大丈夫です。
          </p>
          <ul className="topic-chips" aria-label="ご相談の例">
            {contactTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </div>
        <div className="contact-routes" data-reveal>
          <a href="/contact">
            <span>CONTACT</span>
            <strong>お問い合わせフォームへ</strong>
            <b aria-hidden="true">→</b>
          </a>
          {home.socials.length > 0 ? (
            <ul className="social-row" aria-label="SNS・外部リンク">
              {home.socials.map((social) => (
                <li key={social.href}>
                  <a href={social.href}>
                    {social.label}
                    <small>{social.handle}</small>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
      <StructuredData data={createFaqStructuredData(faqEntries)} />
      <FaqChat />
    </main>
  )
}
