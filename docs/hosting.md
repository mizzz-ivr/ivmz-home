# Hosting方針 — updated 2026-09-03

## 目的

現在のDNS providerへapplicationを密結合せず、Production / Preview / Localのsecurity boundaryを明示した上でLaunch hostを運用する。

`ivmz.ivrm.jp` のauthoritative DNSを将来CloudflareからAmazon Route 53へ移行しても、product codeを書き直さずに済む構成を維持する。

Personal Web PlatformのRepositoryは `mizzz-ivr/ivmz-home`。Identity / contact方針は `docs/identity-contact.md` を正とする。

## Current launch architecture

Launch hostはNetlifyを継続採用する。

```text
Cloudflare DNS
  -> Netlify Next.js runtime
      -> Payload CMS
          -> Production: Supabase ivrm-core / schema ivmz_home
          -> Preview: Supabase ivmz-home-preview / schema ivmz_home
      -> durable media adapter（導入gateあり）
      -> email adapter
```

Canonical Production:

```text
https://ivmz.ivrm.jp
```

`mizzz.jp` はlegacy / old-link compatibilityとしてWeb trafficを `ivmz.ivrm.jp` へredirectする。

## Why Netlify remains the launch host

- Next.js App Router / SSR / RSC / Streaming / Server Actionsを既存構成のまま運用できる。
- PayloadをNext.js runtimeへ統合した現在のarchitectureを維持できる。
- GitHub PR -> Deploy Preview -> merge -> Productionのreview workflowを構築済み。
- DNSをapplicationから独立させられる。
- 小規模個人Platformとして、ECS等へ移すより運用負荷を抑えられる。

Provider portabilityは維持し、Netlify固有機能はdeployment/security adapter境界へ閉じ込める。

## Production deployment path

Production publishの正規経路は次の通り。

```text
Issue
  -> branch
  -> implementation
  -> CI
  -> Draft PR
  -> Netlify Deploy Preview
  -> Preview Smoke / review
  -> merge to GitHub main
  -> Netlify Git integration
  -> Production
```

ProductionはGitHub `main`をSource of Truthとする。

Netlifyの **Enforce Git-based deployments** を有効化し、CLI / API / MCP / Deploy PreviewからProductionへの直接publishを禁止する。設定方法とacceptanceは `docs/netlify-bootstrap.md` を参照する。

## Profile Signal scheduling boundary

Profile Signalの定期実行は `mizzz-ivr/mizzz-ivr` のGitHub Actions `profile-signal-scheduler-fallback.yml` をownerとする。GitHub側schedulerは5分間隔でstateのfreshnessを判定し、必要なときだけstreamまたはfull refreshを実行する。

`ivmz-home` のNetlify Scheduled Functionsによる `profile-signal-stream-dispatch` / `profile-signal-full-dispatch` はIssue #40でsourceから廃止する。Netlifyは引き続きWeb hosting / Deploy Preview / Production deploymentを担当し、Profile Signal schedulingの実行基盤にはしない。

Production cutoverではIssue #38のGit synchronization recoveryをgateとする。GitHubでsource削除をmergeしただけでは、staleなcurrent Production deploy上の旧Scheduled Functionsが停止したとは扱わない。

Cutover sequence:

1. Issue #38を解消し、通常のGit-based Production deployがcurrent `main`のexact commitをpublishできる状態に戻す。
2. Issue #40の削除を含むcommitがcurrent Production deployであることを確認する。
3. current Production deployから2つのProfile Signal Scheduled Functionsが消えていることを確認する。
4. `PROFILE_SIGNAL_GITHUB_TOKEN` の残存consumerがないことを再確認する。
5. その後にのみNetlify Productionのobsolete secretを削除する。

Production cutover完了前はrollback可能性と旧deploy互換性のため、Netlify上の実 `PROFILE_SIGNAL_GITHUB_TOKEN` を保持する。manual / API / MCP Production deployでIssue #38を迂回しない。

## Payload + PostgreSQL deployment gate

Payload `3.88.0` は `@payloadcms/db-postgres` と `DATABASE_URL` を使用する。Payload管理tableはPostgreSQL schema `ivmz_home` に分離する。

必要なruntime variable:

- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `PAYLOAD_ALLOWED_ORIGINS`
- 必要な環境だけ `PAYLOAD_PUBLIC_SERVER_URL`

`src/migrations` 配下のRepository migrationをschema migrationのSource of Truthとする。

Production sequence:

1. Repository migrationをreviewする。
2. 対象Production DBを明示して必要なmigrationだけを適用する。
3. review済み同一revisionを`main`へmergeする。
4. Netlify Git integrationでProduction deployする。
5. exact commit / `/admin` / Payload REST authorization / public smokeを確認する。

`pnpm build`からProduction migrationを自動実行しない。build retryやhosting retryをDB schema change triggerにしない。

CIではGitHub Actions上にephemeral PostgreSQL 17 serviceを起動し、Next.js build前にRepository migrationを適用する。

## Environment database matrix

| Context | Project / DB | Schema | Data | Migration |
| --- | --- | --- | --- | --- |
| Production | Supabase `ivrm-core` | `ivmz_home` | Production | 明示Production gate |
| Netlify Deploy Preview | Supabase `ivmz-home-preview` | `ivmz_home` | Production dataなし | guarded Netlify build |
| Netlify Branch Deploy | Supabase `ivmz-home-preview` | `ivmz_home` | Production dataなし | guarded Netlify build |
| GitHub CI | ephemeral PostgreSQL 17 | `ivmz_home` | test only | CI build前 |
| Local / Dev | local/dev PostgreSQL | `ivmz_home` | local only | developer controlled |

Production dataをPreviewへcopyしない。

## Preview database isolation

Issue #18 / PR #21でdedicated Supabase Preview project `ivmz-home-preview` を導入済み。

### Guardrails

- Preview / Branchだけmigrationを許可する。
- target guardがPreview Project refと一致しない場合はfail closed。
- Production Project refは明示的に拒否する。
- migration時だけsession poolingを使う。
- runtime側のpool modeとmigration connectionを分離する。
- connection stringやcredentialをlogしない。
- Preview DBへProduction fixture / Production user / Production contentをcopyしない。

Preview projectはapplication lifecycleの検証環境であり、Productionのbackupやreplicaとして扱わない。

## PAYLOAD_SECRET environment boundary

2026-08-28にNetlify contextを分離した。

| Context | Secret policy |
| --- | --- |
| Production | Production専用。現行値は準備なしにrotationしない |
| Deploy Preview | Productionと異なるPreview専用secret |
| Branch Deploy | Production / Preview双方と異なるBranch専用secret |
| Local / CI | Production secretを使用しない |

Production secret rotationはrollback用旧secretをNetlify外のapproved secret managerからrecoverできることを確認してから実行する。

詳細は `docs/payload-security-operations.md` を参照する。

## Supabase / Payload access boundary

`ivmz_home` はSupabase client API用schemaではなく、Payload server-side PostgreSQL schemaとして扱う。

Production read-only verification baseline:

- schema owner: `ivmz_home_app`
- `anon` / `authenticated` / `service_role`: schema USAGEなし
- 同client roles: Payload-managed tablesへのSELECT / mutationなし
- `ivmz_home_app`: required read/writeあり、non-superuser、`BYPASSRLS=false`

Preview:

- schema owner: `postgres`
- `anon` / `authenticated` / `service_role`: schema USAGEなし、Payload tables read/writeなし

Payload-managed 25 tablesは現時点でRLS disabled。

Supabase advisorのRLS disabled warningだけを理由に一括RLSを導入しない。client role grantsを与えないこととPayload Access Controlをauthorization boundaryとして維持する。

Data API exposed schema / schema grants / application roleを変更する場合はRLS posture reviewを再実施する。

## Security headers / CSP

全route baseline:

- HSTS
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- X-Frame-Options
- CSP Report-Only
- Next.js powered-by removal

CSPはreal violation observationなしにenforceしない。Payload Admin / Next.js inline assetsを含め、必要sourceを確認した後に独立PRでenforce readinessを判断する。

## Media storage gate

- local developmentではPayload Mediaをlocal storageへ保存できる。
- Productionではdurable storage adapter導入前にMedia mutationを安易に解放しない。
- Production durable storageの第一候補はAWS S3。
- S3導入時はIAMを最小権限にし、恒常resourceはTerraform等で再現可能にする。
- PreviewとProductionのobject storage credentialを共有しない。

## AWS future option

長期的なAWS native候補:

```text
Route 53
  -> CloudFront / ALB
      -> ECS Fargate（Next.js + Payload）
          -> RDS/Aurora PostgreSQL
          -> S3
          -> SES
```

現時点ではNetlifyより運用負荷が大きいため、AWS運用自体がproduct requirementになるまで移行しない。

Amplify等のmanaged Next.js hostingは、採用時点のNext.js/Payload compatibilityを公式Documentationとreal previewで再検証する。

## Email boundary

Emailはapplication adapterの背後に置く。

- General / Personal -> `ivmz@ivrm.jp`
- Person-facing -> `ivuru@ivrm.jp`
- Developer / OSS -> `mizzz@ivrm.jp`
- ivRooom / Team -> `contact@ivrm.jp`
- Security -> `security@ivrm.jp`

Product codeを特定mail/DNS provider primitiveへ直接密結合しない。

## Portability rules

1. 実用上可能な範囲で標準Next.js / Node APIを使用する。
2. Databaseは`DATABASE_URL`の背後に置く。
3. Object storageはPayload storage adapterの背後に置く。
4. Emailはapplication adapterの背後に置く。
5. Anti-abuse / rate limitingは置き換え可能にする。
6. Page/content codeへDNS-provider固有logicを入れない。
7. Deployment固有設定は専用file / Runbook / ADRへ分離する。
8. Production / Preview / Localのcredentialとpersistent dataを共有しない。
