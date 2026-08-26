# ADR 0003 — Payload CMS and PostgreSQL foundation

- Status: Accepted
- Date: 2026-08-26

## Context

The portfolio platform needs editable content and an Admin UI without splitting the current application into separate web, CMS, and admin services. The launch host is Netlify, while database and media providers must remain replaceable.

The deployment must also avoid running potentially destructive database migrations on every build.

## Decision

1. Integrate Payload CMS `3.88.0` directly into the existing Next.js App Router application.
2. Use `@payloadcms/db-postgres` and obtain the connection exclusively from `DATABASE_URL`.
3. Keep migrations in `src/migrations` and review them with application code.
4. Disable Postgres schema push and use explicit migrations in every non-prototype environment.
5. Keep the Payload Users collection as the Admin/Auth authority instead of building custom authentication.
6. Start with Users and Media only. Content collections are separate feature work.
7. Disable GraphQL until a concrete requirement exists.
8. Permit local Media disk storage only outside production. Production upload writes remain closed until durable object storage exists.
9. Do not provision AWS resources in this foundation. Introduce S3 and Terraform together in the media-storage PR.
10. Do not couple the application to Netlify database APIs, Cloudflare runtime APIs, or a specific PostgreSQL vendor.

## Security baseline

- Admin access requires an authenticated Payload user.
- Password minimum length: 14.
- Maximum failed login attempts: 5.
- Lock duration: 15 minutes.
- Admin API keys: disabled.
- Secure cookies in production.
- Explicit CSRF/CORS origin allow-list.
- GraphQL disabled and REST query depth bounded.
- Users and Media remain authenticated surfaces.

## Migration lifecycle

CI creates an ephemeral PostgreSQL 17 service, applies repository migrations, regenerates Payload types/import map to detect drift, and then builds Next.js.

Preview and production migrations are an explicit release gate. They are not embedded in `pnpm build` or Netlify's normal build retry path.

## Consequences

Positive:

- one deployable Next.js application remains intact
- Payload configuration and schema are versioned with the repository
- PostgreSQL provider can change without product code changes
- deployment retries do not automatically mutate production schema
- S3/Terraform work is deferred until it is actually required

Trade-offs:

- a target PostgreSQL database must exist before `/admin` can be validated in a real Deploy Preview
- production Media writes remain intentionally unavailable until durable storage is added
- distributed IP rate limiting still needs a hosting-boundary decision
