# Netlify bootstrap

Status: Blocked on Git provider binding — 2026-08-26

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
- Initial hostname: `ivumz-home.netlify.app`
- Canonical production target: `https://mizzz.ivrm.jp`
- Existing project `ivuru-web`: do not modify, rename, or reuse

## Git binding

The Netlify integration available to this development workflow can create/read/deploy projects, but it does not expose Git-provider repository binding or GitHub App repository-permission management.

Before the first deploy, Netlify must explicitly show:

- repository: `mizzz-ivr/ivumz-home`
- production branch: `main`
- framework: Next.js automatic detection
- Node.js: 24 series
- package manager: pnpm from `packageManager`

Do not substitute another repository if access is missing. Fix the Netlify GitHub App repository access instead.

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

Only after Preview passes should production deploy be enabled. `mizzz.ivrm.jp` DNS changes happen after production deploy is healthy; DNS changes never precede the working Netlify project.

## Current blocker

Repository binding must be completed in the Netlify UI because the available API surface does not expose that operation. No deployment has been triggered yet, so there is no blank or incorrect production deployment to unwind.
