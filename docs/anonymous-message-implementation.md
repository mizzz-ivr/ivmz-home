# Issue #69 匿名メッセージ — 段階実装とセキュリティ境界

## このPRの範囲

- `src/messages/schema.ts`: 1〜300文字（Unicodeの書記素単位）の入力、UUID v4の冪等性キー、制御文字の拒否、honeypot判定とサーバー側の許可フィールド選別。
- `src/messages/publication.ts`: 管理者による明示的な公開フラグ・返信済み状態・公開用IDと日時をすべて満たす場合だけ、本文と公開返信を最小投影する関数。
- Vitestで正常系、異常系、境界値、非公開化、内部フィールドの混入防止を検証。

**未公開の機能土台です。** このPRには投稿ページ、API、DB、Payload Collection、Migration、OG画像は追加しません。実際の受付・保存・配信はできません。既存Contactとは接続・共有しません。

## 実装時の必須ガード（後続PR）

1. `/api/message` に同一Origin確認、`application/json`判定、4KiBの**逐次読み込み制限**を置く。Content-Lengthだけを信用しない。パーサーで`honeypot`の場合は保存せず同じ成功扱いにする。
2. Turnstileは本番で設定された秘密鍵に対してサーバー検証する。未設定時の公開可否は運用判断とし、永続化された共有レート制限が利用できない場合は本番の投稿受付を無効化する（fail closed）。
3. 永続化された`requestId`はDBでUNIQUE制約を付け、同一ID・同一内容の再送のみ重複扱い。同一ID・別内容は409とし、競合時にもDB一意制約で原子的に判定する。
4. Payloadの`anonymous-messages` Collectionは専用化する。匿名ユーザーからのREST/GraphQL create/read/update/deleteを禁止し、信頼された専用RouteだけがLocal API `overrideAccess`を使う。原文は管理者編集不可にし、公開フラグと内部ノートの更新を分離する。
5. 管理者権限はログイン有無だけでなく`users`コレクションの認証主体に限定する。公開承認変更は操作者ID・時刻・対象ID・旧/新状態だけを監査し、メッセージ本文や送信元IPをログに記録しない。
6. `/message/[publicId]` とOG/PNGは必ずサーバーで再取得し、`toPublicAnonymousMessage`に通してnullなら404にする。投稿本文はテキストとして描画し、HTMLを解釈しない。共有用IDは暗号学的乱数から作り、推測できないことを確認する。非公開化・削除時にはSSR/OG/CDNキャッシュが即時無効になるよう設計する。
7. Migrationは`ivmz_home`スキーマに限定し、RLSを有効化、up/downと空DBをPreview専用DBで検証する。`payload generate:types`の生成物をコミットする。本番DBを直接編集しない。
8. DB保存期間、スパム削除、公開審査基準、個人情報・機密情報が混入した際の非公開化手順を運用で定める。

## 責務とテスト

- ドメインパーサーと公開判定はネットワークやDBに依存しない。API、Payload、SSR/OGから再利用する。
- `src/messages/*.test.ts` はPR段階でCIのVitestに組み込まれる。
- 次段階ではHTTPの403/413/415/422/429/409、CAPTCHA失敗、並列投稿、認可、公開・非公開切替、HTML/絵文字、SSR/OG、migration up/down、既存`/contact`回帰を追加する。
- 現段階で`/message`を公開しない。デザインPR・3D/セキュリティPRと合流させず、GitHub CIとNetlify Deploy Previewの必須チェックを通し、オーナー承認のうえでmainへ反映する。新しい投稿機能はまだ公開しない。

関連: [Issue #69](https://github.com/mizzz-ivr/ivmz-home/issues/69)
