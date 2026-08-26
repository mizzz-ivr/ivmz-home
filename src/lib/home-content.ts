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

/**
 * Payload collections will replace this adapter in the next content-model phase.
 * Keeping the page bound to a view model prevents CMS concerns from leaking into presentation components.
 */
export function getHomeViewModel(): HomeViewModel {
  return staticHomeViewModel
}
