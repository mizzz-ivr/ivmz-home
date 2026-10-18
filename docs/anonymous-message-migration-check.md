# 匿名メッセージMigrationの往復検証（Issue #69）

**運用境界：この検査はGitHub CI内の使い捨てPostgreSQL 17サービス専用です。**
`ANONYMOUS_DB_ROLLBACK=true` をProduction/PreviewのDBを指した状態で実行してはいけません。

## 目的
既存ContactやPayload CMSのテーブルを破壊せずに、匿名メッセージ専用の二つのMigrationを下げて戻せるか確認する。

## 実装
- CIの `pnpm db:migrate` と実Postgres並列投稿テスト（PR #131）が終了した後に、`src/messages/rollback.integration.test.ts` を個別実行。
- 匿名Inbox・レート制限の両テーブルが**空**であることを事前検査。レコードがあればdownを試みず、CIを失敗させる。
- Rate limitのdown→Inboxのdownを実行して両テーブル・ステータスenum・Payload locked-documentsへの関連カラムの削除、既存Contactテーブル存続を確認。
- Inboxのup→Rate limitのupを順に適用し、テーブル・インデックス・RLSが復元されたことを確認。アサーション失敗時も可能な範囲で再適用。
- 通常のVitestおよびNetlify Runtimeでは自動実行しない（CI内の明示フラグのみ）。

## 残るリリースゲート
Netlify実Preview上の管理者権限、IPヘッダー、Turnstile、レート制限の429、同時送信の観測、本番運用時のDBバックアップ・復旧手順、公開審査・監査・Privacy Policyを別途確認する。
