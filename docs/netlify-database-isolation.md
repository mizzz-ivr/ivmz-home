# Netlify DB接続先の隔離チェック（Issue #133）

## 目的

NetlifyのProduction／Deploy Previewが誤って別環境のSupabaseに接続・Migrationしないことを証明する。接続文字列・パスワード・APIキーはIssue／PR／ログへ貼り付けない。

## 2026-10-19の確認記録（読み取りのみ）

| 環境 | Supabaseプロジェクト | `ivmz_home`テーブル数 | 匿名投稿テーブル数 | RLS有効テーブル数 |
| --- | --- | ---: | ---: | ---: |
| Production | `ivrm-core` | 29 | 0 | 29 |
| Preview | `ivmz-home-preview` | 30 | 0 | 30 |

両プロジェクトは別のSupabase Project Refを持つ。両環境とも、Supabaseの検証用`postgres`権限で行った読み取りでは`anon`／`authenticated`に`ivmz_home`スキーマの`USAGE`権限はない。

**注意：この結果だけではNetlify実行時に使用する`DATABASE_URL`の接続先・ユーザー・RLS適用状況を保証しない。** SQL実行ユーザーは検証用の`postgres`であり、Netlifyの実行ユーザーではない。

## 再現可能なRLS・DB権限監査

- 読み取り専用の `scripts/audit-supabase-boundary.sql` を、SupabaseのSQL Editorか読み取り権限があるセッションからProduction・Previewそれぞれに対して**個別に**実行する。接続URL/パスワード/レコード本文は出力しない。
- `table_count` と `rls_enabled_tables` を比較し、`rls_disabled_tables=0`、`anon_direct_access_objects=0`、`authenticated_direct_access_objects=0`、`security_definer_functions=0` を確認する。`anon_role_exists`/`authenticated_role_exists` がfalseなら、該当ロールの権限監査は**未実施扱い**にする。
- 結果は**実行したDBロールの視点**であり、実際のNetlify `DATABASE_URL`の接続先・role、Supabase Data APIのExposed Schemasやバックアップ設定を証明するものではない。
- CIでは使い捨てPostgreSQL17に既存Migrationを適用した後、`scripts/audit-supabase-boundary.integration.test.mjs`で同一SQLを実行する。CI/ローカルDB/専用フラグの条件を満たさない場合は実行を拒否する。**実Supabaseに対するCI接続・書込はしない**。
- 2026-10-19実測：Productionは29テーブル（RLS 29・非有効0）、Previewは30テーブル（RLS 30・非有効0）。両方で`anon`・`authenticated`の直接アクセス可能オブジェクト0、スキーマUSAGE=false、当該スキーマのSECURITY DEFINER関数0。いずれも管理者`postgres`で実行した読み取り結果。

## Previewビルドのfail-closedガード

- `assert-preview-database.mjs`は`deploy-preview`／`branch-deploy`以外を拒否する。
- Preview／Production両方のProject Refは20文字の英数字、かつ相互に異なることを必須とする。欠損・不正値・同一値は**Migration実行前**に拒否する。
- `DATABASE_URL`は`postgres:`または`postgresql:`に限定し、接続先がPreview Refと一致する場合のみ通す。Production・未知DB・見せかけのホスト名は拒否する。
- エラー出力にパスワード・URL・トークン・クエリパラメータを含めない。
- Production側は別の`assert-production-database.mjs`で対応済み。両ガードとも接続文字列の構文・ホスト情報の検証であり、DBに実接続して証明するものではない。

## 自動Migrationの停止

- Netlifyの`deploy-preview`と`branch-deploy`から`pnpm db:migrate`の自動実行を削除した。**Project Refが正しいという文字列検査だけで、DBユーザー・権限・RLS・バックアップが保証されたと誤認してMigrationを実行しないため**。
- Previewビルドでは接続先ガードを先行実行し、成功した場合のみ`pnpm build`する。build自体の接続・読み取り挙動も実Previewで引き続き検証する。
- 実際のMigrationはPreview専用DBの接続先・実行ロール・権限・バックアップとロールバック手順を確認してから、運用者が明示的に実行する。現時点では**Preview DBへも書き込みを行わない**。
- 将来の機能PRでSchemaが必要になった場合、Migration前はPreviewアプリがエラーを返す可能性がある。これは検証ゲートを迂回して自動Migrationする理由にはしない。
- `scripts/netlify-build-context.test.mjs`で本番・Preview各contextのガード先行とPreviewの自動Migration不在をCIで検証する。

## リリース判定で残る必須確認

1. NetlifyにおけるProductionビルドが、mainのガード追加後のコミットで`ready`になり、ガードの正常実行がビルドログで確認できること。
2. NetlifyのProduction／Preview各contextの`DATABASE_URL`を管理権限で**秘密値を露出せず**確認し、実Project Ref・DBユーザー・DB権限が区別されていること。マスクされている場合は証明済みとしない。
3. Preview専用DBへの実接続、権限境界・RLS、Migration up/down、バックアップ・復元手順を確認する。**この確認前はPreviewで書き込みを伴う投稿テストをしない。**
4. 実Netlify PreviewでTurnstile/IP/429、公開SSR/OGのno-store/CDN挙動を確認する。

これらの証跡が揃うまではIssue #133をOpenとし、匿名投稿の本番機能フラグを有効化しない。
