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

export type Persona = {
  id: string
  label: string
  title: string
  lead: string
  points: readonly string[]
}

/** About の「三つの顔」。いずれも本人の活動事実の範囲で書く。 */
export const personas: readonly Persona[] = [
  {
    id: 'engineer',
    label: '作る人',
    title: 'エンジニアとして',
    lead: 'Web・Realtime AI・Discord・API・DB・運用まで、体験から裏側までを一つのプロダクトとして作ります。',
    points: [
      '個人開発コミュニティ ivRooom の基盤を設計・運用',
      '認証基盤、ポイント基盤、監視基盤まで自前で構築',
      '小さく作って公開し、運用しながら磨く進め方',
    ],
  },
  {
    id: 'gamer',
    label: '遊ぶ人',
    title: 'ゲーマーとして',
    lead: '原神・崩壊：スターレイル・ゼンレスゾーンゼロ・エンドフィールド・鳴潮・NTE を並行して遊んでいます。推しは原神の綺良々。',
    points: [
      'ビルドや編成はデータを見て組み立てる派',
      '聖遺物スコアや探索度を可視化する自作ツールも開発',
      'ゲームの活動記録を Web のプロフィールと連動させる実験中',
    ],
  },
  {
    id: 'creator',
    label: '届ける人',
    title: 'クリエイターとして',
    lead: 'X・note・Qiita・Zenn・YouTube で、個人開発とゲームの記録を発信しています。動画の声は VOICEVOX「ずんだもん」。',
    points: [
      '発信の配分は 個人開発 40% / ゲーム 30% / 趣味・日常・ライフハック 各10%',
      '下書き → 本人確認 → 投稿 の順を守って公開',
      '作ったものは記事と動画で記録に残す',
    ],
  },
]

export type Favorite = {
  kanji: string
  kicker: string
  title: string
  body: string
  note?: string
}

export const favorites: readonly Favorite[] = [
  {
    kanji: '推',
    kicker: 'OSHI — GENSHIN',
    title: '綺良々が推し',
    body: '原神の推しは綺良々。強さだけじゃなく、探索のお供としての楽しさも含めて好きで、探索パーティには必ず入れる枠。推しがいるから続けられる、というタイプです。',
    note: 'こだわり： 戦闘用 2PT とは別に、綺良々入りの探索 PT を組む。効率より「一緒に歩きたい」を優先する場面がある。',
  },
  {
    kanji: '音',
    kicker: 'MUSIC — WHILE WORKING',
    title: '音楽と作業環境',
    body: '作業中はプレイリストが常駐。集中したいときの BGM があると手が止まらない。最近聴いた曲をプロフィールに出す Spotify 連携（ivrm-web #991）を進めていて、公開は同意したときだけ出す設計です。',
  },
  {
    kanji: '画',
    kicker: 'VIDEO — IN PRODUCTION',
    title: '動画づくり',
    body: '声は VOICEVOX「ずんだもん」。開発の解説とゲーム動画を制作中で、現在は公開準備フェーズ。台本→編集→確認の流れも、開発と同じく小さく回して直していくスタイルです。',
  },
  {
    kanji: '箱',
    kicker: 'MINECRAFT — PLAY & OPERATE',
    title: 'Minecraft',
    body: 'IVRM の MC サーバー（main / resource）を運営しながら自分も遊ぶ。独自 mod で活動統計を取ってポータルの XP やランキングに繋げるなど、遊びを仕組み化するのが楽しい。',
  },
  {
    kanji: '書',
    kicker: 'WRITING — NOTES & LOGS',
    title: '書く・残す',
    body: '移行の実録、障害の切り分け、設計の判断理由——あとから自分が助かる記録を、誰かも助かる形で記事にする。日報や Issue の記録癖もここから来ています。',
  },
  {
    kanji: '試',
    kicker: 'TINKERING — INFRA & TOOLS',
    title: '基盤いじり',
    body: 'サーバー、CI、監視、自動集計のパイプラインなど、「裏側が勝手に回っている」状態を作るのが好き。本番で回る自動運転（毎晩 01:15 の DevIntel 集計など）が増えるほど嬉しい。',
  },
]

export type GameShelfEntry = {
  name: string
  en: string
  status: string
  tone: 'daily' | 'chill' | 'watch'
  style: string
  tags: readonly string[]
}

export const gameShelf: readonly GameShelfEntry[] = [
  {
    name: '原神',
    en: 'GENSHIN IMPACT',
    status: '毎日デイリー',
    tone: 'daily',
    style:
      '推しは綺良々。世界任務と探索度上げをまったり進めるのが本線で、戦闘は螺旋などの目標があるときに本気を出す。探索 PT に推しを入れるのがマイルール。',
    tags: ['探索重視', '推し：綺良々', 'Enka 連携'],
  },
  {
    name: '崩壊：スターレイル',
    en: 'HONKAI: STAR RAIL',
    status: '毎日デイリー',
    tone: 'daily',
    style:
      'デイリーと開拓力の消化が日常の軸。Herta の /game コマンドで UID 連携と聖遺物スコア確認ができるようにした側でもあり、遊ぶ体験と作る体験が一番重なっているタイトル。',
    tags: ['デイリー消化', '聖遺物スコア', 'Enka + Herta'],
  },
  {
    name: 'ゼンレスゾーンゼロ',
    en: 'ZENLESS ZONE ZERO',
    status: 'まったり進行',
    tone: 'chill',
    style:
      '式輿防衛戦を回しつつ、新エリアの探索は急がず楽しむ枠。アクションの手触りが好きで、短い時間でも触れるのがちょうどいい。',
    tags: ['防衛戦', '短時間プレイ', 'Enka 連携'],
  },
  {
    name: 'エンドフィールド ＋ 様子見組',
    en: 'ENDFIELD / WUTHERING WAVES / NTE / GAKUMAS',
    status: '様子見も含む',
    tone: 'watch',
    style:
      'エンドフィールドは基地運営を眺めている時間が長めで、育成はこれから。鳴潮 / NTE / 学マスは管理対象として枠を用意しつつ、触れるタイミングを見ている組。取得手段がないものは UID 登録のみで無理に数字を作らない。',
    tags: ['基地運営', 'UID 登録のみの枠あり'],
  },
]
