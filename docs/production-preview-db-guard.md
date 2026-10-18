# Netlify Production / Preview のDB接続先ガード（Issue #133）

## リリース時のルール
- Productionのビルド前に`scripts/assert-production-database.mjs`を実行。Netlify `CONTEXT=production`とSupabaseの**本番プロジェクトref** `drazbrcqnjxjuygfxmlz`に対するホストまたはプール接続のユーザー名が完全一致することを確認し、Previewのref `dzdgbkjmomvmexcbjyin`との一致を拒否する。
- Preview/branch-deployは従来どおり`scripts/assert-preview-database.mjs`で検証用refを要求し、Production refを拒否してからマイグレーション。
- **DBに接続せず、秘密情報は表示しない検査**。誤接続の場合、現在のProductionデプロイは維持され、新しいデプロイのみ失敗となる。
- Production環境の`DATABASE_URL`を変更・表示しない。URLのスキーム、接続ホスト、Supabase pooler usernameにより接続対象を検証する。

## 限界・確認方法
- このガードが通過すれば、デプロイ時のProduction/Previewの**接続先プロジェクトが異なること**を確認できる。ただしロール権限・RLS・バックアップの復旧を証明するものではない。
- CI Unitは直接/プール接続、不正ホスト、別プロジェクト、CONTEXT偽装、ref同一化、秘匿ログを検査。
- Netlify Preview Smoke成功後に本番へマージ。Netlify Productionが新SHAでready、ガード成功ログを確認するまでは接続先隔離の項目を完了扱いにしない。
- PR #128〜#137の匿名投稿機能はすべてDraft。本番での投稿フラグ有効化・匿名データの作成は行わない。
