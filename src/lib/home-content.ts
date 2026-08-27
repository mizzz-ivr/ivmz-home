import {
  getEnabledSocialLinks,
  getLatestNews,
  getLatestPosts,
  getPublishedWorks,
  getUpcomingSchedule,
} from '@/lib/payload-content'

export type HomeWork = {
  title: string
  summary: string
  role: string
  stack: string
  href: string
  signal: string
}

export type HomeFeedItem = {
  label: string
  title: string
  meta: string
  href?: string
}

export type HomeViewModel = {
  works: HomeWork[]
  capabilities: Array<{ title: string; description: string; tools: string }>
  writing: HomeFeedItem[]
  activity: HomeFeedItem[]
  schedule: HomeFeedItem[]
  socials: Array<{ label: string; handle: string; href: string }>
}

type HomePayloadResults = {
  worksResult: Awaited<ReturnType<typeof getPublishedWorks>>
  postsResult: Awaited<ReturnType<typeof getLatestPosts>>
  newsResult: Awaited<ReturnType<typeof getLatestNews>>
  scheduleResult: Awaited<ReturnType<typeof getUpcomingSchedule>>
  socialsResult: Awaited<ReturnType<typeof getEnabledSocialLinks>>
}

const HOME_PAYLOAD_TIMEOUT_MS = 4_000

const staticHomeViewModel: HomeViewModel = {
  works: [
    {
      title: 'RooMate Voice',
      summary: 'Discord × Realtime AI Voice Bot。会話体験からWindows配布・運用まで育てるOSS。',
      role: 'Product / Full Stack / Voice AI',
      stack: 'TypeScript · Electron · Discord · Realtime AI',
      href: 'https://github.com/mizzz-ivr/roomate-voice',
      signal: 'VOICE / AI',
    },
    {
      title: 'QuizVerse',
      summary: '作る・遊ぶ・競う・振り返るを一つにつなぐ、クイズ向けWeb Platform。',
      role: 'Full Stack / Product Design',
      stack: 'React · Flask · PostgreSQL · Docker',
      href: 'https://github.com/mizzz-ivr/quizverse',
      signal: 'WEB / DATA',
    },
    {
      title: 'Site Sentry Go',
      summary: '複数URLの死活・応答時間・履歴を扱う、運用寄りの軽量モニタリングツール。',
      role: 'Backend / Operations',
      stack: 'Go · SQLite · HTTP · Docker',
      href: 'https://github.com/mizzz-ivr/site-sentry-go',
      signal: 'OPS / GO',
    },
  ],
  capabilities: [
    {
      title: 'Web Product',
      description: '画面だけで終わらせず、認証・API・データ・運用まで一つの体験として実装。',
      tools: 'React / Next.js / TypeScript / Node.js',
    },
    {
      title: 'Realtime & AI',
      description: '音声・Discord・Realtime APIを、実際に使い続けられるプロダクトへ落とし込む。',
      tools: 'Realtime AI / Discord / Voice / Agents',
    },
    {
      title: 'Backend & Data',
      description: 'API、PostgreSQL、権限、migrationをフロントと分断せずに設計・実装。',
      tools: 'PostgreSQL / Payload / Flask / Go',
    },
    {
      title: 'Ship & Operate',
      description: 'CI、Docker、Preview、監視まで含めて「変更し続けられる状態」をつくる。',
      tools: 'Docker / GitHub Actions / Netlify / Cloud',
    },
  ],
  writing: [
    {
      label: 'TECHNICAL',
      title: 'Engineering notes that can be reproduced.',
      meta: '実装で得た知見を、あとから使える粒度で残す。',
      href: 'https://qiita.com/mizzz-ivr',
    },
    {
      label: 'CASE STUDY',
      title: 'Decisions, constraints, and trade-offs.',
      meta: '成果物だけでなく、なぜその形にしたかを記録する。',
    },
    {
      label: 'BUILD LOG',
      title: 'Small releases, continuous polish.',
      meta: '公開・改善・運用の流れそのものを発信する。',
    },
  ],
  activity: [
    {
      label: 'NOW',
      title: 'Personal Web Platform / Portfolio Platform 2026',
      meta: 'Visual foundation → content model → publishing experience',
    },
    {
      label: 'OSS',
      title: 'Shipping public repositories with reviewable decisions.',
      meta: 'GitHubを実装のSource of Truthとして継続更新。',
      href: 'https://github.com/mizzz-ivr',
    },
  ],
  schedule: [
    { label: 'EVENT', title: 'Public events / meetups', meta: '公開可能な予定だけを掲載' },
    { label: 'RELEASE', title: 'Product / OSS releases', meta: '公開・Preview・Release予定' },
    { label: 'PUBLICATION', title: 'Articles / announcements', meta: 'Qiita / Blog / News' },
  ],
  socials: [
    { label: 'GitHub', handle: 'mizzz-ivr', href: 'https://github.com/mizzz-ivr' },
    { label: 'Qiita', handle: 'mizzz-ivr', href: 'https://qiita.com/mizzz-ivr' },
    { label: 'X', handle: 'ivurugg', href: 'https://x.com/ivurugg' },
    { label: 'ivRooom', handle: 'ivrm.jp', href: 'https://ivrm.jp' },
  ],
}

function uppercaseLabel(value: string): string {
  return value.replaceAll('-', ' ').toUpperCase()
}

function compactText(value: string, maxLength = 180): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}…` : compact
}

function formatScheduleMeta(startAt: string, timezone: string, location?: string | null): string {
  let formatted: string

  try {
    formatted = new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(startAt))
  } catch {
    formatted = new Date(startAt).toISOString()
  }

  return location ? `${formatted} · ${location}` : formatted
}

async function loadHomePayloadResults(): Promise<HomePayloadResults> {
  // Keep the Home request deliberately low-concurrency. Payload initialization can retain
  // a connection, so firing every collection query at once unnecessarily consumes the
  // small serverless application pool and makes cold/warm transitions less predictable.
  const worksResult = await getPublishedWorks()
  const postsResult = await getLatestPosts()
  const newsResult = await getLatestNews()
  const scheduleResult = await getUpcomingSchedule()
  const socialsResult = await getEnabledSocialLinks()

  return {
    worksResult,
    postsResult,
    newsResult,
    scheduleResult,
    socialsResult,
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Home Payload query timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })
}

/**
 * Home presentation stays bound to this view-model adapter rather than Payload itself.
 * Empty collections use the intentional static baseline; query failures or an unexpectedly
 * slow CMS fall back for the whole Home model so an unavailable CMS cannot break the landing page.
 */
export async function getHomeViewModel(): Promise<HomeViewModel> {
  try {
    const { worksResult, postsResult, newsResult, scheduleResult, socialsResult } =
      await withTimeout(loadHomePayloadResults(), HOME_PAYLOAD_TIMEOUT_MS)

    return {
      capabilities: staticHomeViewModel.capabilities,
      works:
        worksResult.docs.length > 0
          ? worksResult.docs.map((work) => ({
              title: work.title,
              summary: work.summary,
              role: work.role,
              stack: work.stack.join(' · '),
              href: work.githubUrl ?? work.liveUrl ?? '#works',
              signal: uppercaseLabel(work.projectStatus),
            }))
          : staticHomeViewModel.works,
      writing:
        postsResult.docs.length > 0
          ? postsResult.docs.map((post) => ({
              label: uppercaseLabel(post.category),
              title: post.title,
              meta: post.excerpt,
              ...(post.canonicalUrl ? { href: post.canonicalUrl } : {}),
            }))
          : staticHomeViewModel.writing,
      activity:
        newsResult.docs.length > 0
          ? newsResult.docs.map((news) => ({
              label: uppercaseLabel(news.type),
              title: news.title,
              meta: compactText(news.body),
              ...(news.externalUrl ? { href: news.externalUrl } : {}),
            }))
          : staticHomeViewModel.activity,
      schedule:
        scheduleResult.docs.length > 0
          ? scheduleResult.docs.map((item) => ({
              label: uppercaseLabel(item.type),
              title: item.title,
              meta: formatScheduleMeta(item.startAt, item.timezone, item.location),
              ...(item.url ? { href: item.url } : {}),
            }))
          : staticHomeViewModel.schedule,
      socials:
        socialsResult.docs.length > 0
          ? socialsResult.docs.map((social) => ({
              label: social.platform,
              handle: social.handle ?? social.platform,
              href: social.url,
            }))
          : staticHomeViewModel.socials,
    }
  } catch (error) {
    console.error(
      '[home-content] Payload query failed or timed out; using the static Home fallback.',
      error,
    )
    return staticHomeViewModel
  }
}
