# Netlify bootstrap

Status: Repository connected; Deploy Preview gate GREEN — 2026-08-26

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

The Deploy Preview gate is GREEN.

Validated against the real PR #3 Netlify preview URL with Playwright from GitHub Actions:

- Deploy Preview alias: `https://deploy-preview-3--ivumz-home.netlify.app`
- initial validated Deploy ID: `6a8e37d64834840009c2e2ef`
- framework: `next`
- runtime: `nodejs24.x`
- Netlify Next.js integration: `@netlify/plugin-nextjs@5.15.13`
- plugin state: `success`
- Next.js Server Handler deployed successfully
- Edge Functions: none
- remote Playwright result: `6 passed`
- desktop browser: Chromium
- mobile baseline: iPhone 13 / WebKit

The remote smoke verifies:

- root response and primary SSR/RSC DOM content
- identity heading and primary navigation
- canonical metadata (`https://mizzz.ivrm.jp`)
- canonical character image loads through `next/image`
- `/robots.txt`
- `/sitemap.xml`
- responsive mobile rendering baseline
- `prefers-reduced-motion: reduce` switches About/Writing layered content to static non-overlapping layout

The Playwright configuration keeps local development portable: `E2E_BASE_URL` enables remote deployment smoke, while normal local runs continue to use `pnpm dev` on localhost. Netlify-specific preview URL construction is isolated to `.github/workflows/netlify-preview-smoke.yml` and is not used by application page logic.

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

This netlify.app deployment is an infrastructure baseline only. `https://mizzz.ivrm.jp` remains unchanged until the merged Netlify bootstrap revision is confirmed healthy in production.
