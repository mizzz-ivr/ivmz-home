# Issue #69 — 管理者の公開承認と監査（Phase 5）

- 管理用 `POST /api/message/admin/publication`。**`ANONYMOUS_MESSAGE_PUBLICATION_ENABLED=true` の明示設定がない場合503、デフォルトOFF**。
- Payload既存cookie/tokenによる `payload.auth` と`config.admin.user`の完全一致を必須化。違うAuth Collectionは403。Originの完全一致検証、1KiBストリーミング上限と最小スキーマ（正数IDとpublish/unpublishのみ）でCSRFと余計なフィールドを拒否。
- 公開には管理者が `status=replied` にし、本文と返信を入力したうえで明示承認する必要がある。公開中の返信/状態の通常CMS変更および削除は拒否し、撤回してから変更・再承認させる。
- PGトランザクションと行ロックで承認/撤回の多重リクエストを直列化し、公開状態と監査レコードを一括コミット。ランダム22文字の公開IDは毎回新規発行、撤回時はID・公開日時もNULLに戻す。
- Auditは管理者User ID・匿名メッセージ内部ID・action・作成時刻のみを保持。本文、IP、cookie、requestId、トークンは保管しない。RLS有効化・公開REST Collectionには含めない。
- **未対応：** 操作用の管理画面ボタン、公開/共有SSR・OG、URLのキャッシュ制御、保持/削除・監査ログへの管理者専用可視化、Privacy Policyの明記、Preview実DB隔離と認証実機検証。Issue #69 / #133をOpen維持し、main/Productionへ未マージ。
- **テスト観点：** 匿名401・非管理者403・越境Origin403・422/413・未返信409・重複承認409・複数並列承認1件だけ成功・監査の原子的保存・公開IDローテーション・撤回後の非公開、既存Contactとの回帰。

- 追加のDB制約：PostgreSQLのBEFORE UPDATE/DELETEトリガーで公開中の返信・ステータスの変更と削除を拒否。CMSの変更フックを読み越した競合編集もDB境界で防ぐ。Migration rollback検査は監査テーブルとトリガーもdown→up対象にし、RLSの復元を確認。
