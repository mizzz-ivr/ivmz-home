# ivumz-home

Public repository for **いゔる。 a.k.a. mizzz（ずーみー）** — a Personal Web Platform for portfolio, case studies, writing, news, public schedule, social links, and contact conversion.

- Production canonical: <https://mizzz.ivrm.jp>
- Community / Team root: <https://ivrm.jp>
- GitHub: <https://github.com/mizzz-ivr>
- Personal contact: `mizzz@ivrm.jp`
- Team contact: `contact@ivrm.jp`
- Security: `security@ivrm.jp`

## Identity / design rule

The **original character currently used as the GitHub avatar is the primary visual identity**. Purple Signal is an accent system around that character — not a space/planet theme.

Use:
- the current character silhouette, purple eyes, monochrome + violet balance, relaxed hand-drawn feeling
- depth planes, cursor marks, rough lines, code/workbench fragments, subtle signal glow
- strong editorial typography and whitespace

Do not turn the brand into:
- a generic outer-space / planet / galaxy aesthetic
- a generic SaaS bento dashboard
- an unrelated cyberpunk mascot
- character redraws that drift away from the canonical avatar without an approved source image

See `docs/design-direction.md`.

## Product principles

1. Content first; 3D is progressive enhancement.
2. Primary content is SSR/DOM and never waits for animation.
3. Character-first Purple Signal identity; no generic SaaS bento or literal space theme.
4. Desktop, mobile, keyboard, screen reader, reduced motion, and WebGL-failure fallback are first-class.
5. Repository is the Source of Truth for implementation; Notion is the Source of Truth for long-term product decisions.
6. Runtime and persistence stay portable: no Cloudflare Workers/D1/R2 coupling.

## Foundation stack

- Next.js 16 / App Router
- React 19 / TypeScript
- Tailwind CSS + CSS custom-property design tokens
- Payload CMS (planned, integrated into Next.js)
- PostgreSQL via `DATABASE_URL` (provider-neutral)
- AWS S3 for media is the preferred portable storage target
- Vitest / Testing Library / Playwright
- GitHub Actions: format / lint / typecheck / test / build

## Hosting direction

**Current best launch candidate: Netlify**, while keeping the application deployable as a normal Node/Next.js application.

Reasons:
- current Netlify Next.js runtime supports App Router, SSR, RSC, Streaming, Server Actions and `next/after`
- AWS Amplify's documented managed Next.js support is currently through Next.js 15, which conflicts with the Next.js 16 direction
- Payload can run anywhere Next.js runs, including Netlify and AWS
- DNS is intentionally outside application architecture so `mizzz.ivrm.jp` can move from Cloudflare DNS to Amazon Route 53 later without rewriting the application

AWS-first remains a future option, likely via ECS/Fargate + RDS/Aurora PostgreSQL + S3 + SES + Route 53 when the operational value justifies it.

See `docs/hosting.md`.

## Information architecture

```text
/
├─ /about
├─ /works
│  └─ /works/[slug]
├─ /blog
│  └─ /blog/[slug]
├─ /news
│  └─ /news/[slug]
├─ /schedule
├─ /store          # Phase 2, initially Coming Soon
├─ /contact
├─ /links
└─ /legal
   ├─ /privacy
   ├─ /terms
   └─ /tokushoho   # enabled with Store
```

## Motion direction

The signature scroll experience is still depth-based, but the visual story is no longer “travel through space”.

- Hero: character / workbench layers
- Works: project corridor
- About: identity / skill layers
- Writing: article stack
- Schedule: depth timeline
- Contact: signals converge into a normal DOM form

Heavy WebGL is optional and lazy-loaded. CSS transforms are the baseline.

## Local development

```bash
corepack enable
pnpm install
pnpm dev
```

Quality gate:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Docs

- `docs/architecture.md`
- `docs/hosting.md`
- `docs/design-direction.md`
- `docs/information-architecture.md`
- `docs/adr/0001-portable-hosting.md`
- `docs/adr/0002-character-first-identity.md`
