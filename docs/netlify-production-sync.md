# Netlify Production Git synchronization recovery

Status: Issue #38 investigation — 2026-08-29

## Goal

Production release path remains:

```text
reviewed pull request
  -> GitHub main
  -> Netlify Git integration
  -> Production
```

Do not use a manual/API Production deploy merely to hide commit drift. `main` is the release Source of Truth and Netlify Production must converge to its exact commit through the approved Git workflow.

## Verified incident snapshot

Latest recheck:

- GitHub `main`: `f99ec389a098477b46d37136aa7339b52b30c17a`
- latest main CI: #345 / success
- Netlify current Production deploy: `6a91749fbb00070008ddaf51`
- Netlify current Production deploy branch metadata: `main`
- Netlify current Production commit: `7377189dcae4b67ea87f9e00058be42666db0619`
- Netlify current Production state: `ready`
- current Production deploy is not a manual deploy
- Production plugin state is success
- Production secret scan reports zero matches

The Production deploy is therefore healthy but stale relative to the current GitHub `main` after PR #34.

Repository-side suppression was checked:

- PR #34 title and merge commit do not contain `[skip netlify]` or `[skip ci]`
- `netlify.toml` does not define a Production ignore/skip rule
- intended Production branch remains `main`

## Diagnostic PR result

Draft PR #39 was created from the exact current `main` to determine whether GitHub/Netlify integration and builds are globally broken.

Final validated diagnostic head:

- commit: `53998ecfcae54f64c2e9d68b65693d9bc714a4f2`
- CI #348: success
- Netlify Deploy Preview: exact-head / `ready`
- Netlify plugin state: success
- Deploy Preview secret scan: zero matches
- Netlify Preview Smoke #315: success
- Payload public API preflight: success
- Chromium / mobile WebKit Playwright smoke: success
- Payload auth rate-limit 429 verification: success

Earlier diagnostic heads also produced healthy exact-head previews. This repeated result rules out:

- a global stopped-builds state
- a complete GitHub/Netlify integration disconnect
- a general inability for Netlify to build the current repository

The remaining failure domain is Production-path-specific.

## Root-cause decision tree

### 1. Confirm builds are active

The successful exact-head Deploy Previews from PR #39 prove builds are currently active for the project. Do not treat global stopped builds as the primary hypothesis unless a later PR also stops producing previews.

### 2. Confirm configured Production branch

In Netlify:

`Project configuration -> Build & deploy -> Continuous deployment -> Branches and deploy contexts`

Expected:

- Production branch: `main`

Do not infer this setting only from the old Production deploy metadata reporting `branch=main`. Verify the current project configuration.

Do not temporarily point Production at a feature branch to work around the incident.

### 3. Confirm auto publishing is not locked

On the Netlify Deploys page, verify the site is not locked and auto publishing is enabled.

A locked deploy may allow newer Production builds to exist without making them the live deploy. If a newer `main` deploy exists but is unpublished, investigate why the lock was enabled before unlocking it.

The currently live deploy reports `locked=null`; this does not by itself prove the current project-level auto-publish control is enabled.

### 4. Inspect the exact current-main commit

Search the Production deploy history for:

`f99ec389a098477b46d37136aa7339b52b30c17a`

Classify the result:

- no deploy exists -> investigate Production `main` push event delivery / Production branch trigger
- failed deploy -> inspect build logs and fix the actual failure
- skipped deploy -> inspect skip reason / build configuration
- ready but unpublished -> inspect auto-publish lock
- ready and published -> verify the current Production pointer again

Do not copy secrets, environment values, contact data, or authenticated state into the incident record.

### 5. Confirm Git integration target

Verify the connected repository is still:

`mizzz-ivr/ivmz-home`

PR #39 proves current PR events can reach Netlify, but the Production branch trigger / publish path still needs separate validation.

If configuration evidence shows the repository connection is inconsistent, restore the Git integration without weakening `Enforce Git-based deployments`.

## Connected-tool boundary

The currently connected Netlify surface can:

- read the project and current deploy
- read a known deploy by ID
- trigger a deployment

It does not expose:

- configured Production branch controls
- project-level auto-publish / deploy-lock controls
- complete Production deploy-history search by commit
- Git repository-binding configuration

Because the available deployment trigger would create a direct/manual deployment path, it must not be used for Issue #38. The remaining Production-path configuration checks require an authorized Netlify configuration surface that exposes these controls.

## Recovery acceptance

Issue #38 can be completed only when all of the following are true:

1. GitHub `main` HEAD is reconfirmed immediately before acceptance.
2. latest main CI is success.
3. Netlify current Production `commit_ref` equals that exact `main` HEAD.
4. configured Production branch is `main`.
5. Production state is `ready`.
6. Next.js Netlify plugin state is success.
7. secret scan has zero matches.
8. deployment came from the approved Git integration path.
9. public read-only smoke is healthy.
10. Payload published read remains healthy.
11. Production CSP remains Report-Only until Issue #29 explicitly advances enforcement.
12. the root cause and recovery action are recorded without exposing secrets.

## Guardrails

- do not disable `Enforce Git-based deployments`
- do not bypass GitHub `Protect main`
- do not direct-push to `main`
- do not use a manual/API/MCP Production deploy to conceal drift
- do not merge diagnostic PR #39 merely to generate a Production build
- do not rotate `PAYLOAD_SECRET` as part of this incident
- do not modify Production database data
- do not weaken Deploy Preview, CI, security, or secret-scanning checks
