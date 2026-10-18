# Issue #69 — 匿名POST API（Phase 2）

- POST `/api/message` のみ。GETは追加しない。公開ページ・共有OG・公開承認はまだ提供しない。
- **運用ゲート:** `ANONYMOUS_MESSAGES_ENABLED=true`（デフォルトOFF）に加え、`TURNSTILE_SECRET_KEY` と専用32文字以上の `ANONYMOUS_MESSAGE_HASH_KEY` が必要。満たさない場合503でfail-closed。Previewでもトークン検証は必須（既存Contact用のPreviewスキップは継承しない）。
- Origin: 既存 `isAllowedContactOrigin` で本番/Previewの正規URLのみ許可。Content-Type: application/json。request bodyはストリーム中に4KiB（UTF-8バイト）まで。入力は既存の `parseAnonymousMessageSubmission` に限定。
- honeypotは保存せず202。Turnstileサーバー検証に成功した場合だけ DB rate limitに進む。失敗時は403。
- 信頼済み `x-nf-client-connection-ip` だけ使用し、X-Forwarded-Forは信用しない。専用シークレットでHMAC化し、DBにはdigestだけ保存。欠落/不正/シークレット不足は受付しない。PostgreSQLの原子的ON CONFLICT UPSERTで10分窓あたり5件まで受理し、超過429。期限切れ+1日の行はリクエストごとに掃除する。
- Payload Local APIの `anonymous-messages` に非公開状態で保存。DBのUNIQUE `requestId` で二重送信を防ぎ、同じID/同じ本文の再送は200、同じID/異なる本文は409。例外時はDB競合を確認し、それ以外は503で閉じる。
- レスポンスとログには本文・IP・Turnstileトークン・管理者用メモ・投稿レコードIDを含めない。
- **このPRは#128の未マージDBコレクションに積み上げるDraft。** 本番ONにしない。後続に投稿UI、公開承認・監査、公開画面/OG、低容量端末・実攻撃条件の実測。
- テスト：Origin/Content-Type/413/422/400/429/403/409/201/200/503、外部IP偽装防止、Postgres migration、E2E/既存Contact回帰。Rate limitの実DB並列試験・Migration down・Previewの手動確認は別途ゲート。
