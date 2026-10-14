# Netlify クレジットを使い切らないための運用

無料プランは月 300 クレジットです。使い切ると、本番デプロイがスキップされます（`docs/netlify-production-sync.md` の事例）。Deploy Preview のビルドもクレジットを使うため、レビューの指摘ごとに push を重ねると、月の枠を早く使い切ります。

## 方針

1. **途中の確認は GitHub Actions で行う。** `CI` の `e2e-local` ジョブが、ローカルの本番ビルドに対して Chromium のブラウザテストを実行します（Netlify は使いません）。型チェック・lint・単体テスト・ビルドは `quality` ジョブです。
2. **作業中のコミットには `[skip netlify]` を付ける。** コミットメッセージに含めると、Netlify はそのコミットをビルドしません。プルリクエストのタイトルに含めると、Deploy Preview の待ち受け（`preview-smoke`）も省略されます。
3. **最後に1回だけ、本物の Deploy Preview で確認する。** マージには必須チェック `netlify/ivmz-home/deploy-preview` が必要なので、`[skip netlify]` のままではマージできません。また、スカッシュマージのコミットメッセージに `[skip netlify]` が入ると、本番デプロイもスキップされます。マージ時のタイトルにはタグを含めないでください。 レビューの指摘への対応が終わり、`CI` が通ったら、`[skip netlify]` を外した最終コミットを作ります。Netlify 固有のもの（ヘッダー、レート制限、デプロイの流れ）は、この1回の `preview-smoke` で確認します。
4. **スキップされた本番デプロイを、手動で再実行しない。** 新しい、レビュー済みのプルリクエストをマージして、通常の Git 連携でデプロイします（`docs/netlify-production-sync.md`）。

## 使用量の見方

Netlify の「Usage & billing」→「Account usage insights → Credits」で、何に使ったかを確認できます。請求期間は毎月 15 日に切り替わります。

## 確認の目安

- 1 つのプルリクエストで、Deploy Preview のビルドは多くても 2〜3 回にする。
- 指摘対応が続くときは、1 コミットずつ push せず、まとめて push する。
