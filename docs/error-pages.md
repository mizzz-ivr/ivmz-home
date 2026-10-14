# エラーページ（HTTP エラー）

| 状況 | 表示 | ファイル |
| --- | --- | --- |
| 存在しないコンテンツ（`notFound()`、公開していない Works／Blog／News の slug など） | 404 | `src/app/(site)/not-found.tsx` |
| どのルートにも一致しない URL | 404（HTTP ステータスも 404） | `src/app/global-not-found.tsx`（`next.config.ts` の `experimental.globalNotFound`） |
| ページの表示中の例外 | 500 と「もう一度試す」ボタン | `src/app/(site)/error.tsx` |
| ルートレイアウトまで壊れた場合 | 最小限の 500（外部ファイルなし） | `src/app/global-error.tsx` |

- 共通の見た目は `src/components/site/ErrorScreen.tsx` と `src/app/(site)/errors.css` です。大きなステータス番号、キャラクター、ほかのページへのリンクがあります。動きは「視差・動きを減らす」設定で止まります。
- 管理画面（`/admin`）のエラーは Payload 側の画面です。
- 500 では、エラーの詳細は画面にも、ブラウザのログにも出しません。サーバーのログと突き合わせるための `digest` だけを記録します。
- Netlify 自体が返すエラー（502／503 など）は、このサイトのコードでは差し替えられません。
- 未知の URL の 404 に Next.js の初期画面が出ていた不具合は、`global-not-found.tsx` で直しました（`/api/...` の 404 は、これまでどおり本文なしです）。
