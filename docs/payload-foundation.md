# Payload CMS + PostgreSQL Foundation

状態: Foundation実装・Deploy Preview検証済み — 2026-08-26

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

UsersのCRUDはPayload標準のauthenticated default accessをbaselineとする。Payload 3.88.0で認可拒否が環境によってHTTP 500へ包まれるケースに対しては、Users collectionの`afterError`で、匿名リクエストかつPayloadのUnauthorizedシグナルと判定できる場合だけHTTP 401へ正規化する。DB/TLS/その他のserver errorは500のまま維持し、E2Eでも500を正常扱いしない。

## Media境界

Development:

- 認証済みuserはMediaをcreate/update/deleteできる
- local fileはgitignore済みの `media/` へ保存する

Production:

- local storageを無効化する
- durable object storageを設定するまではMediaのcreate/update/deleteを拒否する

次のmedia-storage PRでPayload S3 adapterを追加できる。AWS S3を採用する場合、production writeを有効化する前にbucket、public access block、encryption、lifecycle、CORS、least-privilege IAM設定をTerraformで管理する。

## CI / Deploy Preview gate

GitHub ActionsではPostgreSQL 17を使用し、以下を検証する。

- frozen pnpm install
- Prettier
- ESLint
- TypeScript
- unit test
- Repository migrationの適用
- generated Payload artifactのdrift
- Next.js build

Netlify remote Playwrightでは以下を検証する。

- canonical / robots / sitemapが `https://ivmz.ivrm.jp` を指すこと
- `/admin` がPayload loginまたはfirst-user画面へ正常遷移すること
- 匿名 `/api/users?limit=1` が401/403で拒否されること
- Chromium / mobile WebKitの両方で成立すること

Remote Deploy Previewでは一時的なTLS/connection resetが発生し得るため、remote実行時のみPlaywright retryを最大2回許可する。HTTP statusやauthorization assertionは緩和しない。

## Deploy Preview PostgreSQL

2026-08-26、Preview用runtime role `ivmz_home_app` とNetlifyの接続設定を実環境で検証した。

対応済み:

- Netlify Deploy Preview scopeへ `PAYLOAD_SECRET` をsecretとして設定
- Netlify Deploy Preview scopeへ `PAYLOAD_ALLOWED_ORIGINS` を設定
- Netlify Deploy Preview scopeへ `DATABASE_URL` をsecretとして設定
- Preview用PostgreSQLに専用schema `ivmz_home` を作成
- Preview用runtime role `ivmz_home_app` を作成（superuser / CREATEDB / CREATEROLEなし）
- `ivmz_home_app` は `LOGIN = true` かつSCRAM-SHA-256 Password設定済み
- Repositoryと同じ初期Payload migrationを `ivmz_home` schemaへ適用
- `payload_migrations` にRepository migrationと一致するmigration stateを記録
- application table ownerを `ivmz_home_app` に統一
- Runtime credentialをURL-safeなPasswordへrotation
- Supabase Connect画面のSession pooler host / port `5432` を使用
- `pg@8.20.0` / `pg-connection-string@2.14.0` のTLS解釈に合わせ、libpq互換TLSオプションを接続設定へ反映
- 安全診断でPayload initializationと実DB queryの成功を確認後、診断route / workflowをRepositoryから削除

Secret値や完全な`DATABASE_URL`はRepository・PR・ドキュメントへ保存しない。

## 検証結果

接続・認可修正後の実Deploy Previewで以下を確認済み。

- CI #81: GREEN
- Netlify Deploy Preview: Ready / secret scan 0件
- Netlify Preview Smoke #64: GREEN
- `/admin`: 正常起動
- 匿名 `/api/users`: 401/403
- Chromium / mobile WebKit: GREEN

このドキュメント更新後のHEADでも同じCI / Deploy Preview smokeを再実行し、merge readinessの最終gateとする。

## Identity

Runtime identityは以下へ統一する。

- Repository: `mizzz-ivr/ivmz-home`
- Canonical: `https://ivmz.ivrm.jp`
- General contact: `ivmz@ivrm.jp`
- Developer / OSS: `mizzz@ivrm.jp`
- Team: `contact@ivrm.jp`
- Security: `security@ivrm.jp`

旧Identityは`docs/identity-contact.md`の移行履歴として必要な箇所だけ保持する。

このPhaseではProduction DNS recordを変更しない。
