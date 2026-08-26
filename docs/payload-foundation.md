# Payload CMS + PostgreSQL Foundation

状態: Draft PR実装中 — 2026-08-26

## Scope

このFoundationでは、独立したCMS serviceを作らず、既存の単一Next.js applicationへPayload CMSを統合する。

実装済み:

- Payload CMS `3.88.0`
- `@payloadcms/db-postgres` `3.88.0`
- `/admin` のApp Router統合
- `/api` 配下のPayload REST route
- Users/Auth collection
- Media collection
- PostgreSQL専用schema `ivmz_home`
- 生成済み `src/payload-types.ts`
- 生成済みAdmin import map
- Repository管理の初期PostgreSQL migration
- CI上のPostgreSQL migration gate
- Admin保護と匿名Users API拒否を確認するDeploy Preview E2E

このPRでは未実装:

- Works / Posts / News / Schedule / Social Links collection
- Production S3 storage
- AWS resource / Terraform
- SMTP/email adapter
- 分散IP rate limiting
- Production DNS切替

## 環境変数

| Variable | Runtimeで必要 | 用途 |
| --- | --- | --- |
| `DATABASE_URL` | 必須 | PostgreSQL connection string |
| `PAYLOAD_SECRET` | 必須 | Payloadの署名・暗号化secret |
| `PAYLOAD_ALLOWED_ORIGINS` | 必須 | CSRF/CORSで信頼するoriginのカンマ区切り一覧 |
| `PAYLOAD_PUBLIC_SERVER_URL` | 推奨 | hosting環境で明示的なPayload server originが必要な場合に使用 |

S3関連variableは次のmedia-storage phase向けに `.env.example` へ予約しているが、Foundationでは使用しない。

## PostgreSQL schema境界

Payload管理tableはPostgreSQL標準の専用schema `ivmz_home` に固定する。

- Payload Postgres adapterの `schemaName: 'ivmz_home'` を使用する
- `public` schemaへPayload tableを作成しない
- Local / CI / Preview / Productionで同じlogical schema名を使用する
- PostgreSQL provider自体は `DATABASE_URL` の背後で交換可能に保つ

共有database clusterをPreviewで使用する場合も、このschema境界によって他applicationのtableと混在させない。

## Local database lifecycle

専用のlocal PostgreSQL databaseを用意し、`DATABASE_URL` を設定する。

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Schema pushは無効化している。Schema変更はapplication startup時に暗黙でpushせず、migrationとしてRepository管理する。

Payload schema変更後にreview対象のmigrationを作成する場合:

```bash
pnpm db:migrate:create descriptive_name
pnpm generate:types
pnpm generate:importmap
```

Migration、generated types、import mapの変更は同じfeature変更としてcommitする。

## Preview / Production migration方針

`pnpm db:migrate` を `pnpm build` へ追加しない。

対象環境への反映手順:

1. 対象の `DATABASE_URL` を確認する
2. Durable dataが存在する環境ではdatabase backupを取得する
3. PR上でmigration diffをreviewする
4. 明示的なrelease stepとして `pnpm db:migrate` を実行する
5. Review済みの同一revisionをdeployする
6. `/admin` とauthorization behaviorを確認する

## Admin/Auth baseline

Admin認証はPayload標準Authのみを使用する。

- 初回user作成はPayload標準の `/admin/create-first-user` flowを維持する
- 通常のAdmin accessには認証済みPayload userが必要
- Password最小長: 14文字
- Login失敗5回で15分間lock
- Admin API keyは無効
- Password validation fieldはvirtualで、平文password列をdatabaseへ作らない
- Payloadがcookie-based Admin authをサポートする範囲でtoken responseを抑制
- Production cookieはSecure
- CSRF/CORSは設定済みoriginのみ許可

Usersの各operationへ重複した独自access logicを追加せず、Payloadの標準的なauthenticated collection accessをbaselineとする。

## Media境界

Development:

- 認証済みuserはMediaをcreate/update/deleteできる
- local fileはgitignore済みの `media/` へ保存する

Production:

- local storageを無効化する
- durable object storageを設定するまではMediaのcreate/update/deleteを拒否する

次のmedia-storage PRでPayload S3 adapterを追加できる。AWS S3を採用する場合、production writeを有効化する前にbucket、public access block、encryption、lifecycle、CORS、least-privilege IAM設定をTerraformで管理する。

## CI gate

GitHub ActionsではPostgreSQL 17を使用し、以下を検証する。

- frozen pnpm install
- Prettier
- ESLint
- TypeScript
- unit test
- Repository migrationの適用
- generated Payload artifactのdrift
- Next.js build

既存Netlify remote Playwright jobをdeployment gateとして維持し、`/admin` と匿名 `/api/users` accessの検証を追加している。

## Deploy Previewの現在状態

2026-08-26、Preview用runtime role `ivmz_home_app` のPassword設定とNetlify `DATABASE_URL` の更新を確認した。

対応済み:

- Netlify Deploy Preview scopeへ `PAYLOAD_SECRET` をsecretとして設定
- Netlify Deploy Preview scopeへ `PAYLOAD_ALLOWED_ORIGINS` を設定
- Netlify Deploy Preview scopeへ `DATABASE_URL` をsecretとして設定
- Preview用PostgreSQLに専用schema `ivmz_home` を作成
- Preview用runtime role `ivmz_home_app` を作成（superuser / CREATEDB / CREATEROLEなし）
- `ivmz_home_app` は `LOGIN = true` かつPassword設定済み
- Repositoryと同じ初期Payload migrationを `ivmz_home` schemaへ適用
- `payload_migrations` にRepository migrationと一致するmigration stateを記録
- Repository rename後のruntime role名に合わせ、Netlify `DATABASE_URL` のusername更新を確認
- Runtime接続診断を受け、URL-safeな新PasswordへrotationしNetlify secretへ再反映済み
- Supabase Connect画面のSession pooler接続先を基準に、Netlify `DATABASE_URL` のhost / port側を再反映済み
- `pg-connection-string` のlibpq互換TLS解釈へ合わせ、接続URLのTLS互換オプションを再反映済み

この更新commitでDeploy Previewを再生成し、`/admin` の正常起動、匿名 `/api/users` の401/403応答、Chromium / mobile WebKitのremote smokeを再確認する。

HTTP 500を正常扱いにするためのテスト緩和は行わない。実Deploy PreviewのPayload runtimeが正常になるまでPRはDraftのまま維持する。

このPhaseではDNS recordを変更しない。
