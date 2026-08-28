# Payload Admin / Auth Security Operations

## Scope

このRunbookはProduction公開中のPayload Admin / Auth hardeningと、Security rollout後の継続運用手順を整理する。

Secret値そのものはRepository、Issue、PR、CI log、Notionへ記載しない。

Repositoryは `mizzz-ivr/ivmz-home`、Production canonicalは `https://ivmz.ivrm.jp` を正とする。

## Current security posture — 2026-08-28

- Payload Admin / Auth hardening: Production反映済み
- Netlify Deploy Preview / Branch Deploy database: Productionから分離済み
- Deploy Preview / Branch Deploy / Preview Server / Local `PAYLOAD_SECRET`: Productionから分離済み
- Production `PAYLOAD_SECRET`: 現行legacy secretを維持、未rotation
- Netlify **Enforce Git-based deployments**: owner設定済み
- GitHub Ruleset `Protect main`: active
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

2026-08-28にNetlify contextを分離した。

- Production: 現行Production専用legacy secretを維持
- Deploy Preview: Productionと異なるPreview専用secret
- Branch Deploy: Production / Deploy Previewの両方と異なるBranch専用secret
- Preview Server: Production / Deploy Preview / Branch Deployと異なる専用secret
- Local / CI: Production secretを利用しない

値そのものは記録しない。

### Why split contexts

Productionと非Production contextで同じ`PAYLOAD_SECRET`を共有すると、Preview / Branch / Preview Server / Local側の侵害がProduction auth secretの侵害へ波及する可能性がある。contextごとに独立secretを使いblast radiusを分離する。

### Impact of rotation

`PAYLOAD_SECRET`はPayloadの暗号化workflowとauth token/cookieの署名に使われるため、Production rotationは既存session/tokenを無効化し得る。

secret変更自体はDB schema migrationを必要としないが、暗号化済みデータを利用する機能が追加された場合はrotation前に影響確認をやり直す。

### Preview validation sequence

1. Deploy Preview / Branch Deploy / Preview ServerをProductionと異なるsecretへ分離する。
2. fresh Deploy Previewを作成する。
3. build / Payload migration guard / public API preflightを通す。
4. `/admin` login surfaceを確認する。
5. anonymous Users / draft / versions / mutation denialを確認する。
6. login rate-limit 429をnon-existent probe identityで確認する。
7. Chromium / mobile WebKit regressionを通す。

Preview側にProduction dataやProduction credentialをコピーしない。

### Current Production rotation decision

現行Production secretはNetlify上でwrite-only / maskedとして保存されており、そのraw legacy valueを後から取得できない。

そのため、Security rollout完了のためだけにProduction secretを上書きしない。現時点ではrotationを**deferred**とする。

現行legacy secretから最初のmanaged secretへ切り替える場合、legacy raw valueへ戻すsecret-level rollbackはできない。この最初の切替は通常のrotationではなく、**明示承認されたone-way cutover**として扱う。

### First managed-secret cutover gate

最初のProduction cutoverは次をすべて満たした場合だけ実施する。

1. 新しいProduction secretをapproved secret managerで生成する。
2. Netlifyへ設定する前に、新secretをsecret managerへ保存する。
3. 保存済み新secretを実際にrecoverできることを確認する。
4. legacy secretへ戻せないone-way cutoverであることを明示的に受け入れる。
5. current known-good Production deploy ID / commitを記録する。
6. fresh Preview acceptanceがGREENであることを確認する。
7. Admin再loginが必要になる可能性を許容できるmaintenance windowで実施する。
8. public/API/CMS acceptanceを直ちに実施できることを確認する。

### First managed-secret cutover sequence

1. approved secret manager上の新secret recoverabilityを再確認する。
2. Netlify Production contextだけを新secretへ更新する。
3. reviewed Git `main`由来のProduction deployを実行する。
4. exact `main` commit / deploy `ready` / plugin success / secret scan 0件を確認する。
5. public routes / Payload public APIを確認する。
6. 正規Adminでloginし、新sessionが発行されることを確認する。
7. CMS read/write / logout / 再loginを確認する。
8. 問題がある場合も未知のlegacy secretへ戻そうとせず、新managed secretを維持したままapplication側をrevert / forward-fixする。
9. acceptance完了後、新managed secretを以後のrecoverable baselineとする。

### Subsequent rotation / rollback

最初のmanaged-secret cutover完了後は、各rotation前に現在のmanaged secretがsecret managerからrecoverableであることを確認する。

次世代secretを事前生成・保存しrecoverabilityを確認してからProductionへ反映する。

- 定期rotationや設定変更など、**直前secretがcompromiseしていないと確認できる通常変更**で問題が発生した場合だけ、保存済みの直前managed secretへrollbackしてreviewed Git `main`由来でredeployできる。
- 漏えい・盗難・不正利用など**直前secretのcompromiseが疑われるincident response**では、その直前secretへrollbackしない。切替先secretで問題が発生した場合は、さらに別の新しいsecretを生成・保存・recoverability確認したうえでroll-forwardし、application側もrevert / forward-fixして復旧する。
- compromiseした可能性のあるsecretで署名されたsession/tokenは再び有効化しない。必要に応じて全Admin session無効化・credential reviewなどincident responseを行う。

安全な通常rollbackで旧managed secretへ戻した場合でも、旧secretで署名されたsession/tokenが再び有効になり得る一方、新secretで発行されたsession/tokenは無効になる。rotation / rollback / roll-forward時は全Adminへ再loginを前提とする。

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

2026-08-28、Netlify **Enforce Git-based deployments** はowner設定済み。Production publishはreviewed Git `main`由来へ限定する。

GitHub側もRepository Ruleset `Protect main` をactive化済み。

- Require Pull Request
- required status check: `quality`
- required status check: `netlify/ivmz-home/deploy-preview`
- Require conversation resolution
- strict required status checks policy
- force-push禁止
- deletion禁止
- bypass actorなし

有効化後もDeploy Preview / Branch Deployの非Production deployは利用できる。

## Acceptance checklist

- Production origin allowlistへlocalhostが入らない
- Preview/Branchは自身の`DEPLOY_PRIME_URL`だけをtrusted originとして使う
- arbitrary OriginへCORS許可を返さない
- Users / drafts / versions / mutationsがanonymousへ漏れない
- error responseへsecret / connection string / stack traceを漏らさない
- Public page / Payload Adminにsecurity headersが付く
- CSPは明示的なenforce承認までReport-Only
- Deploy Previewでlogin rate limitが429を返す
- Production / Deploy Preview / Branch Deploy / Preview Server / Localで`PAYLOAD_SECRET`を共有しない
- Production DBとPreview DBを共有しない
- client rolesへ`ivmz_home` grantsを与えない
- Production publishをreviewed Git `main`へ限定する
- 正規Admin login / logoutと既存CMS運用を壊さない
