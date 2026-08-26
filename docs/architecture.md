# Architecture

## Decision

Start as a **single Next.js application**. Site UI, Payload Admin/API, and contact endpoints stay in one deployable unit until a concrete scaling or security reason requires separation.

The application must be deployable on a standard Node.js-compatible Next.js host. Hosting-specific APIs are adapters at the boundary, not application primitives.

## Runtime layers

```text
Browser
  ├─ SSR/RSC DOM content (always usable)
  ├─ CSS depth / transforms (baseline enhancement)
  └─ lazy client islands
       ├─ GSAP + ScrollTrigger (scroll choreography)
       ├─ Motion (micro-interactions)
       └─ R3F / Drei (only if a focal scene truly benefits)

Next.js 16 App Router
  ├─ public pages / RSC
  ├─ Payload CMS integrated Admin + REST routes
  ├─ contact server endpoint
  └─ feed / sitemap / robots / structured data

Portable services
  ├─ PostgreSQL via DATABASE_URL
  ├─ object storage adapter (preferred: AWS S3)
  ├─ email adapter (preferred AWS path: SES)
  └─ anti-abuse/rate-limit adapter selected with hosting
```

## No Cloudflare runtime coupling

Cloudflare may remain the DNS provider temporarily, but the application does not depend on:

- Workers
- D1
- R2 native bindings
- Turnstile as an irreplaceable application primitive
- Cloudflare Email Sending

This avoids building a runtime that must be rewritten when DNS and infrastructure move toward AWS.

## Hosting boundary

Launch recommendation is Netlify because its current Next.js runtime is a closer fit for Next.js 16 feature usage than AWS Amplify's currently documented support through Next.js 15.

The codebase still uses normal `next build` / `next start` semantics and portable environment variables so a later AWS container deployment is feasible.

## CMS boundary

Payload CMS `3.88.0` is integrated directly into the same Next.js application.

Foundation collections:

- Users — Payload Auth and Admin identity
- Media — storage boundary only; production local writes are disabled until cloud storage is configured

Future collections remain separate feature work:

- Works
- Posts
- News
- Schedule
- SocialLinks
- Contacts
- SiteSettings

Products are Phase 2.

GraphQL is disabled for the foundation because no product requirement currently needs it. The Payload REST API and Admin UI are the supported CMS HTTP surfaces.

## Persistence

- Database: PostgreSQL behind `DATABASE_URL`; no provider-specific application SQL is required for Payload.
- Schema lifecycle: Repository-managed migrations under `src/migrations` are the source of truth.
- CI: migrations are applied to an ephemeral PostgreSQL 17 service before build.
- Preview/production: migrations are an explicit deployment gate. `next build` does not run destructive schema changes automatically.
- Media: local disk is allowed in development only. Production writes stay disabled until a Payload storage adapter is configured.
- Preferred production media adapter: AWS S3, introduced only when the media-storage PR needs it and managed through Terraform.

## Security boundary

- No secrets in the public repository.
- Payload Admin uses the Payload Users/Auth collection; no parallel custom auth is introduced.
- Passwords require at least 14 characters.
- Accounts lock for 15 minutes after 5 failed login attempts.
- API-key authentication is disabled for Admin users.
- Auth cookies are secure in production and CSRF/CORS origins are allow-listed.
- Users and Media are not anonymously writable; Media is not anonymously readable in the foundation.
- GraphQL is disabled and Payload query depth is bounded.
- Contact recipient is selected server-side from a category allowlist.
- Rate limiting and bot protection occur before mail dispatch; distributed IP rate limiting remains a hosting-boundary follow-up rather than in-memory serverless state.
- Security reports route only to `security@ivrm.jp`.
- Admin/API routes are excluded from public indexing.
- CSP is defined after the real script/media inventory exists.

## Performance budget

- LCP identity copy is SSR DOM.
- The canonical character image is an optimized image asset, not Canvas text or a 3D object requirement.
- WebGL is never required for navigation or content discovery.
- Prefer CSS transforms for depth scenes.
- External social feeds are server-cached and fail open to static links.
