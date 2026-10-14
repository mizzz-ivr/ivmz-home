/**
 * Static profile content for the About page and the Home snapshot. Only facts that are already
 * public on this site (Works, GitHub, ivRooom) are used here.
 */

export const profileFacts = [
  { label: 'NAME', value: 'いゔる。', note: 'a.k.a. mizzz（ずーみー）' },
  {
    label: 'ROLE',
    value: 'Full Stack Developer / Creator',
    note: 'プロダクトの視点で、つくって育てる',
  },
  {
    label: 'FOCUS',
    value: 'Web・Realtime AI・Discord',
    note: '画面から API・データ・運用まで',
  },
  { label: 'COMMUNITY', value: 'ivRooom', note: 'コミュニティ・チームの運営母体' },
] as const

export const tagline = ['小さく作る', '速く磨く', '安全に運用する'] as const

export type PlayerStat = { label: string; value: string; note: string; mark: string }

/** Personal profile facts the owner chose to publish (no birth year). */
export const playerStats: readonly PlayerStat[] = [
  { label: 'BIRTHDAY', value: '4 / 2', note: 'おひつじ座', mark: '♈' },
  { label: 'BLOOD', value: 'AB', note: 'AB型', mark: '🩸' },
  { label: 'MBTI', value: 'ENFJ', note: '主人公タイプ', mark: '✦' },
  { label: 'FROM', value: '愛媛', note: '出身', mark: '🍊' },
  { label: 'BASE', value: '東京', note: 'いまの拠点', mark: '🗼' },
] as const

export type PublicBuild = { name: string; description: string; stack: string; href: string | null }

/** Public projects named on the GitHub profile. Only repositories whose URL is known are linked. */
export const publicBuilds: readonly PublicBuild[] = [
  {
    name: 'ivmz-home',
    description: 'このサイト。個人サイトとポートフォリオのプラットフォーム。',
    stack: 'Next.js · Payload · PostgreSQL · Playwright',
    href: 'https://github.com/mizzz-ivr/ivmz-home',
  },
  {
    name: 'RooMate Voice',
    description: 'Discord と Realtime AI の音声ボット。Windows デスクトップアプリつき。',
    stack: 'Electron · Discord · Realtime AI',
    href: 'https://github.com/mizzz-ivr/roomate-voice',
  },
  {
    name: 'Herta',
    description: 'Discord コミュニティのためのプラットフォーム（モノレポ）。',
    stack: 'NestJS · Next.js · BullMQ · PostgreSQL · Redis',
    href: null,
  },
  {
    name: 'IVRM Dashboard',
    description: '運用と可観測性のためのコンソール。',
    stack: 'Next.js · Supabase · Go',
    href: null,
  },
] as const

export const practices = [
  'セキュリティ・バイ・デザイン',
  '最小権限',
  'フェイルクローズ',
  '自動テスト',
  'アクセシビリティ',
  '可観測性',
  'リリースの自動化',
] as const

export const storyParagraphs = [
  '実装することが好きです。画面だけ、APIだけと区切らず、触れる体験からデータ・運用までを一つのプロダクトとして考えます。',
  'コード、UI、インフラを別々の成果物として扱うのではなく、「人が使い続けられるか」を境界に設計するのが、自分の開発スタイルです。',
  '個人の開発に加えて、コミュニティ・チーム「ivRooom」の運営にも携わっています。場づくりやルール、発信まで含めて、仕組みとして育てることに関心があります。',
] as const

export type AboutArea = {
  index: string
  label: string
  title: string
  description: string
  deliverables: readonly string[]
  project: { name: string; href: string } | null
}

export const aboutAreas: readonly AboutArea[] = [
  {
    index: '01',
    label: 'WEB',
    title: 'Web Product',
    description:
      'React / Next.js / TypeScript を中心に、画面・認証・API・データを一続きで扱います。',
    deliverables: ['画面とUIの実装', '認証・権限まわり', 'APIとデータの設計'],
    project: { name: 'QuizVerse', href: 'https://github.com/mizzz-ivr/quizverse' },
  },
  {
    index: '02',
    label: 'REALTIME',
    title: 'Realtime & AI',
    description:
      '音声、Discord、Realtime AI など、操作と応答が連続する体験を、使い続けられるプロダクトに落とし込みます。',
    deliverables: ['音声・会話体験の設計', 'Discord Bot', 'デスクトップアプリの配布'],
    project: { name: 'RooMate Voice', href: 'https://github.com/mizzz-ivr/roomate-voice' },
  },
  {
    index: '03',
    label: 'DATA',
    title: 'Backend & Data',
    description: 'API、PostgreSQL、権限、マイグレーションを、フロントと切り離さずに設計します。',
    deliverables: ['データモデリング', '権限とセキュリティ', 'マイグレーション運用'],
    project: null,
  },
  {
    index: '04',
    label: 'OPERATE',
    title: 'Ship & Operate',
    description: 'Docker、CI、プレビュー環境、監視まで含めて、変更し続けられる状態をつくります。',
    deliverables: ['CI/CDとプレビュー', 'コンテナ化', '死活監視・運用'],
    project: { name: 'Site Sentry Go', href: 'https://github.com/mizzz-ivr/site-sentry-go' },
  },
] as const

export const stackGroups = [
  { label: 'Frontend', items: ['TypeScript', 'React', 'Next.js'] },
  { label: 'Backend', items: ['Node.js', 'Go', 'Flask'] },
  { label: 'Data', items: ['PostgreSQL', 'SQLite', 'Payload CMS'] },
  { label: 'Infra & Ops', items: ['Docker', 'GitHub Actions', 'Netlify', 'AWS', 'Cloudflare'] },
  { label: 'Realtime & AI', items: ['Realtime AI', 'Discord', 'Electron'] },
] as const

export type BuildStep = { step: string; title: string; description: string }

export const buildSteps: readonly BuildStep[] = [
  {
    step: 'UNDERSTAND',
    title: '課題を読む',
    description: '誰が、何のために、どこまで使うのか。作る前に前提と境界を言葉にします。',
  },
  {
    step: 'IMPLEMENT',
    title: '設計して実装',
    description: 'UI・API・データを分断せず、一本の体験として形にします。',
  },
  {
    step: 'SHIP SMALL',
    title: '小さく公開',
    description: 'プレビューとリリースを早く回し、実際に触れる状態で判断できるようにします。',
  },
  {
    step: 'OBSERVE',
    title: '反応を見る',
    description: 'ログ・監視・フィードバックから、直すべき場所を事実で見つけます。',
  },
  {
    step: 'POLISH',
    title: '磨き続ける',
    description: '変更し続けられる状態を保ったまま、体験と品質を少しずつ上げていきます。',
  },
] as const

export const principles = [
  {
    title: '判断も、成果物のうち',
    body: '完成した画面だけでなく、制約・判断の理由・運用の方法まで残します。あとから読んで再現できることを大事にしています。',
  },
  {
    title: 'まず小さく出す',
    body: '大きく作り込む前に、動くものを出して、実際の利用とレビューから直します。',
  },
  {
    title: '後付けにしない',
    body: 'アクセシビリティ、セキュリティ、レスポンシブは、あとから足すのではなく、最初から設計に入れます。',
  },
  {
    title: '使い続けられること',
    body: '作って終わりにせず、変更し続けられる状態、直しやすい構造、運用できる仕組みを保ちます。',
  },
] as const

export const consultTopics = [
  {
    title: '開発のご相談',
    body: 'Webアプリ、Discord Bot、Realtime AI などの設計・実装・技術選定。',
  },
  {
    title: 'お仕事のご依頼',
    body: '個人・チームでの開発、プロトタイプ、既存サービスの改善や運用の整備。',
  },
  {
    title: 'コラボレーション',
    body: 'OSS、イベント、コミュニティ運営など、一緒につくる企画。',
  },
  {
    title: '取材・登壇',
    body: '開発や運用で得た知見の共有、インタビュー、勉強会などのご依頼。',
  },
] as const
