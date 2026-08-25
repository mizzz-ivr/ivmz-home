# ADR 0001 — Portable hosting boundary

Status: Accepted — 2026-08-25

## Context

The site is likely to move authoritative DNS from Cloudflare toward AWS. Building the application on Cloudflare Workers/D1/R2 now would create migration work that does not improve the product.

AWS Amplify currently documents managed Next.js support through version 15, while the project targets Next.js 16. Netlify currently documents the Next.js capabilities required by the product.

## Decision

- Do not use Cloudflare Workers, D1 or native R2 bindings.
- Keep Cloudflare as DNS only while it remains authoritative.
- Make Netlify the leading launch host candidate.
- Keep standard Node/Next portability for a later AWS move.
- Prefer PostgreSQL + AWS S3-compatible persistence boundaries.
- Re-evaluate AWS Amplify once Next.js 16 support is explicitly documented.

## Consequences

Positive:
- DNS migration does not require application rewrites.
- Payload remains on a conventional Node/Next runtime.
- S3 media maps cleanly to future AWS infrastructure.

Trade-off:
- Full AWS migration later still requires deployment/IaC work.
- Netlify + external DB is multi-provider during the launch phase.
