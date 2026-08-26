# ADR 0003 — Payload CMS / PostgreSQL Foundation

- 状態: Accepted
- 日付: 2026-08-26

## 背景

Portfolio Platformでは、現行applicationをweb、CMS、adminの別serviceへ分割せずに、編集可能なcontentとAdmin UIを提供する必要がある。Launch hostはNetlifyを第一候補とする一方、database providerとmedia providerは交換可能な構成を維持する。

また、buildのたびに破壊的になり得るdatabase migrationを実行する設計を避ける必要がある。

## 決定

1. Payload CMS `3.88.0` を既存Next.js App Router applicationへ直接統合する。
2. `@payloadcms/db-postgres` を使用し、connectionは `DATABASE_URL` のみから取得する。
3. Migrationは `src/migrations` でRepository管理し、application codeと同じPRでreviewする。
4. PostgreSQL schema pushを無効化し、prototype以外の環境では明示的なmigrationを使用する。
5. 独自authenticationを作らず、Payload Users collectionをAdmin/Authのauthorityとする。
6. FoundationではUsersとMediaのみを導入する。Content collectionは別featureとして実装する。
7. 具体的な要件ができるまでGraphQLを無効化する。
8. Mediaのlocal disk storageはproduction以外のみ許可する。Durable object storageが存在するまでproduction upload writeを閉じる。
9. このFoundationではAWS resourceを作成しない。Media-storage PRでS3とTerraformを同時に導入する。
10. ApplicationをNetlify database API、Cloudflare runtime API、特定PostgreSQL vendorへ密結合しない。

## Security baseline

- Admin accessには認証済みPayload userが必要。
- Password最小長: 14文字。
- Login最大失敗回数: 5回。
- Lock時間: 15分。
- Admin API key: 無効。
- ProductionではSecure cookieを使用。
- CSRF/CORS originを明示的なallow-listで制限。
- GraphQLを無効化し、REST query depthに上限を設定。
- UsersとMediaは認証済みsurfaceとして扱う。

## Migration lifecycle

CIではephemeral PostgreSQL 17 serviceを作成し、Repository migrationを適用し、Payload types/import mapを再生成してdriftを確認した後にNext.jsをbuildする。

Preview / Production migrationは明示的なrelease gateとする。`pnpm build` やNetlify通常buildのretry pathには組み込まない。

## 影響

利点:

- 単一のdeploy可能なNext.js applicationを維持できる
- Payload configurationとschemaをRepositoryでversion管理できる
- Product codeを変更せずにPostgreSQL providerを変更できる
- Deployment retryがproduction schemaを自動変更しない
- S3/Terraform作業を実際に必要になるまで延期できる

Trade-off:

- 実Deploy Previewで `/admin` を検証する前に対象PostgreSQL databaseが必要
- Durable storage追加まではproduction Media writeを意図的に利用不可とする
- 分散IP rate limitingにはhosting境界での追加判断が必要
