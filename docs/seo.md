# 検索・共有まわり（SEO）

| 項目 | 場所 | 内容 |
| --- | --- | --- |
| 構造化データ（サイト・人物） | `src/lib/structured-data.ts` | WebSite と Person。人物は肩書き・拠点（東京）・得意分野と、公開しているプロフィール（GitHub／X／Instagram／YouTube）のみ。誕生日などは含めません。 |
| 構造化データ（FAQ） | トップページ | FAQPage。画面に表示している FAQ（`src/lib/faq-content.ts`）と同じデータから作ります。 |
| 共有画像 | `public/og.png`（1200×630） | `og:image` と `twitter:image` に全ページで指定。`src/lib/site.ts` の `ogImage` が唯一の定義です。 |
| カード | `createPageMetadata` / レイアウト | `summary_large_image`、`og:locale=ja_JP`。 |
| ファビコン | `src/app/icon.svg` | 「i/」マーク。 |
| マニフェスト | `src/app/manifest.ts` | 名前・色・アイコン。 |
| `theme-color` | `src/app/(site)/layout.tsx` | ダーク／ライトで切り替え。 |
| サイトマップ・robots | `src/app/sitemap.ts` / `robots.ts` | 公開ページと CMS の公開コンテンツ。`/admin/` と `/api/` は対象外。 |

## 確認のしかた

- 構造化データ: Google の「リッチリザルトテスト」に本番 URL（https://ivmz.ivrm.jp/）を入れる。
- 共有カード: X の投稿画面や Discord に URL を貼って、プレビューを見る（反映に時間がかかることがあります）。
- Google Search Console に、サイトマップ（`/sitemap.xml`）を登録すると、インデックスの状況が見られます（あなたの作業）。
