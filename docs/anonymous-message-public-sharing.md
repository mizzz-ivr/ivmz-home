# Issue #69 — 匿名メッセージ共有ページ・OG画像（Phase 7）

## 目的と境界
- 対象は管理者が`status=replied`かつ`isPublic=true`で承認したレコードのみ。
- `/message/[publicId]`と`opengraph-image`は匿名閲覧可能なルート。ただし**`ANONYMOUS_MESSAGE_PUBLIC_PAGES_ENABLED=true`を設定するまで両方とも404**で、設定漏れではDB接続もしない。管理承認フラグとも独立。
- DBクエリではpublicId/公開フラグ/返信済みを同時に絞り、`toPublicAnonymousMessage`で`message,reply,publicId,publishedAt`のみのホワイトリストに射影。internalNote/requestId等はページ/OG/metadataに一切渡さない。
- 不正なID/非公開/撤回/未返信/取得エラーは404。旧共有IDは公開取り下げ時にNULLへ更新され、再承認時は必ず新規ID。
- Next.jsの`dynamic='force-dynamic'`、`revalidate=0`と`fetchCache='force-no-store'`を使用。Production先行PR #136で`/message/:path*`と`/api/message/:path*`に`Cache-Control: private, no-store`、`CDN-Cache-Control: no-store`、`Netlify-CDN-Cache-Control: no-store`を追加。OGレスポンスもno-storeを指定。
- 一覧ページ・検索用サイトマップ登録・検索エンジンindexは設けない。共有URLを知る人が閲覧できる設計であり、非公開情報の持ち込みを禁止する運用審査・プライバシー通知が別途必要。
- ローカル単体/E2EはフラグOFFの404とキャッシュ禁止、射影の4フィールド限定、不正ID・非公開・DB障害の拒否を検証する。
- **未完了ゲート**：Issue #133での隔離Preview確認/実Turnstile/管理者認証、CDN実レスポンス/キャッシュ失効、iOS/Android実機、Privacy Policyと保持期間、OG日本語フォント/実画像検証。Productionでは本PRを未マージ・公開ページフラグOFFに維持する。
