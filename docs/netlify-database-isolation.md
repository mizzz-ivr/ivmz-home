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
- CIでは使い捨てPostgreSQL17に既存Migrationを適用した後、`src/security/audit-db-boundary.integration.test.ts`で同一SQLを実行する。CI/ローカルDB/専用フラグの条件を満たさない場合は実行を拒否する。**実Supabaseに対するCI接続・書込はしない**。
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

## ProductionビルドがDB接続先ガードで失敗した場合（2026-10-19実測）

- Netlify Production #138〜#145のビルドは起動していたが、`node scripts/assert-production-database.mjs && pnpm build` で `Production DATABASE_URL does not target the configured Production project` と判定され**ビルド前に停止**していた。自動デプロイ停止やビルド上限超過が主因という従来の仮説は、この記録に対しては誤り。
- 設定ファイルのProduction Refは `drazbrcqnjxjuygfxmlz`、Preview Refは `dzdgbkjmomvmexcbjyin`。Netlifyのサイト変数メタデータは `DATABASE_URL` のProduction値が存在し、**秘密値としてマスク**されていることを確認。ただし、そのホスト・ロール・実接続先は未確認。
- 元のProductionガードはPooler接続ユーザーが `postgres.<Production Ref>` の場合のみ許可する。Previewガードと異なり、`app_runtime.<Production Ref>` などの**専用DBロール**は正しいProduction Refでも拒否していた。専用ロールが現場で使われていると確定したわけではない。
- 対処候補のPRでProduction Poolerのユーザー判定を**形式が妥当な単一ロール名 + 正確に一致するProduction Ref**に限定して対応する。Preview・未知のProject Ref、偽Pooler host、不正なロール名は拒否したまま。Direct接続は従来どおり `db.<Production Ref>.supabase.co` のみ許可する。
- **PRのマージ・本番再デプロイ前に、Netlify管理権限者がProduction contextの`DATABASE_URL`を管理画面内でのみ検証**する。URLそのもの、ホスト文字列、ロール名、パスワードをIssue・チャット・GitHub Actions・CIへ貼り付けない。
  - Direct接続ならhostのProject RefがProduction Refと一致すること。
  - Supabase Pooler接続ならhostが実SupabaseのPoolerで、usernameの末尾にあるProject RefがProduction Refと一致し、期待した専用DBロールであること。
  - Preview Refや未知のRef・異なるホストの場合は、**コード側のガードを緩めず**、認可された正しいProduction DB接続資格情報にNetlifyの秘密変数を修正する。現在のURLを表示・コピーできないときはSupabaseで資格情報を安全に照合し、新しい秘密値を管理者が入力する。
- この検査は「文字列が一致すること」の確認であり、実行ロールの必要最小権限、RLS、接続成功、バックアップ、Migration整合は別途確認が必要。Guardを無効化したデプロイは禁止。修正後のProductionビルドが `[production-db-guard] verified`、Ready、main SHA一致になるまでIssue #133はOpen維持。

### 2026-10-20：接続設定確認後のリリース判定

- 運用者から`DATABASE_URL`は正しいとの申告あり。これは**ユーザーによる確認結果**であり、マスクされたURLのhost/usernameを本監査ツールが独立検証した証拠ではない。資格情報の再掲やログ出力は行わない。
- ProductionガードがPoolerの正しい専用ロール（例：`app_runtime.<Production Ref>`）を拒否していた可能性に対して、専用ロールを許容する修正と回帰テストを準備。ただし従来許可される`postgres.<Production Ref>`やDirect接続が正しく設定済みであった場合は、**ガード誤判定以外の原因**のため、本修正だけで正常化すると断定しない。
- PRのCI・Deploy Preview・実Preview Smokeの成功を確認した後、Productionの変更差分・利用するロールと権限をレビューしてリリースする。Productionガードが失敗し続ける場合、エラーチェックを無効化・緩和せず、秘密情報を表示しない形でDB接続方式・Netlifyコンテキスト・Project Refを再確認する。
- リリース後の受入条件は、Productionビルドログの`[production-db-guard] verified`、公開デプロイのcommit SHAと`ready`、既存ページとContact/CMSの非破壊的Smoke。必要なMigrationやDB書き込みは本リリースの対象外。

## Production Deployが旧コミットのままの場合の復旧確認

Netlifyのサイトページ [ivmz-home](https://app.netlify.com/projects/ivmz-home) → Deploys と Project configuration → Developer settings → Continuous deployment を確認する。**新コミットへの反映が確認できるまで、Issue #133のProductionリリースゲートを完了にしない。**

1. **現在の公開Deploy IDとcommit SHAを記録。** GitHubのmain HEADと一致しなければ、GitHub CIが成功していてもProduction反映は未完了とする。
2. **Netlify Build statusを確認。** Stopped buildsなら変更理由・予算を確認してから有効化を判断する（有効化自体はビルドを起動しない）。Git連携の対象リポジトリとProduction branchが`mizzz-ivr/ivmz-home`・`main`か確認する。無断でGit連携を切断・再接続しない。
3. **Skipped / locked / failedなどの状態を確認。** `[skip netlify]`・`[skip ci]`、Ignore buildsルール、Publish停止、承認待ち、Netlify build creditsやクォータ・ビルドログの失敗内容を区別する。
4. Buildsが有効で、最新mainにビルドがない場合、管理権限者がNetlifyの **Deploys → Trigger deploy** から最新Production branchのデプロイを開始できる。**先に本番への公開が許可されたコミットか確認し、未知の差分や未検証のMigrationが含まれる場合は実行しない。**
5. Productionの対象commit SHAがmain HEADと一致し、Deploy state=`ready`、ビルドログに`[production-db-guard] verified`を確認する。ログへ`DATABASE_URL`や資格情報を出さない。ガードが失敗すれば設定を修正し、他DB接続へ切り替えて迂回しない。
6. 既存公開API・ページ・ContactのSmokeを確認してから切替完了とする。異常時はDeploysから既知の正常な以前のDeployへRollbackし、原因をIssueに記録する。

Netlify公式：[Stop or activate builds](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/)、[Manage deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/)、[Repository linking](https://docs.netlify.com/build/git-workflows/repo-permissions-linking/)。

## リリース判定で残る必須確認

1. NetlifyにおけるProductionビルドが、mainのガード追加後のコミットで`ready`になり、ガードの正常実行がビルドログで確認できること。
2. NetlifyのProduction／Preview各contextの`DATABASE_URL`を管理権限で**秘密値を露出せず**確認し、実Project Ref・DBユーザー・DB権限が区別されていること。マスクされている場合は証明済みとしない。
3. Preview専用DBへの実接続、権限境界・RLS、Migration up/down、バックアップ・復元手順を確認する。**この確認前はPreviewで書き込みを伴う投稿テストをしない。**
4. 実Netlify PreviewでTurnstile/IP/429、公開SSR/OGのno-store/CDN挙動を確認する。

これらの証跡が揃うまではIssue #133をOpenとし、匿名投稿の本番機能フラグを有効化しない。
