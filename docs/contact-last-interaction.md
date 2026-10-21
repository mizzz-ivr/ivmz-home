# 最終対話日時（lastInteractionAt）導入前の安全設計 — Issue #98

## 目的と現状

問い合わせ本文・連絡先は**最後のやり取りから365日を目安**、S3 clean添付は90日を維持する。現実装の `updatedAt` はメモやステータス変更・通知状態の更新でも進むため、対話日時の代用はできない。このPRは記録イベントを定義し、将来のNULL許容列について**CI使い捨てPostgreSQL17で安全性を先行検証**するだけである。正式Migration、ProductionのDB構造、既存行、保持候補・削除判定・S3は変更しない。

## 記録対象の判定

| 操作 | `lastInteractionAt` 更新 | 判断根拠 |
| --- | --- | --- |
| 利用者の問い合わせを検証後にDBへ初回保存 | 対象（今後の新規受付） | 永続化が成功した事実。重複`requestId`再送は更新しない |
| 利用者からの追記・返信を保存 | 対象（将来の受信機能） | 受信日時、案件ID、本人照合、保存成功が必要 |
| 担当者からの実際の個別返信を送信 | 対象（将来の返信機能） | 送信成功と案件紐付けを証明。到達成功とは断定しない |
| `status=read/replied/archived/spam`への変更 | **対象外** | ステータス変更だけでは送信を立証できない |
| 管理者の`internalNote`変更 | **対象外** | 内部メモ |
| SES管理者宛通知・自動受付メール・`notification`変更 | **対象外** | 本人との個別対応ではない |
| 添付のスキャン・閲覧、`updatedAt`の変化 | **対象外** | 技術的/事務的操作 |

現在のアプリに実装されているのは初回受付の保存とメール通知のみ。**個別の返信送受信を記録する機構はない**ため、`replied`や`notification=sent`を証拠として扱わない。

## データ設計と既存データの扱い

- 将来の列案：`ivmz_home.contact_submissions.last_interaction_at timestamp(3) with time zone NULL`。DEFAULT、NOT NULL制約、自動バックフィルは設定しない。
- **既存レコードはNULL（unknown）を維持**。`updatedAt`・`createdAt`・`replied`・内部通知日から最終対話日を推測して書き込まない。初回受付日時は存在しても、その後の個別返信が記録されている保証はない。
- 新規受付ではDB保存に連動して日時を記録する実装を、正式Migrationと互換性を確認した後の別PRで追加する。再送・保存失敗では日時を進めない。
- 継続返信はイベントIDの冪等性、サーバーで検証した時刻、監査記録、古い時刻への巻戻し防止を必須とする。管理者が任意の日付を指定する機能は認可と証跡を別途設計する。
- **NULLは削除可能を意味しない**。保持日数の起算点切替と削除解禁は別承認。現在の`eligible`/`overdueNew`/`reviewRecentUpdates`も変更しない。

## Migration / rollback検証と本番導入ゲート

1. **今回の検証**：CIで従来の全Migrationを適用後、固定のローカルDB接続ガード付きの単一トランザクションでダミーレコード作成、nullable列追加、旧行NULL・管理操作不変・明示的更新・DROP COLUMNを検証し、例外で**全操作ROLLBACK**する。
2. **今後の正式導入前**：Payloadの正式Migration/up/downとsnapshot・生成型を作成し、隔離Previewの使い捨てデータで再適用、RLS、既存行保持、障害時復元を確認。スキーマロック・接続先・実運用バックアップ/復元もレビューする。今回のトランザクション試験はこれらを完了した証拠ではない。
3. **切戻し**：値を書き始める前なら、隔離DBで検証したdownを候補にできる。書き込み開始後は**旧アプリへ戻して列は保持**する。値の入った列のDROPはデータ破壊的であり、本番で実行しない。
4. **保持削除の解禁条件**：unknown値と長期Newの扱い、例外/法的保全、S3/DBアウトボックス、冪等リトライ、バックアップ・復元、本番操作承認、ダミーPreview実証をすべて満たすこと。

## テストと残課題

正常：新規・追記・実際の返信、履歴更新／異常：送信失敗、DB障害、認可なし、重複受信／境界：365日、UTC/JST、同時返信、未来日時、NULL／回帰：メモ・ステータス・SES通知・既存APIの集計と削除停止を検証する。実際のイベントwriter、正式Migration、削除判定変更のテストと本番移行は**未対応**。

参照：[保持ポリシー](./contact-retention-policy.md)／[Issue #98](https://github.com/mizzz-ivr/ivmz-home/issues/98)。


## 2026-10-21 実環境の読み取り専用確認

- Supabase `ivmz-home-preview`（Preview用）：`last_interaction_at` はすでに `timestamptz NULL`、defaultなしで存在し、RLSは有効。Supabase migration履歴にも追加実施の記録がある。
- Supabase `ivrm-core`（Production用）：当該列は**未追加**。既存問い合わせがあるため、空DBとは扱わない。
- 両プロジェクトは別project refとして存在する。ただし**接続secretの値そのものと権限の完全分離・Netlify本番ランタイム接続先は未検証**。
- Supabase組織はFreeプラン。標準の自動DBバックアップ/復元は本番の安全策として確認できていない。**取得物を守れる論理バックアップ、オフサイト保管、復元テストの確証がない状態で本番Migrationを実行しない**。
- Draft [PR #157](https://github.com/mizzz-ivr/ivmz-home/pull/157) の実装を公開する場合は、Production側に列を**先行移行・検証**してからアプリコードをマージする。現行の列未追加状態では公開しない。
- PR #159のCI移行試験は列なしの状態だけを想定していたため、今回、列が**存在しない場合も既存の場合も安全に試験できる**よう更新。両パターンで試験レコードとDDLのトランザクションROLLBACK後の復元を確認する。正式Migrationが含まれるPRでのCI再実行が引き続き必要。
- NetlifyのProductionはPR #159マージ後も旧コミットのままであり、GitHub/main一致の本番公開を確認できていない。自動ビルド・自動公開設定とDeploy履歴を確認する。公開状態とMigration状態を混同しない。

**解除条件：** (1)復元可能なバックアップを確保し隔離環境で復元実証、(2)実接続先を検証、(3)Preview migration/CI・E2E成功、(4)Productionで安全な追加型Migrationを先行適用し既存値/列/RLSをread-only確認、(5)本番デプロイのSHA一致と動作検証。未達の場合は #157 Draftを維持する。
