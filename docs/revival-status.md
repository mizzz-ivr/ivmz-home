# Revival status (ivmz.ivrm.jp)

復活ゲートの状態記録。正本は GitHub Issues (#170 Epic 配下)。

| Gate | 内容 | 状態 |
| --- | --- | --- |
| G0 | Repo の Unarchive | 完了 (2026-11-14) |
| G1 | Netlify 枠回復と配信再開 | 完了 (2026-11-17、サイト 200 復帰) |
| G2 | #165 Next/RSC Critical RCE の解消 | 完了 (PR #185、Next 16.4.6、本番 Published) |
| G3 | Payload DB の PG17 restore | 完了 (2026-11-17、DB `ivmz_home`、29 tables / 89 rows) |
| G4 | 監視の扱い (復旧して開発継続) | 完了 (ivrm-dashboard #226) |

## G3 の構成メモ

- 接続先: DB ホスト PostgreSQL 17 の DB `ivmz_home`、スキーマ `ivmz_home`
- ロール: 所有者 `ivmz_migrator` / 実行 `ivmz_runtime` (CRUD のみ、接続上限あり)
- 接続許可: 実行ロールのみ `hostssl` を送信元不問で許可 (旧 Supabase 構成と同等の露出)。
  管理ロールの許可範囲は広げていない
- Supabase 由来で有効だった RLS はポリシー 0 件のため全テーブルで無効化済み
  (アクセス制御はロールと接続許可で行う)
- バックアップ: DB ホストの日次バックアップ対象に `ivmz_home` を含む
- プレビュー用に分離 DB `ivmz_home_preview` (専用ロール `ivmz_preview_runtime`) を
  同じ dump から復元し、Deploy Preview / Branch Deploy の接続先とする
- ビルド時の DB ガード (scripts/assert-*-database.mjs) は、Supabase プロジェクト参照から
  ホスト＋DB 名のターゲット確認へ移行した (PR #189)
- 接続文字列の SSL は `sslmode=no-verify` を使う。サイトの pg ドライバでは
  `sslmode=require` が証明書検証になり、DB ホストの自前 CA では接続できないため

このファイルの追加は、G3 完了後に preview-smoke が緑になることの確認を兼ねている (#188)。
