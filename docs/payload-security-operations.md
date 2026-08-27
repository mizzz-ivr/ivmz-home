# Payload Admin / Auth Security Operations

## Scope

このRunbookはProduction公開中のPayload Admin / Auth hardeningに関する運用手順を整理する。
Secret値そのものはRepository、Issue、PR、CI log、Notionへ記載しない。

## Origin policy

- Production: `https://ivmz.ivrm.jp` のみを許可する。
- Netlify Deploy Preview / Branch Deploy: Netlify system variable `DEPLOY_PRIME_URL` のoriginだけを許可する。
- Local / CI: `PAYLOAD_ALLOWED_ORIGINS` を使用する。未設定時のみlocalhost / loopbackへfallbackする。
- Productionでは`PAYLOAD_ALLOWED_ORIGINS`にlocalhostが設定されていてもコード側で採用しない。

これによりPreview URLをProduction allowlistへ追加し続ける運用を避け、ProductionとPreviewのCSRF/CORS trust boundaryを分離する。

## Auth rate limiting

Payload標準のaccount lockoutを維持したまま、Netlify code-based rate limitingを前段へ追加する。

今回のP1 protectionはcredential stuffing / password sprayingの主入口であるPayload login endpointへ絞る。

- 対象: `/api/users/login`
- limit: 10 requests / 60 seconds / domain + client IP
- 超過時: HTTP 429
- memory-only limiterは使用しない
- Deploy Preview smokeで存在しないprobe accountを使い、実環境で429を確認する

Netlifyのcode-based rate limitingはpath targetingが基本なので、Edge Function側でHTTP method条件へ依存せずlogin path単位で設定する。Payload login routeの正規利用はPOSTであり、IP + domain aggregationのため別clientのlogin枠を共有しない。

`forgot-password` / `reset-password` / `unlock` / `refresh-token` / `verify`は同じrate-limit ruleへ安易にまとめず、実際のabuse modelとNetlify側のcode-based rule budgetを確認した上で必要なendpointだけを追加する。

rate limit probeでは実在Adminのemail/passwordを使用しない。

## Security headers

Baselineとして以下を全routeへ付与する。

- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options`
- `Content-Security-Policy-Report-Only`

CSPはPayload Adminへの影響を避けるためReport-Onlyから開始する。`unsafe-inline` / `unsafe-eval` を安易に許可せず、Previewでconsole/reportを確認してからenforce policyを別変更として扱う。

## PAYLOAD_SECRET isolation / rotation

### Current risk

Production / Deploy Preview / Branch Deployで同一の`PAYLOAD_SECRET`を共有すると、Previewの侵害がProduction auth secretの侵害へ波及する可能性がある。

### Desired context split

- Production: Production専用secret
- Deploy Preview: Preview専用secret
- Branch Deploy: Branch Deploy専用secret
- Local / CI: Productionとは無関係なdevelopment / CI secret

### Impact

`PAYLOAD_SECRET`はPayloadの暗号化workflowとauth token/cookieの署名に使われるため、Production rotationは既存session/tokenを無効化し得る。secret変更自体はDB schema migrationを必要としないが、既存の暗号化済みデータを利用している機能がある場合はrotation前に影響確認が必要。

### Safe sequence

1. NetlifyのDeploy Preview / Branch DeployをProductionと異なるsecretへ分離する。
2. Previewをdeployし、Admin login / logout、Payload API、rate limit、security E2Eを確認する。
3. Production rotation前に現在値を安全なsecret store側でrollback用として保持する。値をIssue / PR / logへ出さない。
4. maintenance windowを確保し、Production contextだけ新しいsecretへ更新する。
5. Production deploy完了後、Admin login / logout、session再生成、public API、CMS read/writeを確認する。
6. 問題があれば旧Production secretへ戻してredeployする。

### Rollback caveat

旧secretへrollbackすると旧secretで署名されたsession/tokenが再び有効になり得る一方、新secretで発行されたsession/tokenは無効になる。rotation/rollback時は全Adminへ再loginを前提として通知する。

## Preview database isolation

Deploy Preview / Branch DeployがProductionと同じ`DATABASE_URL`を共有する状態は別のattack surfaceであり、Issue #18で分離する。

- #17ではDB topologyを変更しない
- Production/shared DBへtest fixtureを投入しない
- Preview DB分離時はcost、migration、seed、lifecycle、rollback、E2Eを先に設計する

## Acceptance checklist

- Production origin allowlistへlocalhostが入らない
- Preview/Branchは自身の`DEPLOY_PRIME_URL`だけをtrusted originとして使う
- arbitrary OriginへCORS許可を返さない
- Users / drafts / versions / mutationsがanonymousへ漏れない
- error responseへsecret / connection string / stack traceを漏らさない
- Public page / Payload Adminにsecurity headersが付く
- Deploy Previewでlogin rate limitが429を返す
- 正規Admin login / logoutと既存CMS運用を壊さない
