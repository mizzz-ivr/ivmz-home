# Netlify Production Git synchronization recovery

Status: Issue #38 recovery validation — rechecked 2026-09-17

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

Latest recheck on 2026-09-17:

- GitHub `main`: `c40568ed33b7f2715dea0239903e0bc5a5b0a76d`
- latest main CI: #353 / success
- Netlify current Production deploy: `6a91749fbb00070008ddaf51`
- Netlify current Production deploy branch metadata: `main`
- Netlify current Production commit: `7377189dcae4b67ea87f9e00058be42666db0619`
- Netlify current Production state: `ready`
- current Production deploy is not a manual deploy
- Production plugin state is success
- Production secret scan reports zero matches
- Netlify Build status is `Active`
- configured Production branch is `main`
- auto publishing is enabled and the site is not deploy-locked
- connected repository is `github.com/mizzz-ivr/ivmz-home`
- Production deploy for `c40568ed33b7f2715dea0239903e0bc5a5b0a76d` exists but was `Skipped`
- Netlify reported the skip reason as `Skipped due to account credit usage exceeded`
- Free plan credits were restored for the new cycle on 2026-09-15
- observed credit balance on 2026-09-17: 298.3 / 300 credits remaining, expiring 2026-10-15

The incident root cause is therefore confirmed as Netlify account credit exhaustion at the time of the `c40568ed...` Production event. Git integration remained connected and Preview deploys were healthy; the skipped Production deploy was not replayed automatically after credits were restored.

Repository-side suppression was checked:

- PR #34 title and merge commit do not contain `[skip netlify]` or `[skip ci]`
- `netlify.toml` does not define a Production ignore/skip rule
- intended Production branch remains `main`

## Recovery action after credit restoration

With build capacity restored, perform one legitimate reviewed PR flow from the current `main` and use the resulting merge commit as the Production-path validation event.

Expected sequence:

```text
reviewed PR
  -> required checks pass
  -> owner-authorized merge
  -> new main commit
  -> Netlify Git-triggered Production deploy
  -> exact main commit becomes current Production
```

Do not use `Trigger deploy`, API deploy, MCP deploy, or another manual Production path to replay the skipped commit. The recovery must prove that the normal Git integration path works again.

## Diagnostic PR result

Draft PR #39 was created from the exact current `main` at the time to determine whether GitHub/Netlify integration and builds were globally broken.

Last fully validated diagnostic head:

- commit: `81f06cb0d1f06344f59c91eb22798cb8205f47d0`
- CI #349: success
- Netlify Deploy Preview: exact-head / `ready`
- Netlify plugin state: success
- Deploy Preview secret scan: zero matches / 216 files
- Netlify Preview Smoke #316: success
- Payload public API preflight: success
- Chromium / mobile WebKit Playwright smoke: success
- Payload auth rate-limit 429 verification: success

Earlier diagnostic heads also produced healthy exact-head previews. This repeated result ruled out:

- a complete GitHub/Netlify integration disconnect
- a general inability for Netlify to build the repository
- a repository-wide stopped-builds condition during those checks

### 2026-09-01 credit-cycle probe

The documentation-only probe after the earlier expected credit-cycle recovery confirmed that Deploy Preview capacity was available, but the later `c40568ed...` Production event was explicitly skipped because account credit usage was exceeded.

Do not add repeated docs-only probe commits merely to keep testing capacity. The 2026-09-17 update is an incident root-cause and recovery record; its reviewed merge is the next legitimate Git event used to validate the Production path after the confirmed credit reset.

## Root-cause confirmation

### 1. Builds are active

Verified in Netlify on 2026-09-17:

- Build status: `Active`

Healthy exact-head Deploy Previews also demonstrate that the project can build from Git events.

### 2. Production branch is correct

Verified in Netlify on 2026-09-17:

- Production branch: `main`
- Branch deploys: deploy only the production branch

Do not temporarily point Production at a feature branch to work around the incident.

### 3. Auto publishing is enabled

Verified on the Netlify Deploys page on 2026-09-17:

- auto publishing is on
- deploys from `main` are published automatically
- the UI offers `Lock to stop auto publishing`, indicating the site is currently unlocked

### 4. Exact current-main Production event was skipped

Production deploy history contains:

`c40568ed33b7f2715dea0239903e0bc5a5b0a76d`

Classification:

- state: `Skipped`
- reason: `Skipped due to account credit usage exceeded`

This explains why current Production remains `7377189dcae4b67ea87f9e00058be42666db0619` even though GitHub `main` advanced to `c40568ed...`.

### 5. Git integration target is correct

Verified in Netlify on 2026-09-17:

`github.com/mizzz-ivr/ivmz-home`

The repository binding therefore does not explain the Production drift.

### 6. Account capacity is restored

Verified in Netlify billing on 2026-09-17:

- plan: Free plan
- allowance: 300 credits/month
- effective from: 2026-09-15
- remaining: 298.3 / 300 credits
- expiry: 2026-10-15

A new legitimate `main` Git event is now required to validate automatic Production deployment after the reset.

Do not copy secrets, environment values, contact data, or authenticated state into the incident record.

## Connected-tool boundary

The connected Netlify surface can:

- read the project and current deploy
- read a known deploy by ID
- trigger a deployment

It does not expose every private project setting or the complete deploy-history UI. The 2026-09-17 Build status, Production branch, auto-publishing state, repository binding, skipped-deploy reason, and credit balance were therefore verified from the authenticated Netlify UI.

Because the available deployment trigger would create a direct/manual deployment path, it must not be used for Issue #38.

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
12. the confirmed credit-exhaustion root cause and Git-only recovery action are recorded without exposing secrets.

After #38 acceptance, validate Issue #40 cutover before removing `PROFILE_SIGNAL_GITHUB_TOKEN`:

- old `profile-signal-full-dispatch` and `profile-signal-stream-dispatch` functions are absent from the new Production deploy
- their Netlify schedules are absent
- GitHub scheduler/fallback remains healthy
- Profile Signal freshness remains within the accepted threshold

Only then remove the obsolete Production token and close #40.

## Guardrails

- do not disable `Enforce Git-based deployments`
- do not bypass GitHub `Protect main`
- do not direct-push to `main`
- do not use `Trigger deploy` or a manual/API/MCP Production deploy to conceal drift
- do not merge a PR merely to generate a Production build without reviewing its actual change
- do not delete `PROFILE_SIGNAL_GITHUB_TOKEN` until #40 Production cutover acceptance passes
- do not rotate `PAYLOAD_SECRET` as part of this incident
- do not modify Production database data
- do not weaken Deploy Preview, CI, security, or secret-scanning checks
