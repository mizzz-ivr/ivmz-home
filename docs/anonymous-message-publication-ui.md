# Issue #69 — Payload管理画面の公開承認・取り下げUI（Phase 6）

**前提**：既存PR #134の管理者専用API・監査トランザクション・DBガードに依存した積み上げDraft PR。本番では公開承認機能を有効にしない。

- Payload `anonymous-messages` 編集画面に UI field `publicationActions`を追加。その他のCollectionや公開ページには表示しない。
- サーバーコンポーネントで `ANONYMOUS_MESSAGE_PUBLICATION_ENABLED`を確認し、無効時は案内だけを表示。秘密鍵はクライアントに送らない。APIは別途認証・Origin・フラグを検証する。
- 保存済みの本文・返信・ステータスを確認。未保存の編集、処理中、未返信、New/Read/Hidden/Spamは公開承認不可。既存レコードのみ操作可。
- 公開承認・取り下げは各2段階確認。二重クリックを抑止し、成功後は同じ画面からの再操作を止めて最新画面再読込を案内する。
- 通信不明時に再送を煽らず、画面を読み直して結果を確認させる。HTTP認可/競合エラーも利用者に安全な説明のみ表示。
- 公開時は本文と返信のレビュー表示、取り下げ時は共有ID無効化・再公開時にIDが変わることを表示。
- **テスト**：運用OFF、未保存編集、未返信、明示確認、送信payload最小化、重複操作、409、通信中断、公開・撤回の権限差、Payload importMap生成一致、既存CMSフォーム回帰。
- **残件**：実Netlify隔離Previewで管理者UI・権限動作、SSR・OG・共有カード・キャッシュ非公開化、保持期間とPrivacy Policy、監査履歴閲覧。Issue #133が完了するまでmain/Productionにマージしない。
