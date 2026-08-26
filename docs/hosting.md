# Hosting decision — 2026-08-25

## Goal

Choose a launch host without coupling the application to the current DNS provider. `mizzz.ivrm.jp` should be able to move from Cloudflare DNS to Amazon Route 53 later without a product rewrite.

## Best launch option: Netlify

Why it currently fits:

- Netlify documents support for Next.js App Router, SSR, ISR, React Server Components, Server Actions, response streaming, `next/after`, middleware and image optimization.
- Payload states it can deploy anywhere Next.js can run, including Netlify and AWS.
- It keeps initial platform operations small while the product is content/design heavy.
- DNS remains independent; changing authoritative DNS later changes records and validation, not application code.

Recommended launch shape:

```text
Route/DNS (temporary Cloudflare -> future Route 53)
  -> Netlify Next.js runtime
      -> PostgreSQL (provider-neutral DATABASE_URL)
      -> AWS S3 media
      -> Email adapter
```

## Payload + PostgreSQL deployment gate

Payload `3.88.0` uses `@payloadcms/db-postgres` with `DATABASE_URL`.

Required runtime variables for the foundation:

- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `PAYLOAD_ALLOWED_ORIGINS`
- `PAYLOAD_PUBLIC_SERVER_URL` when an explicit canonical Payload origin is needed

Repository migrations under `src/migrations` are authoritative. The deployment sequence is intentionally split:

1. install with `pnpm install --frozen-lockfile`
2. apply migrations with `pnpm db:migrate` to the target database as an explicit gate
3. deploy the already-reviewed application revision
4. validate `/admin`, Payload REST API authorization, and existing public smoke tests

`pnpm build` does **not** automatically execute production migrations. This prevents every Netlify build or retry from becoming an implicit schema mutation.

For CI, GitHub Actions provides an ephemeral PostgreSQL 17 service and applies the same repository migrations before the Next.js build.

## Media storage gate

The Foundation PR does not provision AWS resources.

- local development may write Payload Media to `media/`
- production local storage is disabled
- production Media create/update/delete remains denied until a durable storage adapter is configured
- AWS S3 remains the preferred first production adapter
- when S3 is introduced, the persistent AWS resources and IAM policy must be managed by Terraform

No `netlify.toml`, Netlify database API, Cloudflare R2 binding, or AWS resource is added merely to make this foundation compile.

## AWS option

### Do not choose Amplify for the current Next.js 16 foundation yet

AWS currently documents managed Amplify Hosting support for Next.js through version 15. That is a version mismatch with this project's Next.js 16 direction.

Re-evaluate Amplify when AWS explicitly documents Next.js 16 support and the project features used by Payload pass a real preview deploy.

### AWS-first full runtime

A long-term AWS-native shape can be:

```text
Route 53
  -> CloudFront / ALB
      -> ECS Fargate (Next.js + Payload container)
          -> RDS/Aurora PostgreSQL
          -> S3
          -> SES
```

This is more operationally involved than Netlify and is not necessary for the first public release unless AWS learning/operations itself becomes a product goal.

### App Runner

Do not adopt as a new default. AWS states App Runner stopped accepting new customers on 2026-03-31. Existing eligible accounts are a special case, not the baseline architecture.

## Portability rules

1. Use standard Next.js / Node APIs where practical.
2. Keep DB behind `DATABASE_URL`.
3. Keep object storage behind Payload's storage adapter.
4. Keep email behind an application adapter.
5. Keep anti-abuse/rate limiting replaceable.
6. No DNS-provider-specific logic in page or content code.
7. Deployment-specific config lives in dedicated files and ADRs.

## References checked on 2026-08-25/26

- AWS Amplify — Next.js support: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- Netlify — Next.js overview: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- Payload — Production deployment: https://payloadcms.com/docs/production/deployment
- Payload — PostgreSQL: https://payloadcms.com/docs/database/postgres
- Payload — Storage adapters / AWS S3: https://payloadcms.com/docs/upload/storage-adapters
- AWS App Runner — CreateService availability notice: https://docs.aws.amazon.com/apprunner/latest/api/API_CreateService.html
