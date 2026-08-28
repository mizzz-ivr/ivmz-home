# Payload Admin / Auth Security Operations

## Scope

このRunbookはProduction公開中のPayload Admin / Auth hardeningと、Security rollout後の継続運用手順を整理する。

Secret値そのものはRepository、Issue、PR、CI log、Notionへ記載しない。

Repositoryは `mizzz-ivr/ivmz-home`、Production canonicalは `https://ivmz.ivrm.jp` を正とする。

## Current security posture — 2026-08-28

- Payload Admin / Auth hardening: Production反映済み
- Netlify Deploy Preview / Branch Deploy database: Productionから分離済み
- Deploy Preview / Branch Deploy `PAYLOAD_SECRET`: Productionから分離済み、かつ相互にも別secret
- Production `PAYLOAD_SECRET`: 未rotation
- CSP: `Content-Security-Policy-Report-Only` のまま運用
- Production / Preview Supabase `ivmz_home`: client rolesから直接到達不能をread-onlyで再確認済み
- Production DBへのfixture / destructive DDL/DML: 実施しない

## Origin policy

- Production: `https://ivmz.ivrm.jp` のみを許可する。
- Netlify Deploy Preview / Branch Deploy: Netlify system variable `DEPLOY_PRIME_URL` のoriginだけを許可する。
- Local / CI: `PAYLOAD_ALLOWED_ORIGINS` を使用する。未設定時のみlocalhost / loopbackへfallbackする。
- Productionでは`PAYLOAD_ALLOWED_ORIGINS`にlocalhostが設定されていてもコード側で採用しない。

これによりPreview URLをProduction allowlistへ追加し続ける運用を避け、ProductionとPreviewのCSRF/CORS trust boundaryを分離する。

## Auth rate limiting

Payload標準のaccount lockoutを維持したまま、Netlify code-based rate limitingを前段へ追加する。

P1 protectionはcredential stuffing / password sprayingの主入口であるPayload login endpointへ絞る。

- 対象: `/api/users/login`
- 実装: Netlify Edge Functionのcode-based rate limit
- request chain: `context.next()` でNext/Payload handlerへ明示的に継続
- limit: 10 requests / 60 seconds / domain + client IP
- 超過時: HTTP 429
- memory-only limiterは使用しない
- Deploy Preview smokeでは存在しないprobe accountを使い、実環境で429を確認する

`forgot-password` / `reset-password` / `unlock` / `refresh-token` / `verify`は同じrate-limit ruleへ安易にまとめない。実際のabuse modelとNetlify側のrule budgetを確認し、必要なendpointだけを追加する。

rate limit probeでは実在Adminのemail/passwordを使用しない。

## Security headers

Baselineとして以下を全routeへ付与する。

- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options`
- `Content-Security-Policy-Report-Only`

Next.jsの`poweredByHeader`は無効化する。

### CSP rollout policy

CSPはPayload AdminやNext.js runtimeを壊さないことを優先し、Report-Onlyから開始する。

現行baselineは `default-src 'self'` / `base-uri 'self'` / `object-src 'none'` / `frame-ancestors 'self'` をReport-Onlyで提示している。Next.js / Payload Adminが生成するinline script/style等は実際のviolation観測を行ってからsourceを精査する。

- `unsafe-inline` / `unsafe-eval` を観測なしで追加しない
- Report-Onlyのままreal Production/Preview violationを確認する
- enforce化は独立PRとする
- enforce PRにはpublic routes + `/admin` + Payload API regression acceptanceを必須とする

## PAYLOAD_SECRET isolation / rotation

### Current state

2026-08-28にNetlify contextを再確認し、以下へ分離した。

- Production: 現行Production専用secretを維持
- Deploy Preview: Productionと異なるPreview専用secret
- Branch Deploy: Production / Deploy Previewの両方と異なるBranch専用secret
- Local / CI: Production secretを利用しない

値そのものは記録しない。

### Why split contexts

Production / Deploy Preview / Branch Deployで同じ`PAYLOAD_SECRET`を共有すると、Preview側の侵害がProduction auth secretの侵害へ波及する可能性がある。Preview/Branchを独立secretにすることでblast radiusを分離する。

### Impact of rotation

`PAYLOAD_SECRET`はPayloadの暗号化workflowとauth token/cookieの署名に使われるため、Production rotationは既存session/tokenを無効化し得る。

secret変更自体はDB schema migrationを必要としないが、暗号化済みデータを利用する機能が追加された場合はrotation前に影響確認をやり直す。

### Preview validation sequence

1. Deploy Preview / Branch DeployをProductionと異なるsecretへ分離する。
2. fresh Deploy Previewを作成する。
3. build / Payload migration guard / public API preflightを通す。
4. `/admin` login surfaceを確認する。
5. anonymous Users / draft / versions / mutation denialを確認する。
6. login rate-limit 429をnon-existent probe identityで確認する。
7. Chromium / mobile WebKit regressionを通す。

Preview側にProduction dataやProduction credentialをコピーしない。

### Production rotation gate

Production rotationは、次をすべて満たすまで実行しない。

1. **現在のProduction secretの実値を、Netlifyとは別の承認済みsecret managerへrollback用として保存できていること。**
2. 保存した値を実際に復旧時に取得できることを確認すること。
3. fresh Previewで分離secretのacceptanceが完了していること。
4. Production rollback deploy referenceを記録していること。
5. Admin再loginが必要になる可能性を許容できること。
6. Production change window中にpublic/API/CMS acceptanceを実施できること。

Netlify API/MCPからmasked secretしか取得できず旧値を復元できない場合、その状態でProduction secretを上書きしてはいけない。

### Production rotation sequence

1. rollback用旧secretのrecoverabilityを確認する。
2. Production contextだけ新しいsecretへ更新する。
3. Git `main`由来のProduction deployを実行する。
4. exact `main` commit / deploy `ready` / secret scan 0件を確認する。
5. public routes / Payload public APIを確認する。
6. 正規Adminでloginし、新sessionが発行されることを確認する。
7. CMS read/writeとlogoutを確認する。
8. 問題がなければ旧secretをrotation rollback専用保管へ移す。

### Rollback

問題がある場合は、保存済みの旧Production secretへ戻してGit由来のProduction redeployを行う。

旧secretへrollbackすると旧secretで署名されたsession/tokenが再び有効になり得る一方、新secretで発行されたsession/tokenは無効になる。rotation/rollback時は全Adminへ再loginを前提とする。

## Preview database isolation

Issue #18 / PR #21でPreview database分離を完了済み。

| Context | Database | Schema | Data policy |
| --- | --- | --- | --- |
| Production | Supabase `ivrm-core` | `ivmz_home` | Production data |
| Deploy Preview | Supabase `ivmz-home-preview` | `ivmz_home` | Production dataを持たない |
| Branch Deploy | `ivmz-home-preview` | `ivmz_home` | Production dataを持たない |
| GitHub CI | ephemeral PostgreSQL | `ivmz_home` | test only |
| Local | local/dev PostgreSQL | `ivmz_home` | local only |

Preview/Branch migrationはRepository `src/migrations/` をSource of Truthとし、Netlify context guardを通過した場合だけ実行する。Production buildからPreview migration commandを実行しない。

## Supabase / Payload database boundary

2026-08-28のread-only再確認:

### Production

- schema owner: dedicated application role `ivmz_home_app`
- `anon`: schema USAGEなし / Payload tables SELECT・mutationなし
- `authenticated`: schema USAGEなし / Payload tables SELECT・mutationなし
- `service_role`: schema USAGEなし / Payload tables SELECT・mutationなし
- `ivmz_home_app`: login可能 / non-superuser / `BYPASSRLS=false` / Payload tablesへの必要なread/writeあり
- Payload-managed 25 tables: RLS disabled

Supabaseの`service_role`自体はplatform roleとして`BYPASSRLS=true`だが、`ivmz_home`へのschema/table grantsを持たないため、このcustom schemaへ直接到達できない境界を維持する。

### Preview

- schema owner: `postgres`
- `anon` / `authenticated` / `service_role`: schema USAGEなし / Payload tables read-writeなし
- Payload-managed 25 tables: RLS disabled
- Preview runtimeはProduction dataを持たない

### RLS decision

RLS disabled advisoryだけを根拠にPayload-managed schemaへ一括RLSを導入しない。

現在のauthorization boundaryは次の2層:

1. PostgreSQL grantsでSupabase client rolesから`ivmz_home`を到達不能にする。
2. Payload server-side connection + Payload Access Controlでapplication authorizationを行う。

schema grant / Data API exposure / runtime roleを変更する場合は、RLS posture reviewを再実施する。

## Production deployment guardrail

Production publishの原則経路は次の通り。

```text
GitHub reviewed PR
  -> merge to main
  -> Netlify Git integration
  -> Production
```

Netlifyでは **Enforce Git-based deployments** を有効化し、CLI / API / MCP / Deploy Previewの直接Production publishを拒否する。

Netlify UI:

1. Project `ivmz-home`
2. Project configuration
3. Build & deploy
4. Continuous deployment
5. Enforce deployment methods
6. Configure
7. Git-based Production deployment enforcementを有効化

有効化後もDeploy Preview / Branch Deployの非Production deployは利用できる。

GitHub側では`main`をruleset / branch protectionで保護し、PR経由・CI成功・force-push/deletion禁止を基本とする。

## Acceptance checklist

- Production origin allowlistへlocalhostが入らない
- Preview/Branchは自身の`DEPLOY_PRIME_URL`だけをtrusted originとして使う
- arbitrary OriginへCORS許可を返さない
- Users / drafts / versions / mutationsがanonymousへ漏れない
- error responseへsecret / connection string / stack traceを漏らさない
- Public page / Payload Adminにsecurity headersが付く
- CSPは明示的なenforce承認までReport-Only
- Deploy Previewでlogin rate limitが429を返す
- Production / Preview / Branchの`PAYLOAD_SECRET`を共有しない
- Production DBとPreview DBを共有しない
- client rolesへ`ivmz_home` grantsを与えない
- Production publishをreviewed Git `main`へ限定する
- 正規Admin login / logoutと既存CMS運用を壊さない
