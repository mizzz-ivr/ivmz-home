# Payload CMS + PostgreSQL foundation

Status: Draft PR implementation — 2026-08-26

## Scope

This foundation adds Payload CMS to the existing single Next.js application without creating a separate CMS service.

Implemented:

- Payload CMS `3.88.0`
- `@payloadcms/db-postgres` `3.88.0`
- `/admin` App Router integration
- Payload REST routes under `/api`
- Users/Auth collection
- Media collection
- generated `src/payload-types.ts`
- generated Admin import map
- repository-managed initial PostgreSQL migration
- CI PostgreSQL migration gate
- Deploy Preview E2E checks for Admin protection and anonymous Users API denial

Not implemented in this PR:

- Works / Posts / News / Schedule / Social Links collections
- production S3 storage
- AWS resources or Terraform
- SMTP/email adapter
- distributed IP rate limiting
- production DNS cutover

## Environment variables

| Variable | Required runtime | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `PAYLOAD_SECRET` | yes | Payload signing/encryption secret |
| `PAYLOAD_ALLOWED_ORIGINS` | yes | comma-separated trusted CSRF/CORS origins |
| `PAYLOAD_PUBLIC_SERVER_URL` | recommended | explicit Payload server origin when the hosting environment needs one |

S3 variables remain reserved in `.env.example` for the next media-storage phase and are not consumed by the foundation.

## Local database lifecycle

Use a dedicated local PostgreSQL database and set `DATABASE_URL`.

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Schema push is disabled. Schema changes should be represented by a migration rather than silently pushed from the application at startup.

To create a reviewed migration after changing Payload schema:

```bash
pnpm db:migrate:create descriptive_name
pnpm generate:types
pnpm generate:importmap
```

Commit the migration, generated types, and import-map change together.

## Preview / production migration policy

Do not add `pnpm db:migrate` to `pnpm build`.

For a target environment:

1. confirm the target `DATABASE_URL`
2. back up the database when the environment contains durable data
3. inspect the migration diff in the PR
4. run `pnpm db:migrate` as an explicit release step
5. deploy the same reviewed revision
6. verify `/admin` and authorization behavior

## Admin/Auth baseline

Payload standard authentication is the only Admin auth system.

- first-user bootstrap stays on Payload's standard `/admin/create-first-user` flow
- normal Admin access requires an authenticated Payload user
- minimum password length: 14
- 5 failed login attempts trigger a 15-minute lock
- Admin API keys are disabled
- token responses are suppressed where Payload supports cookie-based Admin auth
- production cookies are marked secure
- CSRF/CORS accepts only configured origins

Payload's normal authenticated collection access remains the baseline instead of duplicating access logic for every Users operation.

## Media boundary

Development:

- authenticated users may create/update/delete Media
- local files are stored under `media/`, which is gitignored

Production:

- local storage is disabled
- create/update/delete Media is denied until durable object storage is configured

The next media-storage PR may add the Payload S3 adapter. If AWS S3 is selected, the bucket, public-access block, encryption, lifecycle, CORS, and least-privilege IAM configuration must be represented in Terraform before production writes are enabled.

## CI gate

GitHub Actions uses PostgreSQL 17 and validates:

- frozen pnpm install
- Prettier
- ESLint
- TypeScript
- unit tests
- repository migration application
- generated Payload artifact drift
- Next.js build

The existing Netlify remote Playwright job remains the deployment gate and now also validates `/admin` plus anonymous `/api/users` access.

## External environment status

Netlify project `ivumz-home` has a production Payload secret and allowed-origin configuration, but a dedicated `DATABASE_URL` is still required before the real Payload Admin runtime can pass Deploy Preview.

No DNS record is changed by this phase.
