/**
 * FAQ content and the matching logic behind the home page chat. Everything here is static and
 * runs in the browser: nothing the visitor types is sent anywhere.
 */

export type FaqLink = { label: string; href: string }

export type FaqEntry = {
  id: string
  /** Short label used on the quick-reply button and as the accordion question. */
  question: string
  /** One paragraph per item. */
  answer: readonly string[]
  link?: FaqLink
  /** Lowercase words and phrases that route free-text questions here. */
  keywords: readonly string[]
  /** Entries suggested after this one. */
  related: readonly string[]
}

export const faqEntries: readonly FaqEntry[] = [
  {
    id: 'consult',
    question: 'お仕事・開発を相談したい',
    answer: [
      'Webアプリ、Discord Bot、Realtime AI、API・データベース、運用の整備などのご相談をお受けしています。',
      '内容が固まっていなくても大丈夫です。お問い合わせフォームで、わかる範囲で教えてください。',
    ],
    link: { label: 'お問い合わせフォームへ', href: '/contact' },
    keywords: [
      '相談',
      '依頼',
      '仕事',
      '開発',
      '発注',
      '見積',
      'お願い',
      '頼み',
      '案件',
      'お仕事',
      'job',
      'work with',
      'hire',
    ],
    related: ['reply', 'skills', 'works'],
  },
  {
    id: 'skills',
    question: 'どんな技術が得意？',
    answer: [
      'TypeScript / React / Next.js を中心に、Node.js・Go・Flask、PostgreSQL、Docker、GitHub Actions、AWS、Netlify、Cloudflare などを使っています。',
      'Realtime AI と Discord を組み合わせた音声体験や、画面から運用までを一続きで作ることが得意です。',
    ],
    link: { label: 'Aboutを見る', href: '/about' },
    keywords: [
      '技術',
      '得意',
      '言語',
      'スタック',
      '使える',
      'typescript',
      'react',
      'next',
      'go',
      'python',
      'flask',
      'aws',
      'docker',
      'stack',
      'skill',
    ],
    related: ['works', 'consult', 'about'],
  },
  {
    id: 'works',
    question: '制作物を見たい',
    answer: [
      'RooMate Voice（Discord × Realtime AI の音声ボット）、QuizVerse（クイズ向けWebプラットフォーム）などを公開しています。',
      '役割・技術・運用まで含めて、Worksにまとめています。',
    ],
    link: { label: 'Worksを見る', href: '/works' },
    keywords: [
      '制作',
      '作品',
      'works',
      'ポートフォリオ',
      'github',
      'ギットハブ',
      'リポジトリ',
      'roomate',
      'quizverse',
      'oss',
      '実績',
    ],
    related: ['skills', 'consult', 'schedule'],
  },
  {
    id: 'reply',
    question: '返信までどのくらい？',
    answer: [
      '内容を確認してから順次ご返信しますが、返信までの期間はお約束できません。お急ぎの用件や緊急の連絡には向いていません。',
      '営業・勧誘を目的とした一斉送信などには、返信しない場合があります。',
    ],
    link: { label: '利用規約を見る', href: '/legal/terms' },
    keywords: [
      '返信',
      '返事',
      '連絡',
      'いつ',
      'どのくらい',
      '何日',
      '期間',
      '急ぎ',
      '早く',
      '返答',
      'reply',
      'response',
    ],
    related: ['attachments', 'privacy', 'consult'],
  },
  {
    id: 'attachments',
    question: 'ファイルは送れる？',
    answer: [
      'お問い合わせフォームで添付が使える場合は、ファイルを添付できます。形式・サイズ・数には上限があり、フォームの案内に表示されます。',
      '添付ファイルはウイルススキャンと内容の検査を行い、問題がないものだけを受け付けます。マクロや外部参照、スクリプトを含むファイルは受け付けません。個人情報や機密情報は、含めないでください。',
    ],
    link: { label: 'フォームを開く', href: '/contact' },
    keywords: [
      '添付',
      'ファイル',
      '資料',
      '画像',
      'pdf',
      '送れ',
      'アップロード',
      'スクリーンショット',
      'upload',
      'attach',
    ],
    related: ['privacy', 'reply', 'consult'],
  },
  {
    id: 'privacy',
    question: '個人情報の扱いは？',
    answer: [
      'お問い合わせでお預かりした情報は、ご連絡と対応の目的にだけ使い、広告や営業には使いません。保管は最後のやり取りから1年を目安とし、添付ファイルは受付から90日で自動的に削除します。',
      'このチャットの入力内容は、当サイトでは保存しません。ボタンでの質問はブラウザの中だけで処理されます。AI回答が有効な場合に限り、FAQにない自由入力はAI（Cloudflare Workers AI）に送られます。個人情報は入力しないでください。',
    ],
    link: { label: 'プライバシーポリシー', href: '/legal/privacy' },
    keywords: [
      '個人情報',
      'プライバシー',
      '情報',
      '保存',
      '保管',
      '削除',
      '消',
      'セキュリティ',
      '安全',
      '漏',
      'privacy',
    ],
    related: ['attachments', 'security', 'reply'],
  },
  {
    id: 'schedule',
    question: '公開予定やSNSを知りたい',
    answer: [
      '公開できる予定はScheduleに、GitHub・X・Instagram・YouTubeなどのリンクはLinksにまとめています。',
      '個人の予定ではなく、公開してよいものだけを載せています。',
    ],
    link: { label: 'Linksを見る', href: '/links' },
    keywords: [
      '予定',
      'スケジュール',
      'カレンダー',
      'sns',
      'twitter',
      'x',
      'instagram',
      'youtube',
      '動画',
      '配信',
      'リンク',
      'フォロー',
      'schedule',
      'links',
    ],
    related: ['works', 'about', 'community'],
  },
  {
    id: 'community',
    question: 'コミュニティ「ivRooom」とは？',
    answer: [
      'ivRooom は、運営に携わっているコミュニティ・チームです。場づくりやルール、発信まで含めて、仕組みとして育てています。',
      'コミュニティ・チームへのご連絡は、フォームでカテゴリを選ぶと、専用の窓口に届きます。',
    ],
    link: { label: 'ivRooomのサイト', href: 'https://ivrm.jp' },
    keywords: [
      'ivrooom',
      'ivroom',
      'ivrm',
      'コミュニティ',
      'チーム',
      '運営',
      'discord',
      'ディスコード',
      'サーバー',
    ],
    related: ['consult', 'schedule', 'about'],
  },
  {
    id: 'security',
    question: '脆弱性を報告したい',
    answer: [
      'セキュリティ上の問題を見つけた場合は、セキュリティ専用の窓口にご連絡ください。確認に必要な最小限の範囲にとどめ、修正が完了するまで第三者に公開しないようお願いします。',
      '誠実なご報告については、不正アクセス等を理由に法的措置をとることは考えていません。',
    ],
    link: { label: '利用規約（脆弱性のご報告）', href: '/legal/terms#security-report' },
    keywords: [
      '脆弱性',
      'セキュリティ',
      'バグ',
      '報告',
      '不具合',
      '攻撃',
      'security',
      'vulnerability',
      'cve',
    ],
    related: ['privacy', 'reply', 'consult'],
  },
  {
    id: 'about',
    question: 'どんな人？',
    answer: [
      'いゔる。（a.k.a. mizzz／ずーみー）。画面・API・データ・運用を分けずに、一つのプロダクトとして実装するフルスタック開発者です。',
      'プロフィール、ものづくりの進め方、大切にしていることを、Aboutにまとめています。',
    ],
    link: { label: 'Aboutを見る', href: '/about' },
    keywords: [
      '誰',
      'どんな人',
      'プロフィール',
      '自己紹介',
      '経歴',
      'about',
      'mizzz',
      'ずーみー',
      'いゔる',
    ],
    related: ['skills', 'works', 'community'],
  },
]

export const topLevelQuestionIds = [
  'consult',
  'skills',
  'works',
  'reply',
  'attachments',
  'privacy',
] as const

export const contactLink: FaqLink = { label: 'お問い合わせフォームへ', href: '/contact' }

export const chatGreeting = [
  'こんにちは！「いゔる。」のサイトのFAQアシスタントです。',
  'よくある質問にお答えします。下から選ぶか、知りたいことを入力してください。',
] as const

export const chatFallback = [
  'うまくお答えできませんでした。ごめんなさい。',
  '下から近い質問を選ぶか、お問い合わせフォームで直接ご相談ください。',
] as const

export const MAX_CHAT_INPUT = 120

export function findEntry(id: string): FaqEntry | undefined {
  return faqEntries.find((entry) => entry.id === id)
}

/** Lowercase, full-width to half-width, and no spaces or punctuation, for forgiving matching. */
export function normalizeQuery(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　、。，．,.!?！？「」『』()（）\-_/]+/g, '')
}

/**
 * Best FAQ entry for a free-text question, or null when nothing matches. Longer keywords score
 * higher so a specific word beats a short one that happens to be a substring.
 */
export function matchQuestion(
  input: string,
  entries: readonly FaqEntry[] = faqEntries,
): FaqEntry | null {
  const query = normalizeQuery(input.slice(0, MAX_CHAT_INPUT))
  if (query.length === 0) return null

  let best: { entry: FaqEntry; score: number } | null = null
  for (const entry of entries) {
    let score = 0
    for (const keyword of entry.keywords) {
      const normalized = normalizeQuery(keyword)
      // One-letter latin keywords ("x", "go") only count when they are the whole query.
      if (/^[a-z]$/.test(normalized) || normalized === 'go') {
        if (query === normalized) score += 3
        continue
      }
      if (query.includes(normalized)) score += normalized.length
    }
    if (score > 0 && (!best || score > best.score)) best = { entry, score }
  }
  return best ? best.entry : null
}
