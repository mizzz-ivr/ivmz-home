# Issue #69 — 非公開Inbox（Phase 1）

- **状態:** Payloadの専用 `anonymous-messages` CollectionとMigration、型・認可テストまで。匿名の投稿API、公開画面、OG画像はまだ提供しない。
- 既存 `/contact` / `contact-submissions` の表と権限は変更しない。管理画面のInboxグループに独立して格納する。
- REST/GraphQL（GraphQLはサイト全体で無効）の匿名CRUD不可。Createは全ユーザー拒否し、後続の専用RouteのみPayload Local API（`overrideAccess: true`）で入力許可リストとBot検証後に保存する。
- `read/update/delete`はPayloadの**管理用コレクションと一致する認証主体**だけ許可。投稿本文と冪等性キーはフィールドレベルでも編集不可。
- `reply`・`status`・`internalNote`は管理者が編集可。公開フィールド（`isPublic`、`publicId`、`publishedAt`）は**全クライアント入力から編集不可**・初期`isPublic=false`。後続の承認専用サーバー処理と監査なしに公開できない。
- `requestId` UNIQUE（重複投稿へのDB境界）。`publicId` UNIQUE（NULL複数件可）。閲覧側は `toPublicAnonymousMessage` の明示公開判定を必ず行う。
- DB Schema: `ivmz_home`。新規テーブルにRLS ENABLE（policyを作らない）、`payload_locked_documents_rels`にFK追加。migration up/downはPreviewの使い捨てDBで検証し、Productionの直接DB変更はしない。
- **リスク:** Migration downはテーブルを削除し、投稿がある場合データ消失する。Downを本番で安易に実行しない。
- **後続:** 匿名投稿Route（同一Origin/4KiB/Turnstile/durable rate limit/冪等性競合）、管理者公開審査・監査（公開ID生成と解除含む）、公開SSR・OG・PNG、保持/削除方針。
- 検証：CI format/lint/typecheck/Vitest/DB migrate/生成型一致/Chromium E2E。Previewはmigrationと管理画面の認可境界を確認後にリリース検討する。
