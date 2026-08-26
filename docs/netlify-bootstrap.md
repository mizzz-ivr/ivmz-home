# Netlify bootstrap

Status: Repository connected; Deploy Preview validation in progress — 2026-08-26

## Repository security baseline

Netlify deployment must not run from a revision older than:

- main merge commit: `0e61e7bbf887a8a132359f9ac0727ff3486d7b21`
- Next.js: `16.3.3`
- eslint-config-next: `16.3.3`
- package manager: `pnpm@10.17.0`
- Node.js: 24 series (`engines.node >=24.15.0`)
- committed `pnpm-lock.yaml`
- CI install: `pnpm install --frozen-lockfile`

This baseline remediates Critical advisory `GHSA-2xp9-vwfh-vxw4` and includes the reduced-motion layout fix carried by PR #2.

## Netlify project

- Team: `mizzz-dev`
- Project: `ivumz-home`
- Site ID: `a6b04c39-d2c7-4996-8ba1-277ccb3532e3`
- Initial hostname: `https://ivumz-home.netlify.app`
- Canonical production target: `https://mizzz.ivrm.jp`
- Existing project `ivuru-web`: unchanged; do not modify, rename, or reuse

## Git binding

Repository binding was completed in the Netlify UI on 2026-08-26.

Verified from the first Git-backed deployment:

- repository commit: `0e61e7bbf887a8a132359f9ac0727ff3486d7b21`
- production branch: `main`
- framework: `next`
- runtime: `nodejs24.x`
- Netlify Next.js integration: `@netlify/plugin-nextjs@5.15.13`
- plugin state: `success`
- deployment state: `ready`

Netlify automatically published the connected `main` revision in `production` context as part of repository linking. This was not a manually-triggered production release. The deployment used the already-remediated security baseline, so there is no vulnerable Next.js 16.3.2 deployment to unwind.

No custom production domain or DNS record has been attached yet.

## Configuration policy

No `netlify.toml` or hosting-specific workaround is added for the foundation bootstrap unless a real deployment failure proves it necessary.

The application remains portable:

- PostgreSQL is behind `DATABASE_URL`
- media stays behind the Payload storage adapter boundary
- email, bot protection, and rate limiting remain replaceable adapters
- Cloudflare remains DNS-only for now
- no Workers, D1, native R2 binding, or DNS-provider page logic

## Deploy Preview acceptance gate

A Deploy Preview is acceptable only when all of the following pass:

- dependency install uses the committed lockfile successfully
- `next build` succeeds
- App Router renders normally
- SSR/RSC primary DOM content is available without WebGL
- `next/image` renders the canonical character asset
- metadata is present
- `/robots.txt` responds correctly
- `/sitemap.xml` responds correctly
- static assets load
- responsive baseline is usable on mobile widths
- `prefers-reduced-motion: reduce` produces non-overlapping content
- server-side routes used by the foundation are compatible
- no secret is exposed in client assets or deploy logs

The `feat/netlify-bootstrap` branch and PR #3 are used to validate Deploy Preview behavior after Git binding. PR #3 stays Draft until this gate passes.

`mizzz.ivrm.jp` DNS changes happen only after the Netlify deployment baseline is healthy; DNS changes never precede the working Netlify project.

## Baseline production deploy created by Git binding

- Deploy ID: `6a8e3742ae362707d06a753a`
- Context: `production`
- Branch: `main`
- Commit: `0e61e7bbf887a8a132359f9ac0727ff3486d7b21`
- State: `ready`
- Published: `2026-08-26T00:46:32.716Z`
- HTTPS URL: `https://ivumz-home.netlify.app`
- Function: Next.js Server Handler
- Runtime: Node.js 24
- Edge Functions: none

This netlify.app deployment is an infrastructure baseline only. `https://mizzz.ivrm.jp` is not changed or pointed at Netlify until the Preview smoke gate is complete.
