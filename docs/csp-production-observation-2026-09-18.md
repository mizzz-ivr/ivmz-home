# Production CSP Report-Only Observation — 2026-09-18

## Scope

Issue #29 Phase B の Production public / Payload Admin login-surface observation 記録。

Production に collector / debug endpoint / enforcing CSP を追加せず、既存 `tests/e2e/csp-observation.spec.ts` を GitHub Actions から `https://ivmz.ivrm.jp` に対して read-only で実行した。

- PR: #43
- observed Production commit: `01fc137f5f44d200fadd43a6a2c95e22a2c1bab9`
- CSP Production Observation run: `#1` / `35285257069`
- Chromium + mobile WebKit: success
- authenticated Admin tests: intentionally skipped because `CSP_ADMIN_STORAGE_STATE` is not stored in CI
- Production writes: none
- credentials / cookies / query strings / source samples persisted: none

## Header validation

The observation run verified that the tested Production surfaces:

- expose `Content-Security-Policy-Report-Only`
- do not expose an enforcing `Content-Security-Policy`
- keep `/api/works?limit=1&depth=0` readable with HTTP 200

Any accidental enforcing CSP or missing Report-Only header would have failed the observer.

## Sanitized inventory

Chromium and mobile WebKit produced the same effective inventory.

| Surface | Observed violation | Classification |
| --- | --- | --- |
| `/` | `script-src-elem` / `inline` | Next.js / React framework requirement candidate |
| `/` | `style-src-attr` / `inline` | application / rendering requirement candidate |
| `/about` | `script-src-elem` / `inline` | Next.js / React framework requirement candidate |
| `/works` | `script-src-elem` / `inline` | Next.js / React framework requirement candidate |
| `/blog` | `script-src-elem` / `inline` | Next.js / React framework requirement candidate |
| `/news` | `script-src-elem` / `inline` | Next.js / React framework requirement candidate |
| `/schedule` | `script-src-elem` / `inline` | Next.js / React framework requirement candidate |
| `/links` | `script-src-elem` / `inline` | Next.js / React framework requirement candidate |
| `/contact` | `script-src-elem` / `inline` | Next.js / React framework requirement candidate |
| `/admin` login surface | `script-src-elem` / `inline` | shared Next.js / React requirement candidate |
| `/admin` login surface | `style-src-elem` / `inline` | Payload Admin-specific requirement candidate |

## Negative evidence

This Production observation did **not** produce evidence requiring any of the following:

- `unsafe-eval`
- external `script-src` origin
- external `style-src` origin
- external `img-src` origin
- external `font-src` origin
- external `connect-src` origin
- external `worker-src` origin
- Netlify Deploy Preview `frame-src https://app.netlify.com`

The old Deploy Preview-only Netlify frame violation therefore remains environment-specific evidence and must not be promoted to the Production allowlist.

## Interpretation

The Production evidence strengthens the existing design direction but is not enough to enable enforcement:

1. Public pages share an inline framework script requirement.
2. The top page additionally shows an inline style-attribute requirement.
3. Payload Admin login surface adds an inline style-element requirement.
4. No broad external origin allowlist is justified by the observed Production traffic.
5. `unsafe-inline`, `unsafe-eval`, wildcard schemes, and broad host wildcards remain prohibited shortcuts.

Public / Admin policy separation remains a candidate because the Admin surface has an additional style requirement, but it must not be finalized until authenticated Admin routes are observed.

## Post-deploy observation workflow

`.github/workflows/csp-production-observation.yml` supports two purposes:

- `pull_request`: regression-check the observation harness itself against the currently deployed Production site.
- `workflow_dispatch`: explicitly re-run the read-only observation **after** a Git-based Production deployment is confirmed current.

A CSP policy PR must not treat its pre-merge Production observation as validation of the proposed policy. After merge and normal Netlify Git deployment, confirm Production is exact current `main`, then run `CSP Production Observation` via `workflow_dispatch`.

`playwright.config.ts` is included in the PR trigger because it controls browser projects, remote retries, workers, and base URL behavior used by the observer.

## Remaining Issue #29 gates

- [x] Chromium Deploy Preview inventory
- [x] mobile WebKit Deploy Preview inventory
- [x] Production public/login-surface inventory
- [ ] authenticated Admin inventory (`/admin`, `/admin/collections/works`, `/admin/collections/posts`)
- [x] Production evidence excludes Deploy Preview-only Netlify frame source
- [x] Production observation shows no external origin / eval requirement
- [ ] authenticated Adminを含むrequired origin / inline requirementに証拠がある
- [ ] exact Next.js 16.3.3 + current Netlify pipeline SRI / hash strategy spike

Production CSP enforcement remains disabled until the remaining gates are completed and an explicit enforcement decision is made.
