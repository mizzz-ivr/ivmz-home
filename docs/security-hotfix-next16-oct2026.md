# Security hotfix release gate — 2026-10-30

Source: PR #166 / Issue #165. This note is a release checklist, **not** an assertion of production remediation.

## Baseline / blast radius

- Canonical: `ivmz.ivrm.jp`, Netlify project `ivmz-home`; release source is the GitHub `main` branch.
- Before this patch, the currently published deployment traces to commit `95b94d87` and lockfile resolves Next.js 16.3.3, React 19.2.8, Sharp 0.35.3 (October 2026 critical advisories affect these ranges).
- Patched source: Next 16.4.3, React/React DOM 19.2.9 and Sharp 0.35.5. No application database migration, auth policy, CORS or API contract modification is intended.
- Production DB and Preview DB **must remain separate**. Build-time target guards must not be disabled to make a preview/prod build pass.
- Node Functions `24.x` patch level must be verified independently, not inferred from `engines`.

## Preview acceptance (one credit-conscious build)

- [ ] Confirm the **Preview** database is ACTIVE_HEALTHY; do not trigger builds while paused.
- [ ] Remove `[skip netlify]` from PR title and commit a single final reviewed change to generate an exact-head Deploy Preview.
- [ ] Confirm Netlify status `netlify/ivmz-home/deploy-preview` and `preview-smoke` succeed on the same head; do not bypass failed checks.
- [ ] Confirm the build logs show **Preview DB guard verified**, not production DB; no secrets/connection strings are printed.
- [ ] Verify public GET, Payload public API, login page, unauthenticated admin/collection access denied, auth rate limiting (test identities only), contact form preview no external mail, image optimization, CSP/security headers.

## Production change / acceptance

- [ ] Review required GitHub CI, code review, permissions and no unresolved review before release.
- [ ] Record the current known-good Netlify Deployment ID (secure internal evidence). This is a *break-glass* rollback point; restoring it would reintroduce vulnerable Next/Sharp and must be time-limited.
- [ ] Verify Production and Preview DB refs/roles privately through authorized Netlify UI (never paste URLs/secrets into Issues or CI logs). Confirm backups and migrations are compatible.
- [ ] Squash-merge the approved PR without a `[skip netlify]` marker; allow only the normal GitHub `main` → Netlify Git integration path, not a direct/manual publish.
- [ ] Confirm production deploy `ready`, exact `commit_ref == main HEAD`, Production DB guard passed, no new security scan finding, Next/React/Sharp versions and Node patch level from build/runtime evidence.
- [ ] Verify `/`, `/admin` login screen, read-only public APIs, contact page, image processing, cache headers, auth denial. **Do not** submit real forms, stress production auth or mutate live DB.
- [ ] Inspect runtime logs for availability and security failures. If unhealthy, stop additional releases; prefer a patched forward fix. Only use the old deploy rollback with explicit risk acceptance and a short recovery plan.

## Security closure

A green PR or a READY deployment alone is insufficient. Keep #165 open until the patched deployment's exact commit and native/runtime versions, user-facing health, and DB isolation are verified. Never claim exploit success from a version mismatch alone.
