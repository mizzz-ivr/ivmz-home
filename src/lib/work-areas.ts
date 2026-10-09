export type WorkArea = {
  id: 'community' | 'application' | 'web'
  index: string
  label: string
  title: string
  description: string
  keywords: readonly string[]
  related: string
}

/** Editorial categories for Works. Kept static so the CMS schema (and database) stay untouched. */
export const workAreas: readonly WorkArea[] = [
  {
    id: 'community',
    index: '01',
    label: 'COMMUNITY',
    title: 'コミュニティ運営',
    description:
      'ivRooom を軸に、コミュニティ・チームの運営を担います。場づくり、ルールと運用の設計、発信までを一続きで考えます。',
    keywords: ['Community', 'Team', 'Operations'],
    related: 'ivRooom',
  },
  {
    id: 'application',
    index: '02',
    label: 'APPLICATION',
    title: 'アプリケーション開発',
    description:
      'Discord Bot・Realtime AI・デスクトップ配布など、日常で使い続けられるアプリを企画から運用まで育てます。',
    keywords: ['Discord', 'Realtime AI', 'Electron', 'Go'],
    related: 'RooMate Voice / Site Sentry Go',
  },
  {
    id: 'web',
    index: '03',
    label: 'WEB',
    title: 'Web開発',
    description:
      'Next.js・React・API・PostgreSQL。画面から認証・データ・運用まで、分断せずに実装します。',
    keywords: ['Next.js', 'React', 'PostgreSQL', 'Docker'],
    related: 'QuizVerse / ivmz-home',
  },
] as const
