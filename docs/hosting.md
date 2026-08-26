# Hosting方針 — 2026-08-26

## 目的

現在のDNS providerへapplicationを密結合せずにLaunch hostを決定する。`ivmz.ivrm.jp` のauthoritative DNSを将来CloudflareからAmazon Route 53へ移行しても、product codeを書き直さずに済む構成を維持する。

Personal Web PlatformのRepositoryは `mizzz-ivr/ivmz-home`。Identity / contact方針は `docs/identity-contact.md` を正とする。

## Launch時のベスト案: Netlify

現時点で適している理由:

- NetlifyはNext.js App Router、SSR、ISR、React Server Components、Server Actions、response streaming、`next/after`、middleware、image optimizationを公式にサポートしている。
- PayloadはNext.jsが動作する環境へdeploy可能であり、NetlifyとAWSも対象に含まれる。
- Content/design中心の初期Phaseではplatform運用負荷を小さく保てる。
- DNSを独立させられるため、将来authoritative DNSを変更してもrecordとvalidationの変更に留まり、application codeへ波及しない。

推奨するLaunch構成:

```text
Route/DNS（当面Cloudflare -> 将来Route 53）
  -> Netlify Next.js runtime
      -> PostgreSQL（provider-neutralなDATABASE_URL）
      -> AWS S3 media
      -> Email adapter
```

Canonical production host:

```text
https://ivmz.ivrm.jp
```

`mizzz.jp` はlegacy / old-link compatibilityとしてWeb trafficを `ivmz.ivrm.jp` へredirectする。

## Payload + PostgreSQL deployment gate

Payload `3.88.0` は `@payloadcms/db-postgres` と `DATABASE_URL` を使用する。Payload管理tableはPostgreSQL schema `ivmz_home` に分離する。

Foundationで必要なruntime variable:

- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `PAYLOAD_ALLOWED_ORIGINS`
- hosting環境で明示的なPayload originが必要な場合は `PAYLOAD_PUBLIC_SERVER_URL`

`src/migrations` 配下のRepository migrationを正本とする。Deployment sequenceは意図的に分離する。

1. `pnpm install --frozen-lockfile` でinstallする
2. 対象databaseへ明示的なgateとして `pnpm db:migrate` を適用する
3. Review済みの同一revisionをdeployする
4. `/admin`、Payload REST API authorization、既存public smoke testを検証する

`pnpm build` からproduction migrationを**自動実行しない**。Netlify buildやretryのたびに暗黙のschema変更が発生する設計を避けるためである。

CIではGitHub Actions上にephemeral PostgreSQL 17 serviceを起動し、Next.js build前に同一のRepository migrationを適用する。

## Preview database境界

FoundationのDeploy Previewでは、既存PostgreSQL clusterを利用する場合もapplication専用の `ivmz_home` schemaとruntime role `ivmz_home_app` で分離する。

- Payload側は `schemaName: 'ivmz_home'` を使用する
- `public` schemaへPayload tableを作成しない
- Preview用runtime roleへsuperuser / CREATEDB / CREATEROLEを付与しない
- Repository migrationとPayload migration stateを一致させる
- Previewで使用する接続先はProduction providerの恒久決定とはみなさない
- `DATABASE_URL` はNetlify secretとして管理し、RepositoryやNotionへcredentialを記録しない

## Media storage gate

Foundation PRではAWS resourceを作成しない。

- local developmentではPayload Mediaを `media/` へ保存できる
- productionではlocal storageを無効化する
- durable storage adapterを設定するまではproductionのMedia create/update/deleteを許可しない
- Production用adapterの第一候補はAWS S3とする
- S3導入時は恒常的なAWS resourceとIAM policyをTerraformで管理する

Foundationをcompileさせるだけの目的で `netlify.toml`、Netlify database API、Cloudflare R2 binding、AWS resourceを追加しない。

## AWS案

### 現在のNext.js 16 FoundationではAmplifyを採用しない

AWSが現時点で公式に記載しているmanaged Amplify HostingのNext.js対応範囲はversion 15までであり、本projectのNext.js 16方針とversion差がある。

AWSがNext.js 16対応を明示し、Payloadで利用する機能が実Deploy Previewを通過した時点で再評価する。

### AWS-firstのfull runtime

長期的なAWS native構成の候補:

```text
Route 53
  -> CloudFront / ALB
      -> ECS Fargate（Next.js + Payload container）
          -> RDS/Aurora PostgreSQL
          -> S3
          -> SES
```

これはNetlifyより運用負荷が大きい。AWS運用・学習そのものがproduct goalにならない限り、最初のpublic releaseには不要と判断する。

### App Runner

新規defaultとして採用しない。AWSはApp Runnerが2026-03-31以降、新規customerの受付を停止したと案内している。既存の対象accountは例外であり、baseline architectureにはしない。

## Email boundary

Emailはapplication adapterの背後に置く。

現在のIdentity-level mail role:

- General / Personal → `ivmz@ivrm.jp`
- Person-facing → `ivuru@ivrm.jp`
- Developer / OSS → `mizzz@ivrm.jp`
- ivRooom / Team → `contact@ivrm.jp`
- Security → `security@ivrm.jp`

Cloudflare Email Service / Email Sending SMTPはoutbound mail候補として評価中。Product codeをCloudflare固有primitiveへ直接密結合せず、provider固有処理はadapter / deployment境界へ閉じ込める。

## Portability rules

1. 実用上可能な範囲で標準Next.js / Node APIを使用する。
2. Databaseは `DATABASE_URL` の背後に置く。
3. Object storageはPayload storage adapterの背後に置く。
4. Emailはapplication adapterの背後に置く。
5. Anti-abuse / rate limitingは置き換え可能にする。
6. Page/content codeへDNS-provider固有logicを入れない。
7. Deployment固有設定は専用fileとADRへ分離する。

## 2026-08-25/26に確認した参考資料

- AWS Amplify — Next.js support: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- Netlify — Next.js overview: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- Payload — Production deployment: https://payloadcms.com/docs/production/deployment
- Payload — PostgreSQL: https://payloadcms.com/docs/database/postgres
- Payload — Storage adapters / AWS S3: https://payloadcms.com/docs/upload/storage-adapters
- AWS App Runner — CreateService availability notice: https://docs.aws.amazon.com/apprunner/latest/api/API_CreateService.html
