# 運用の可視化・通知

問い合わせ機能まわりの状態を、**管理画面のダッシュボード**で見られるようにし、**失敗したときは通知が届く**ようにする仕組みです。
どれも任意の設定で、環境変数を入れるまでは何も動きません（既存の機能には影響しません）。

| 機能 | 見る場所／届く場所 | 必要な設定 |
| --- | --- | --- |
| 運用ダッシュボード | 管理画面のトップ（`/admin`） | なし（デプロイすると表示されます） |
| 失敗時のアラート | Discord／Slack | `OPS_ALERT_WEBHOOK_URL` |
| 定期ヘルスチェック | GitHub Actions（失敗するとGitHubからメールが届く） | `OPS_HEALTH_TOKEN` ＋ GitHub のシークレット |
| 保存期間を過ぎた問い合わせの確認 | GitHub Actions（毎週月曜、集計のみ） | `OPS_HEALTH_TOKEN`（Netlify ProductionとGitHub Actionsの両方） |

## 1. 管理画面のダッシュボード

`/admin` の最初に「運用ダッシュボード」が出ます。表示されるのは件数などの集計だけで、名前・メールアドレス・本文は出ません。

- 今日／7日／30日／累計の問い合わせ件数、未対応（ステータスが New）の件数、添付つきの件数
- メール通知の状態（直近7日）: 送信済み／失敗／不明／スキップ／送信待ち
- 直近の通知エラー（クリックすると該当の問い合わせが開きます。問い合わせ自体は保存されています）
- 保存期間を過ぎた件数
- 設定チェック（メール通知、受付確認、添付、ボット対策、アラート、ヘルスチェック、自動削除が有効かどうか）

右上のバッジは、通知の失敗が24時間以内にある、または送信待ちのまま15分以上残っているものがあると「要確認」、データベースに接続できないと「障害」になります。

## 2. 失敗時のアラート（Discord／Slack）

次のことが起きたとき、本番環境だけから Webhook へ通知します。**個人情報（名前・メール・本文・ファイル名）は含みません。** 同じ内容の通知は、同じサーバー内では10分に1回までに抑えています（サーバーが複数に分かれた場合は、数件重複して届くことがあります）。

- 管理者へのメール通知が失敗した／タイムアウトした
- 問い合わせの保存に失敗した、送信がタイムアウトした
- 添付ファイルでウイルスを検知した、スキャンが完了しなかった、アップロード準備に失敗した
- ヘルスチェックが「要確認」または「障害」になった
- 保存期間を過ぎた問い合わせを削除した

設定:

1. Discord のチャンネルの「連携サービス」→「ウェブフック」で、新しいウェブフックを作り、URL をコピーします（Slack なら Incoming Webhooks）。
2. Netlify の環境変数（Production）に `OPS_ALERT_WEBHOOK_URL` としてその URL を入れます。スコープは **Functions と Runtime**。
3. 再デプロイします。

> URL は秘密情報です。チャットや Git には貼らないでください。

## 3. 定期ヘルスチェック（GitHub Actions）

30分ごとに、本番の `/api/ops/health` を確認します。異常（データベースに接続できない、通知の失敗が残っている、など）があるとワークフローが失敗し、**GitHub からあなたにメールが届きます**（Webhook を設定していれば、サイトに到達できなかったときだけ、そちらにも通知します（サイトが異常を報告したときは、サイト自身が通知します））。

設定:

1. 合言葉（トークン）を作ります。ターミナルで `openssl rand -hex 32` を実行すると作れます。24文字以上であれば何でも構いません。
2. Netlify の環境変数（Production）に `OPS_HEALTH_TOKEN` として入れます（スコープは Functions と Runtime）。
3. GitHub のリポジトリ → Settings → Secrets and variables → Actions → **Secrets** に、同じ値を `OPS_HEALTH_TOKEN` として登録します。（任意）`OPS_ALERT_WEBHOOK_URL` も同じように登録すると、失敗が Discord にも届きます。
4. 再デプロイします。Actions タブの「Ops Health」→「Run workflow」で、すぐに試せます。

トークンが未設定だと `/api/ops/health` は404になります。GitHub側にもSecretがない場合、
定期ヘルスチェックは**未実行のまま成功扱い**になり、実際の稼働状態は確認できません。
GitHub側だけに設定されていてNetlify側が未設定の場合は404で警告扱いになります。
**週次保持レポートはトークン未設定・404のどちらでも失敗**し、削除は実行しません。
ヘルスチェックが緑色でも、Secretsの未設定がないことを別途確認してください。

## 4. 保存期間を過ぎた問い合わせの確認（定期ジョブは削除しない）

**保持方針は本文365日・添付実ファイル90日で確定。** 起算点と例外、DB/S3削除の整合・復旧条件は[問い合わせ保持・削除ポリシー](./contact-retention-policy.md)を参照してください。

プライバシーポリシーの「最後のやり取りから1年を目安に削除」に関して、
現時点では**期限を過ぎた件数の確認だけ**を自動実行します。実際の削除運用はIssue #98で
DBとS3の保持期間・バックアップ・失敗時の復旧方法を確定するまで保留しています。

- DBの対象期間: 既定365日（`CONTACT_RETENTION_DAYS`で30〜1825日）。
  最終更新日が基準で、ステータスがNew（未対応）の問い合わせは削除対象に含めません。
- GitHub Actions `Ops Health` の週次`retention`ジョブは、
  `scripts/ops-retention-report.mjs`を通じて`POST /api/ops/retention`に
  空のJSON `{}`だけを送信し、削除対象件数`eligible`と受付から設定期間を超えた未対応件数`overdueNew`の**dry-run**結果をSummaryに記録します。
  `overdueNew`は`createdAt`基準、`eligible`は`updatedAt`基準であり、両者を足して削除対象とみなしません。
  Productionが新API未反映の場合は`overdueNew=unavailable`と表示し、**0件と誤認しない**ようにします。
- `RETENTION_APPLY`をGitHub Variablesに設定しても、現在の週次ジョブからは
  データ削除を実行できません。**この変数を有効化しないでください。**
- 一方、API自身には手動削除用の処理が残っています。
  正しいBearerトークン、リクエストの`apply: true`、
  Netlify側の`RETENTION_PURGE_ENABLED=true`が揃うと最大200件ずつ削除可能です。
  **保持方針と復旧計画が決まるまでは`RETENTION_PURGE_ENABLED`を設定しないでください。**
  定期ジョブがdry-run専用であることは、APIを直接呼び出しても削除されないという意味ではありません。
- 添付ファイル（S3 `clean/`）は現在90日、DBの問い合わせは365日を既定とするため、
  DB参照だけ残り添付を取得できないケースがあり得ます。
  保持日数を一方的に変更したり、過去データを自動で消去したりしないでください。

`OPS_HEALTH_TOKEN`が未設定の場合、週次レポートは失敗します。
本番のトークン設定後はGitHub Actionsで`Ops Health` → `Run workflow` →
`task: retention`を選び、**削除件数ではなくdry-runの件数だけ**が表示されることを確認します。
エラーや応答本文に秘密値・問い合わせ本文を出力しない運用を維持してください。

## 5. トラブルシューティング

| 症状 | 確認すること |
| --- | --- |
| ダッシュボードが「統計を取得できませんでした」 | データベース（Supabase）の状態、`DATABASE_URL` |
| ヘルスチェックのワークフローが 401 | Netlify と GitHub の `OPS_HEALTH_TOKEN` が同じ値か（前後の空白に注意） |
| ヘルスチェックのワークフローが 404 | Netlify に `OPS_HEALTH_TOKEN`（24文字以上）が入っているか、再デプロイ済みか |
| アラートが届かない | `OPS_ALERT_WEBHOOK_URL` が Production で Functions／Runtime に入っているか。10分以内の同じ内容は送られません |
| 定期保持レポートが失敗する | Netlify ProductionとGitHub Actions双方の`OPS_HEALTH_TOKEN`、404・401・5xxのエラー種別を確認する。保持ジョブはdry-run専用 |

## 仕組みの補足（開発者向け）

- 集計: `src/ops/stats.ts`。ダッシュボード（`src/components/admin/OpsDashboard.tsx`）とヘルスAPIが同じ関数を使います。
- アラート: `src/ops/alert.ts`（送信）、`src/ops/schedule-alert.ts`（レスポンス後に実行）。
- API: `GET /api/ops/health`、`POST /api/ops/retention`（どちらも `Authorization: Bearer <OPS_HEALTH_TOKEN>`）。
- ワークフロー: `.github/workflows/ops-health.yml`。
