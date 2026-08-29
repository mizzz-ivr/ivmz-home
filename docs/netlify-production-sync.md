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

At the 2026-08-29 recheck:

- GitHub `main`: `f99ec389a098477b46d37136aa7339b52b30c17a`
- latest main CI: #345 / success
- Netlify Production branch: `main`
- Netlify current Production deploy: `6a91749fbb00070008ddaf51`
- Netlify current Production commit: `7377189dcae4b67ea87f9e00058be42666db0619`
- Netlify current Production state: `ready`
- current Production deploy is not a manual deploy
- Production plugin state is success
- Production secret scan reports zero matches

The Production deploy is therefore healthy but stale relative to the current GitHub `main` after PR #34.

Repository-side suppression was also checked:

- PR #34 title and merge commit do not contain `[skip netlify]` or `[skip ci]`
- `netlify.toml` does not define a Production ignore/skip rule
- Production branch remains intended to be `main`

## Root-cause decision tree

### 1. Confirm builds are active

In Netlify:

`Project configuration -> Build & deploy -> Continuous deployment -> Build settings`

Expected:

- Build status: `Active builds`

If builds are stopped, activate builds before doing anything else. Activating builds alone does not create a new deploy; the next approved Git event must trigger the build.

### 2. Confirm Production branch

In:

`Project configuration -> Build & deploy -> Continuous deployment -> Branches and deploy contexts`

Expected:

- Production branch: `main`

Do not temporarily point Production at a feature branch to work around the incident.

### 3. Confirm auto publishing is not locked

On the Netlify Deploys page, verify the site is not locked and auto publishing is enabled.

A locked deploy may allow newer Production builds to exist without making them the live deploy. If a newer `main` deploy exists but is unpublished, investigate why the lock was enabled before unlocking it.

### 4. Inspect the exact current-main commit

Search the Production deploy history for:

`f99ec389a098477b46d37136aa7339b52b30c17a`

Classify the result:

- no deploy exists -> investigate GitHub App / repository integration event delivery
- failed deploy -> inspect build logs and fix the actual failure
- skipped deploy -> inspect skip reason / build configuration
- ready but unpublished -> inspect auto-publish lock
- ready and published -> verify the current Production pointer again

Do not copy secrets, environment values, contact data, or authenticated state into the incident record.

### 5. Confirm Git integration

Verify the connected repository is still:

`mizzz-ivr/ivmz-home`

If the repository connection is broken, restore the Git integration without weakening `Enforce Git-based deployments`.

## Diagnostic PR behavior

This runbook change is intentionally a docs-only Draft PR created from the exact stale-gap `main` head.

Its Deploy Preview is a non-Production diagnostic signal:

- Deploy Preview created successfully -> Netlify can still receive/build current PR Git events; investigate Production branch / auto-publish behavior specifically
- no Deploy Preview and no Netlify check -> investigate stopped builds or broken Git integration globally
- Deploy Preview fails -> inspect the failure without weakening required checks

The PR must not be merged only to force a Production deploy. Merge remains subject to the normal review and explicit owner approval policy.

## Recovery acceptance

Issue #38 can be completed only when all of the following are true:

1. GitHub `main` HEAD is reconfirmed immediately before acceptance.
2. latest main CI is success.
3. Netlify current Production `commit_ref` equals that exact `main` HEAD.
4. Production state is `ready`.
5. Next.js Netlify plugin state is success.
6. secret scan has zero matches.
7. public read-only smoke is healthy.
8. Payload published read remains healthy.
9. Production CSP remains Report-Only until Issue #29 explicitly advances enforcement.
10. the root cause and recovery action are recorded without exposing secrets.

## Guardrails

- do not disable `Enforce Git-based deployments`
- do not bypass GitHub `Protect main`
- do not direct-push to `main`
- do not use a manual/API Production deploy to conceal drift
- do not rotate `PAYLOAD_SECRET` as part of this incident
- do not modify Production database data
- do not weaken Deploy Preview, CI, security, or secret-scanning checks
