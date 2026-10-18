# Issue #69 — 匿名メッセージ共有ページ・OG画像（Phase 7）

## 目的と境界
- 対象は管理者が`status=replied`かつ`isPublic=true`で承認したレコードのみ。
- `/message/[publicId]`と`opengraph-image`は匿名閲覧可能なルート。ただし**`ANONYMOUS_MESSAGE_PUBLIC_PAGES_ENABLED=true`を設定するまで両方とも404**で、設定漏れではDB接続もしない。管理承認フラグとも独立。
- DBクエリではpublicId/公開フラグ/返信済みを同時に絞り、`toPublicAnonymousMessage`で`message,reply,publicId,publishedAt`のみのホワイトリストに射影。internalNote/requestId等はページ/OG/metadataに一切渡さない。
- 不正なID/非公開/撤回/未返信/取得エラーは404。旧共有IDは公開取り下げ時にNULLへ更新され、再承認時は必ず新規ID。
- Next.jsの`dynamic='force-dynamic'`、`revalidate=0`と`fetchCache='force-no-store'`を使用。Production先行PR #136で`/message/:path*`と`/api/message/:path*`に`Cache-Control: private, no-store`、`CDN-Cache-Control: no-store`、`Netlify-CDN-Cache-Control: no-store`を追加。OGレスポンスもno-storeを指定。
- 一覧ページ・検索用サイトマップ登録・検索エンジンindexは設けない。共有URLを知る人が閲覧できる設計であり、非公開情報の持ち込みを禁止する運用審査・プライバシー通知が別途必要。
- ローカル単体/E2EはフラグOFFの404とキャッシュ禁止、射影の4フィールド限定、不正ID・非公開・DB障害の拒否を検証する。
- 送信画面では管理者が承認した投稿本文と返信が共有ページ・SNS用画像に公開され得る旨を編集画面と確認画面で明示する。送信確認の明示チェックがないリクエスト（false/未指定/文字列）はAPIで422とし、CAPTCHA・レート制限・DB保存へ進めない。チェックを外したままの送信はUIでも不可。
- 公開理解のチェックはリクエスト内の必須真偽値であり、**DBに同意証跡を保存するものではない**。公開審査時は依然として個人情報や秘密情報の混入を人間が確認する必要がある。
- **未完了ゲート**：Issue #133での隔離Preview確認/実Turnstile/管理者認証、CDN実レスポンス/キャッシュ失効、iOS/Android実機、Privacy Policyと保存・削除期間の運用確定、OG日本語フォント/実画像検証。Productionでは本PRを未マージ・公開ページフラグOFFに維持する。

## 公開→撤回のCI検証（リリース前）
- `src/messages/public-reader.integration.test.ts` はGitHub Actionsの使い捨てPostgreSQL17だけで実行し、未公開→管理者承認→共有Reader取得→撤回→旧IDの404相当(null)→再承認後も旧IDが無効を確認する。
- 公開Readerのレスポンスは`message, reply, publicId, publishedAt`の4項目に限定し、管理用メモやrequestIdの非露出をテストする。
- `CI=true`・ローカルPostgreSQL宛・専用環境変数の3条件で検証を制限。テストレコードは終了時に消去する。
- **検証範囲の限界**：これはDBに接続するサーバーReaderの結合テストであり、Netlify実環境のSSR/OG HTTPレスポンス・CDNキャッシュ・Turnstile・DB接続先隔離の証明ではない。Issue #133の実環境テストは引き続き必須。

## SSR・OGのHTTP結合検証（隔離CI）
- `src/messages/public-http.integration.test.ts`は使い捨てPostgreSQL17と`127.0.0.1:3100`で起動した本番ビルドのNext.jsを使用する。
- 公開フラグを**ローカルCIサーバーのみ**ONにし、承認済みページのHTTP 200、OG PNGのシグネチャとno-store、内部メモ非露出、撤回・再承認後の旧URL/OG 404を検証する。
- CI・localhost DB・localhost HTTPの三重制限を設け、テストデータを最後に消去する。Netlify Previewの環境変数・Supabaseへの書き込みは行わない。
- **これはNext.jsの直接HTTP応答の検証であり、Netlify CDN・エッジキャッシュ・SNS側の画像キャッシュを通した検証ではない。** Issue #133の実Preview確認は引き続き未完了とする。
