# Payload CMS: GA4アクセス解析ダッシュボード

## 目的
Payload `/admin` の既存運用ダッシュボードに、Google Analytics Data APIによる匿名集計を表示する。生ログ、匿名メッセージ、IPアドレスやメールアドレスは扱わない。

## 設定
1. Google Analytics 4プロパティを準備し、Webタグの設定と来訪者への同意UI（Issue #74）を完了する。
2. Google CloudでGoogle Analytics Data APIを有効化し、サービスアカウントを作成する。
3. Google Analyticsプロパティのアクセス管理で、そのサービスアカウントに閲覧権限（Viewer）だけを付与する。
4. NetlifyのProduction環境変数へ `GA4_PROPERTY_ID`（数字だけ）と `GA4_SERVICE_ACCOUNT_JSON`（秘密のJSON）を設定する。**Functions/Runtimeにのみ限定し、クライアント側には出さない**。
5. Git連携で再デプロイした後、管理者で `/admin` を開き、7日・30日の集計を確認する。
6. 未設定・無権限・トークン失効・通信障害の場合も、既存Ops Dashboardには影響させない。

## 収集範囲と注意
- Data APIの `activeUsers` と `screenPageViews` 、公開ページの `pagePath` のみ取得。
- 同意を得た訪問者に限られるため、実際の総アクセス数とは一致しない。
- プライベートパス/入力フォーム情報を送らない。未知のパスやクエリ文字列を排除。
- サービスアカウント秘密鍵、Bearer token、APIレスポンスの生データはログに出さない。
- 取得値はプロセス単位で5分間キャッシュ。失敗は1分間抑制し、Functionが再起動したら再取得する。
- インストールや権限設定の前に自動的なGA4 APIアクセスを開始しない。
- Netlifyの攻撃ログ集計は異なる問題（Issue #76）。Google Analyticsにセキュリティイベントを送信しない。

関連 Issue #75。
