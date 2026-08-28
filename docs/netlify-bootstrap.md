# Netlify bootstrap / Production operations

Status: Repository connected / Production live / Deploy Preview gate GREEN — updated 2026-08-28

## Source of Truth

- Repository: `mizzz-ivr/ivmz-home`
- Production branch: `main`
- Netlify project: `ivmz-home`
- Netlify Site ID: `a6b04c39-d2c7-4996-8ba1-277ccb3532e3`
- Canonical Production: `https://ivmz.ivrm.jp`
- Netlify branch alias: `https://main--ivmz-home.netlify.app`

Production releaseはRepositoryのreview済み`main`をSource of Truthとする。固定SHAを恒久的なminimum deploy revisionとして運用せず、deploy時にGitHub `main` HEADとNetlify Production `commit_ref`の一致を確認する。

## Runtime baseline

- Next.js: `16.3.3`
- eslint-config-next: `16.3.3`
- package manager: `pnpm@10.17.0`
- Node.js: 24 series (`engines.node >=24.15.0`)
- Netlify Next.js integration: `@netlify/plugin-nextjs@5.15.13`
- committed `pnpm-lock.yaml`
- CI install: `pnpm install --frozen-lockfile`

Next.js 16.3.3 baselineはCritical advisory `GHSA-2xp9-vwfh-vxw4` remediationを含む。

## Git integration

Repository bindingはNetlify UIで完了済み。

Productionの期待経路:

```text
GitHub pull request
  -> CI / Deploy Preview / review
  -> merge to main
  -> Netlify Git integration
  -> Production
```

2026-08-28のPR #24 mergeでは、GitHub `main` merge commit `cf329210e0712af3dfb816e69e03fa94113914c1` がmerge直後にNetlify Productionへ自動deployされ、Netlify `commit_ref`も同一SHA、state `ready`、secret scan 0 matchesを確認した。

この確認によりGitHub `main` -> Netlify Productionのcontinuous deployment自体は動作している。

Netlify deploy metadataの`deploy_source`値だけをGit integration有無の判定材料にしない。Git由来deployかどうかは、merge/push時刻、branch、commit URL、commit title、committer、exact `commit_ref`の一致を合わせて確認する。

## Production deployment enforcement

Continuous Deploymentが動作することと、API / CLI / MCPからProductionを直接publishできないことは別のcontrolである。

2026-08-28、Netlify **Enforce Git-based deployments** を有効化済み。Production publishはGitHub `main`由来へ限定する。

### Netlify UI

1. Project `ivmz-home` を開く。
2. `Project configuration` を開く。
3. `Build & deploy` -> `Continuous deployment` を開く。
4. Repositoryが `mizzz-ivr/ivmz-home` へ接続されていることを確認する。
5. Production branchが `main` であることを確認する。
6. `Enforce deployment methods` -> `Configure` を開く。
7. Git-based deployment enforcementが有効であることを確認する。

acceptance:

- `main` pushはProduction deploy可能
- Deploy Preview / Branch Deployは引き続き利用可能
- CLI / API / MCPからProductionへの直接publishは拒否される
- Deploy PreviewをUIから直接Production publishできない
- Productionに出す変更はPRを`main`へmergeする

設定変更前に現在のknown-good Production deploy IDをrollback referenceとして記録する。Enforce設定自体は解除可能だが、Production failureのrollbackはNetlifyのknown-good deploy restoreを使用する。

## GitHub main guardrail

2026-08-28、Repository ruleset `Protect main` をactive化済み。

現在のbaseline:

- default branch `main` を対象
- Require a pull request before merging
- required status check: `quality`
- required status check: `netlify/ivmz-home/deploy-preview`
- Require conversation resolution
- Strict required status checks policy
- Block force pushes
- Block branch deletion
- bypass actorなし

Repository設定変更後も、通常開発は `Issue -> branch -> implementation -> CI -> Draft PR -> Deploy Preview -> review -> merge` を維持する。

## Environment separation

Netlify environment variablesはcontextを分離する。

### DATABASE_URL

- Production -> Supabase `ivrm-core`
- Deploy Preview -> Supabase `ivmz-home-preview`
- Branch Deploy -> `ivmz-home-preview`
- Local / Dev -> Productionとは別の開発接続先

Production dataをPreviewへcloneしない。

### PAYLOAD_SECRET

2026-08-28に次の分離を実施済み。

- Production -> 現行Production専用secret
- Deploy Preview -> Productionと異なるsecret
- Branch Deploy -> Production / Deploy Preview双方と異なるsecret
- Preview Server -> Production / Deploy Preview / Branch Deployと異なる専用secret
- Local / CI -> Production secretを使わない

secret値はRepository / Issue / PR / Notion / CI logへ記載しない。

現行Production secretはNetlify上でwrite-only/maskedとなっており、旧実値を後から取得できない。このため、現行Production secretを本Issue完了条件として無理にrotationしない。将来rotationするときは、新secretを先に承認済みsecret managerで生成・保存・recoverability確認してからNetlifyへ反映し、その後のrotation世代からrollback可能な運用へ移行する。

## Preview database migration gate

Deploy Preview / Branch DeployはProduction DBへmigrationを実行しない。

`netlify.toml`のPreview/Branch buildだけが、target guard通過後にRepository migrationを`ivmz-home-preview`へ適用する。

Safety guard:

- contextが`deploy-preview` / `branch-deploy`以外なら拒否
- `DATABASE_URL`未設定なら拒否
- Preview Project refと一致しなければ拒否
- Production Project refは明示的に拒否
- migration commandのみsession poolingを使用
- connection stringをlogへ出さない

Production migrationはNetlify buildへ暗黙に組み込まない。

## Deploy Preview acceptance gate

PRのfinal headでは次を通す。

- GitHub CI
  - format check
  - lint
  - typecheck
  - unit tests
  - ephemeral PostgreSQL migration
  - Payload generated artifact drift
  - Next production build
- Netlify Deploy Preview success
- Payload public API preflight
- Chromium Playwright
- mobile WebKit Playwright
- Payload security boundary tests
- non-existent probe identityによるlogin rate-limit 429 verification

Remote GETの既知transient transport errorはPR #24のshared helperで最大1回だけretryする。HTTP 4xx/5xx、assertion failure、mutation requestはretryしない。

## Production post-deploy acceptance

Production deploy後は最低限次を確認する。

1. Netlify Production `commit_ref` == GitHub `main` HEAD
2. state `ready`
3. plugin state success
4. secret scan 0 matches
5. `/` と主要public routeが正常
6. `/admin` login surfaceが正常
7. Production CORS/CSRF trustへlocalhostを含めない
8. security headersがpublic/adminへ付与される
9. CSPは明示承認までReport-Only
10. anonymous Users / drafts / versions / mutationsが拒否される
11. Production `DATABASE_URL`がPreview projectを指していない

実admin identityを使ったrate-limit stress testは行わない。

## Rollback

Production変更前にcurrent known-good deploy ID / commitを記録する。

Application regression時はNetlifyからknown-good deployをrestoreする。

古いdeployをrestoreした場合、Production `commit_ref`は一時的にGitHub `main` HEADと不一致になり得る。このrestoreは緊急時の一時例外として扱い、直ちに`main`側へrevertまたはforward-fix PRを作成してreview/CIを通し、GitとProductionを再収束させる。再収束するまで無関係な変更をProductionへ流さない。

DB migrationが原因でない変更をrollbackするためにProduction DBへ逆DDL/DMLを流さない。

HSTSをsourceから削除してもclient cacheは即時解除されない。緊急解除が必要な場合はHTTPS responseで `Strict-Transport-Security: max-age=0` を返す専用対応が必要。

## Portability policy

- PostgreSQLは`DATABASE_URL`の背後に置く
- Payload mediaはstorage adapter境界へ置く
- email / bot protection / rate limitingはreplaceable adapterとして扱う
- CloudflareはDNS境界に留める
- hosting provider固有logicをpage/content codeへ入れない
- Production Git enforcementはdeployment controlでありapplication architectureへ混在させない
