# SNS・カレンダー連携

どれも **公開情報だけ** をサーバー側で取得し、未設定または失敗した場合は何も表示しません（ページは壊れません）。
Netlify の環境変数（Production）で有効にします。設定後は再デプロイが必要です。

| 機能 | 表示場所 | 環境変数 | 費用 |
| --- | --- | --- | --- |
| YouTube 最新動画 | `/links` の Latest videos | `YOUTUBE_CHANNEL_ID` | 無料（公開フィード、APIキー不要） |
| Google カレンダーの予定 | `/schedule` の Calendar | `GOOGLE_CALENDAR_ID` | 無料（公開iCal、APIキー不要） |
| X / Instagram / TikTok / YouTube の投稿 | `/links` の Posts | `SOCIAL_EMBED_URLS` | 無料（埋め込み。有料APIは使わない） |

## YouTube 最新動画

- `YOUTUBE_CHANNEL_ID` に `UC` で始まる24文字のチャンネル ID を入れます（YouTube Studio → 設定 → チャンネル → 詳細設定）。
- 公開 Atom フィード（`https://www.youtube.com/feeds/videos.xml?channel_id=...`）から最新6件を取得します。30分キャッシュ。

## Google カレンダー

- カレンダーの設定で共有を「一般公開して誰でも利用できるようにする」にしてください。
- `GOOGLE_CALENDAR_ID` にカレンダー ID（個人なら Gmail アドレス、別カレンダーなら `...@group.calendar.google.com`）を入れます。
- 公開 iCal から、これからの予定を最大10件、開始順に表示します。15分キャッシュ。
- 制限: 繰り返し予定（RRULE）は最初の1回だけ表示されます。非公開カレンダーや「予定の詳細は非表示」の設定のカレンダーは取得できません。個人の全予定を出したくない場合は、公開専用のカレンダーを別に作ってください。

## X / Instagram / TikTok の埋め込み

- `SOCIAL_EMBED_URLS` に投稿の URL をカンマか空白で区切って入れます（最大6件）。使えるのは次の形だけです。
  - X: `https://x.com/<user>/status/<数字>`
  - Instagram: `https://www.instagram.com/p/<コード>/` または `/reel/<コード>/`
  - TikTok: `https://www.tiktok.com/@<user>/video/<数字>`
  - YouTube: `https://www.youtube.com/watch?v=<11文字>` または `https://youtu.be/<11文字>`
- 訪問者が「投稿を表示する」を押すまで、外部サービスには一切接続しません。表示時の iframe はサンドボックス化し、リファラーも送りません。
- プロフィール URL やタイムライン全体の埋め込みは対象外です（スクリプト読み込みが必要になるため）。

## 将来の拡張（未実装）

- プロフィールの自動取得（X API は有料、Instagram / TikTok は審査が必要）は、必要になった時点で個別に検討します。
- 設定を CMS（Payload）から編集できるようにするには、スキーマ追加とマイグレーションが必要です。
