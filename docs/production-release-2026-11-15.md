# 2026-11-15以降のProductionリリースと本番確認チェックリスト

状態：**リリース待ち・実行結果未記入**（2026-10-22確認）。担当者は各行のチェックと証跡を記録する。チェックが空欄の項目は**成功や実施を意味しない**。

## 前提・リリースの分離

- 公開サイト：`https://ivmz.ivrm.jp`、Netlify site：`ivmz-home`。
- 2026-10-22確認時のGitHub `main`：`a5adc379e146e9c99b651a7290d7a265cf5cb7f0`（PR #160まで）。
- 最終確認Production：`95b94d870b5d3ef22bb886d0605ddfb99737b70b`（PR #156）、deploy `6ad74a280ea02a626518d1b8`。**この2つのSHAは異なる**。
- ユーザー申告：Netlifyクレジット不足、**2026-11-15（JST）回復予定**。実際の回復・枠残高は当日に要確認。
- `main`のPR #159/#160は**最終対話日時の設計・CI試験のみ**。本番DBへの正式な列追加・イベントwriterの公開は含まない。
- 正式Migrationと受付時のwriterは**Draft PR #157**（Issue #98）。Production Supabase `ivrm-core`に`last_interaction_at`がないため、復元検証と先行DDLまで本番化を禁止する。
- FAQ文言は**PR #158**（Issue #72）。レビュー指摘解決・GitHub CI成功後、2026-10-22に**非Productionリリースブランチへsquashマージ済み**（`17d784810bf68353d80d0d040c03bb26431631a3`）。`main`/Productionでは未公開。**統合後HEADの実Netlify Previewは未検証**。
- 匿名メッセージの連続Draft PR #128〜#141（Issue #69/#133）と3DマスコットのPR #121/#126（Issue #103/#125）は**別リリース**。今回のmainにまとめて投入しない。
- 正規の公開経路：`reviewed PR -> GitHub main -> Netlify Git integration -> Production`。手動Trigger、API/MCPの直接publish、承認なきDB操作は使わない。Issue #161、`docs/netlify-production-sync.md`参照。

## リリース単位と停止条件

| 単位 | 対象 | 通過条件 | 失敗した場合 |
| --- | --- | --- | --- |
| R0（最初・統合） | 現mainのPR #159/#160 + リリース手順PR #162 + **FAQチャットPR #158**（公開用PR #163） | Netlifyクレジット回復、統合HEADのGitHub CI、**1回の実Preview**、FAQ文言レビュー、Git由来本番SHA一致 | 公開停止、Issue #161を維持 |
| R2（厳格） | PR #157：`lastInteractionAt` writer + Migration | **Production DBのバックアップ/復元実証、接続先/権限、列の先行適用、Preview検証** | Draft維持、本番DBにDDLを実行しない |
| 別計画 | 匿名投稿 / 3D / その他Issue | 各Issue固有の隔離環境・プライバシー・実機・ロールバック要件 | 一括マージしない |

**R0へ安全なUI文言修正（従来R1）を統合済み**。R2のDB Migrationは独立させ、R0より先に公開しない。必要な実Previewがない場合、保護ルールを無効にしてマージしない。`[skip netlify]`付きのコミットでは本番がスキップされるため、回復後の最終PRは明示的にタグを外し、**実内容のあるレビュー済みコミット**でPreviewとGit連携を検証する。


## 11/15以降の最小Netlifyビルド手順

- 現在のreleaseブランチ `release/2026-11-15-validation`には **PR #162とPR #158がsquashマージ済み**。GitHub `main`には未マージ。
- [公開用Draft PR #163](https://github.com/mizzz-ivr/ivmz-home/pull/163)に今回の一括リリースを集約し、**Netlifyクレジット回復まで** `[skip netlify]` を維持する。
- 回復後、`[skip netlify]`をタイトルから取り除き、review済みの最終コミットをpushして、**実Deploy Previewを1回**ビルド・Smoke検証する。PRタイトルの変更だけではPreviewが起動しない。
- `quality`と`netlify/ivmz-home/deploy-preview`が必須なので、**Previewを省略してmainだけマージすることは不可**。保護ルールを無効化したり、成功ステータスを偽造したりしない。
- 実Previewの成功後、PR #163を`main`へ`[skip netlify]`なしでマージして、**Git連携によるProductionビルドを1回**確認する。単にNetlify UIの`Trigger deploy`を押すだけでは、GitHub main連動の正常化を証明できず、既存のGit-onlyリリース方針とも整合しない。
- このリリースで必要なNetlifyビルドは、正常進行なら**Preview 1回 + Production 1回**。失敗時の再ビルドは必要性と残クレジットを再評価して判断する。
- Production deploy `ready`・exact SHA一致の後にC〜G/Iの本番チェックを実施する。実データ書込みやDB Migrationは別承認とする。

## A. 11月15日より前：準備のみ

- [ ] [A01] Netlify新規Preview/Productionビルドを作らない。テスト・Docs・小差分は`[skip netlify]`付きDraftで進める。
- [ ] [A02] 開いているPRと最新mainの差分をレビューする。Issue #161/#98/#72と未公開の匿名投稿・3Dを分類し、混入を防ぐ。
- [ ] [A03] GitHub quality（format/lint/typecheck/Vitest/使い捨てPostgreSQL migration/RLS/生成物一致/Next build）と`e2e-local`を成功させる。
- [ ] [A04] 過去の成功CIは**現在のHEADに対する証拠ではない**ことを確認する。コミット・実行ID・結果を記録する。
- [ ] [A05] リリースPRの変更内容、停止条件、既知の未解決事項をレビューする。秘密値、個人データ、添付キーはIssue/PRに貼らない。
- [ ] [A06] Netlify Git連携の正規経路/保護ルールと本番DBガードを維持する。クレジット不足を理由にルールを迂回しない。

## B. 回復後：本番公開直前のゲート（各リリースで再実施）

- [ ] [B01] Netlify「Usage & billing」でクレジットが**実際に回復**している。残量と次回更新日を非機密の範囲で記録する。
- [ ] [B02] GitHub main/PR HEADのSHAを取得し、Review未解決0・CI quality/e2e-local successを確認する。
- [ ] [B03] Netlify Production branch=`main`、GitHub連携有効、Auto publishing有効、Deploy lockなし、Git-based enforcement有効を確認する。
- [ ] [B04] Netlify PreviewとProductionのDB Project Refが別で、Previewが本番DBに書き込まないことを証明する。シークレット実値をログへ出さない。
- [ ] [B05] リリース対象がDB Migrationを含むか確認。**R0（FAQを含む）はProduction DDL不要**、R2は下のHをすべて通す。
- [ ] [B06] `[skip netlify]`を除いた最終HEADのNetlify Deploy Previewが`ready`でSHA一致・plugin success・secret scan 0。
- [ ] [B07] Preview Smoke：Payload公開API、Chromium/mobile WebKit、認可、ヘッダー、429レート制限の各結果を確認する。Previewの失敗を本番で試験して補わない。
- [ ] [B08] Review済みPRを`main`へマージ（squashのメッセージにも`[skip netlify]`を入れない）。mainの統合CIが成功する。
- [ ] [B09] Netlify **Git由来の**Production Deployが自動作成・公開される。手動再配信でSHA差分を隠さない。
- [ ] [B10] 現時点のGitHub main HEADとNetlify Production `commit_ref`が**完全一致**。state=`ready`、context=`production`、公開日時あり。
- [ ] [B11] Netlify Next.js plugin success、Secret scan 0、redirect/header validation success。失敗時は公開合格としない。
- [ ] [B12] 旧Known-good deploy IDとコミット、公開後の新IDを記録してから確認作業を開始する。

## C. 本番公開直後：自動の**読み取り専用**Smoke

**R0の本番公開後に実施。クレジット回復前に最新HEADが公開されていると誤認して実行しない。** 作業PC等でNode.js 24を用いる：

```bash
node scripts/verify-production-readonly.mjs
```

このスクリプトは`https://ivmz.ivrm.jp`**固定**で、静的な対象へのGETのみを1回ずつ送信する。認証、Cookie、POST、フォーム送信、負荷試験、DB/S3書込みを行わず、レスポンス本文・個人情報・認証情報をログへ出さない。サイト自体の正常性やDB権限/変更の完全性を証明するものではない。

- [ ] [C01] スクリプトの全プローブがpassし、失敗したpath/statusだけが出力される。
- [ ] [C02] ホーム・About・Works・Blog・News・Schedule・Links・Contact・Privacy・TermsがHTTP200。
- [ ] [C03] `/robots.txt`と`/sitemap.xml`が200、公開API `/api/works?limit=1&depth=0`が200かつ`docs`配列。
- [ ] [C04] `/admin`がログイン面へ正しく遷移または表示され、外部サイトへリダイレクトしない。
- [ ] [C05] `/api/ops/health`の**認証なし**GETは401（有効時）または404（無効時）でno-store。正常なDBヘルスは別の認証付き手順で確認する。
- [ ] [C06] 未公開の`/message/this-is-not-a-public-message`は404・no-store・noindex。匿名投稿が公開された意味ではない。
- [ ] [C07] トップ/公開APIにCSP Report-Onlyがあり、予期せずCSP Enforcementに変更されていない。

## D. 公開サイト・画面・SEO・a11y（原則、閲覧のみ）

- [ ] [D01] ホームのメイン見出し、画像、Selected Works、About、最新情報の表示（CMS未登録なら空は許容）。
- [ ] [D02] 全9下層ページで直接アクセス・リロード・内部リンク・ナビの現在位置が正常。
- [ ] [D03] 存在しないページは適切な404。削除済み/非公開のCMS詳細を匿名で表示しない。
- [ ] [D04] favicon、OG/Twitter card、canonical、JSON-LD（WebSite/Person/FAQPage）、sitemap・robotsが矛盾しない。
- [ ] [D05] Works/Post/Newsは**公開済みだけ**表示。Draft・非公開Schedule・無効Social Linkが匿名APIから漏れない。
- [ ] [D06] 320/375/390/768/1024/1440pxで横スクロール・ボタン重なり・画面外はみ出しなし。
- [ ] [D07] キーボードのみでメニュー/チャット/フォームに移動可能、フォーカス表示・Escape閉じる・ariaが正常。
- [ ] [D08] Dark/Light切替・ページ遷移、`prefers-reduced-motion`で視認性と主要機能が維持。
- [ ] [D09] Chrome・Safari・モバイル実機で主要画面を確認。実機未確認の項目をCI成功だけで完了にしない。
- [ ] [D10] Core Web Vitals（LCP/INP/CLS）、画像重量、エラーログを公開前後で比較し、悪化を記録。

## E. Contact・添付・認可（**本番では原則非破壊**）

- [ ] [E01] Contactフォームの表示、必須/最大長、確認→編集に戻る動線、同意・宛先案内、mailtoの正常性。
- [ ] [E02] Preview/ローカルで、正常送信、重複requestId、入力エラー、Turnstile失敗、429、通知失敗、503時の入力保持をテスト済み。
- [ ] [E03] 本番の実送信テストが必要なら**本人/運用者の明示承認・専用テスト問い合わせ・通知先/保存データへの影響確認後に1回のみ**実施する。無断送信しない。
- [ ] [E04] 本番CMSで管理者の**既存**問い合わせの閲覧と統計を確認。氏名/本文/メール/ファイル名は証跡へ転記しない。
- [ ] [E05] 未ログイン/非CMS管理者の問い合わせ閲覧・編集・添付アクセスは拒否。**本番で破壊的操作の実試験はしない**。
- [ ] [E06] S3添付のURL署名は短命・no-store/no-referrer。存在しない添付は404、S3障害は503のテストを隔離環境で実施。
- [ ] [E07] スキャン対象/ブロック条件、マクロ・外部参照・マルウェア・サイズ/個数制限を隔離環境で確認。本番へ危険ファイルを送らない。
- [ ] [E08] AWS S3 `clean/` 90日、`quarantine/` 1日、Public Access Block、暗号化、Lifecycleを読み取り専用で再照合。
- [ ] [E09] 添付あり問い合わせのCMS通常削除は暫定拒否、添付なしの管理者個別削除は従来権限（実データの削除テスト禁止）。
- [ ] [E10] 不在添付リンク・孤立キー・削除請求はIssue #98として保留。自動削除とバックフィルを有効化しない。

## F. CMS・API・セキュリティ・運用

- [ ] [F01] Payloadログイン面・正規の管理者ログイン/ログアウト/MFA方針を確認。パスワード/セッションを記録しない。
- [ ] [F02] 匿名・他コレクションのユーザー権限から、CMS内部データと変更APIにアクセスできない。
- [ ] [F03] 公開APIにDraft/Versions/内部フィールドが露出しない。CORSで未知のOriginとlocalhostを許可しない。
- [ ] [F04] HTTPS、HSTS、X-Content-Type-Options、Referrer-Policy、CSP Report-Onlyなどを公開/管理画面で確認する。
- [ ] [F05] CSPの警告はOrigin/ディレクティブのみを記録。URLクエリ、Cookie、本文、秘密値をログに載せない。
- [ ] [F06] Ops Healthは**認証済み・読み取りのみ**で状態を確認。トークンが未設定なら未検証と扱う。
- [ ] [F07] Ops DashboardのNew・通知失敗・滞留・保持期限統計が表示され、集計だけから個人情報が漏れない。
- [ ] [F08] Ops週次retentionは`dryRun:true`のみ。資格情報を公開ログに出さず、保持候補・添付あり・長期New・更新で隠れた期限超過を確認。
- [ ] [F09] `apply:true`は**隔離環境の自動テストで403**。本番では削除フラグを有効化したり、破壊的な直接POST試験を行わない。
- [ ] [F10] Alert通知/メールの失敗検知、Ops Health定期ジョブ、Netlify/Functionsの5xxログを確認。テスト通知が必要なら承認を得る。
- [ ] [F11] Webhook URL・DB接続先・PAYLOAD_SECRET・AWSキーがクライアント/Logs/Issue/Artifactsに露出しない。
- [ ] [F12] Preview/ProductionのSupabase ref/権限分離を再検証。既存の本番DBレコードに対するSQL更新は行わない。

## G. R0：FAQ文言統合の確認（PR #158、今回必須）

- [ ] [G01] FAQの選択肢は端末内処理。選択ボタンだけで外部AI送信が発生しない。
- [ ] [G02] 外部AI有効時の注意文には送信/非保存/個人情報禁止が明記され、**公開チャットで提供元の固有名が表示されない**。
- [ ] [G03] 外部AI無効時は「端末内だけ・送信/保存しない」の説明に切り替わる。
- [ ] [G04] 「個人情報の扱いは？」FAQ回答・チャットログも提供元名がない。法的Privacy Policyの提供元説明は変更しない。
- [ ] [G05] モバイル・低速初期化時もチャット起動が失敗しない。E2EでHydration raceの再試行を検証。
- [ ] [G06] 本番の実AI呼出しはコストとプライバシーを確認の上、必要最小限にする。Prompt injectionや大量呼出しを本番に投げない。

## H. R2：Schema Migrationを含む場合の**必須先行ゲート**（PR #157）

- [ ] [H01] 変更が`last_interaction_at timestamptz NULL DEFAULTなし`で、既存レコードのunknownをNULL維持・backfillなしであるとレビュー。
- [ ] [H02] Productionの現在のスキーマ・migration履歴・RLS/権限・接続ロールを**読み取り専用**で確認。
- [ ] [H03] Productionに対する**復元可能な論理バックアップを保護領域に確保**し、別の隔離DBで復元実証する。Supabase Freeの標準バックアップを想定しない。
- [ ] [H04] Previewは本番とは別プロジェクトで、実行ユーザーに必要最小権限があることを確認。Previewのテストデータでup、nullable、down/復元、再実行を証明。
- [ ] [H05] CIの`last-interaction-migration.integration.test.ts`、新規受付、重複requestId、通知/管理メモでは日時不変、失敗時保護のテストが成功。
- [ ] [H06] スキーマ変更のロック/timeout/停止窓/バックアウトを承認。**アプリを先に公開しない**。
- [ ] [H07] 独立した運用承認後、Productionへ**列を先行適用**。read-onlyで列/既存行NULL/非破壊性/RLSを検証し、秘匿データをログに出さない。
- [ ] [H08] PR #157の最新HEADでCI/実Preview Smoke/管理者権限の確認後、mainへマージしProductionに公開する。
- [ ] [H09] 公開後、新規受付は日時が記録され、旧データNULLは保持される。通知更新・ステータス更新・重複送信では書き換わらない。
- [ ] [H10] writer稼働後のロールバックは**アプリ旧版へ戻し列を維持**。Productionで`DROP COLUMN`や自動backfillを実行しない。
- [ ] [H11] 対話日時の導入後も保持期間の削除判定を切り替えず、削除停止を継続する。正しい返信イベントの記録・New例外・DB/S3アウトボックスはIssue #98で別開発。

## I. 回帰・監視・切り戻し

- [ ] [I01] 公開時刻・本番SHA・deploy ID・レビューPR・CI/Preview実行IDをリリース記録へ転記する。
- [ ] [I02] 最初の確認で5xx/CORS/CSP違反/問い合わせ通知障害などの異常がない。
- [ ] [I03] 公開後に通常アクセス・問い合わせ失敗・Ops通知の傾向を継続観察する。変化なしも記録。
- [ ] [I04] アプリだけの不具合なら既知の正常DeployへGit運用方針に従って切り戻し、Gitのrevert/forward-fixを実施して再収束する。
- [ ] [I05] DB Migration済みのR2では旧アプリとの**列を残した互換性**を検証し、カラムや実データを安易に戻さない。
- [ ] [I06] リリース後の権限/個人データ削除/障害発生に対する監査・エスカレーションの連絡先を確認する。
- [ ] [I07] 完了したIssue/PRのみcloseする。#98、#133、#69、#94、#103等、未完の公開ゲートを成功扱いにしない。

## J. テスト結果の記録欄（リリース単位で複製）

| 項目 | 記入 |
| --- | --- |
| リリース単位 | R0（PR #162 + #158統合） / R2（Migration） |
| 実施日・担当 | 未実施 |
| 対象PR / GitHub main SHA | 未実施 |
| CI実行ID・結果 | 未実施 |
| Preview deploy ID / Smoke結果 | 未実施 |
| Production旧deploy ID / SHA | `6ad74a280ea02a626518d1b8` / `95b94d87`（**2026-10-22時点の参照。実施直前に更新**） |
| Production新deploy ID / SHA / published_at | 未実施 |
| スクリプト実行結果 | 未実施 |
| 手動確認・CMS・DB/S3の状態 | 未実施 |
| 既知の不具合・保留・切り戻し判断 | 未実施 |
| 公開承認・完了判断 | 未実施 |

**判定：** A/Bのゲートは実PreviewとGit連携の公開に必要。C〜GとIはR0の公開後に確認し、HはR2のDB Migrationを含む別リリースにのみ適用。重大な権限漏えい・データ消失・Migration不一致・Production SHA不一致が発生したら、以後のリリースと破壊的操作を停止する。

関連：[Issue #161](https://github.com/mizzz-ivr/ivmz-home/issues/161) ／ [Issue #98](https://github.com/mizzz-ivr/ivmz-home/issues/98) ／ [Issue #72](https://github.com/mizzz-ivr/ivmz-home/issues/72) ／ [Issue #133](https://github.com/mizzz-ivr/ivmz-home/issues/133) ／ [Netlify Credit Saving](./netlify-credit-saving.md) ／ [CMS Runbook](./cms-operational-runbook.md) ／ [Retention Policy](./contact-retention-policy.md)。
