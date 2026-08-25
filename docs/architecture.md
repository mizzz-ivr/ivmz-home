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
  ├─ Payload CMS integrated routes
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

Target: Payload 3.x integrated into the same Next.js app.

Collections:

- Users
- Media
- Works
- Posts
- News
- Schedule
- SocialLinks
- Contacts
- SiteSettings

Products are Phase 2.

## Persistence

- Database: PostgreSQL behind `DATABASE_URL`; no provider-specific SQL in product code unless justified.
- Media: Payload S3 storage adapter is preferred because it works from Node-based hosting and maps cleanly to a future AWS architecture.
- Local development may use local disk or a local S3-compatible service, but production does not rely on ephemeral filesystem writes.

## Security boundary

- No secrets in the public repository.
- Contact recipient is selected server-side from a category allowlist.
- Rate limiting and bot protection occur before mail dispatch.
- Security reports route only to `security@ivrm.jp`.
- Admin/API routes are excluded from public indexing.
- CSP is defined after the real script/media inventory exists.

## Performance budget

- LCP identity copy is SSR DOM.
- The canonical character image is an optimized image asset, not Canvas text or a 3D object requirement.
- WebGL is never required for navigation or content discovery.
- Prefer CSS transforms for depth scenes.
- External social feeds are server-cached and fail open to static links.
