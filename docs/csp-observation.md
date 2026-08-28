# CSP Report-Only Observation Runbook

## Scope

Issue #29のための、`Content-Security-Policy-Report-Only` violation観測とenforcement candidate設計手順。

Productionへreport collector、debug endpoint、unsafe policyを追加せず、Playwrightのbrowser-side `securitypolicyviolation` eventだけを使う。

Production enforceはこのRunbookの対象外。enforceはreal observation完了後の独立PRとする。

## Current baseline — 2026-08-28

- Next.js: `16.3.3`
- Payload: `3.88.0`
- Payload Admin: Next.js App Router上の`/admin`
- current header: `Content-Security-Policy-Report-Only`
- current policy:

```text
default-src 'self';
base-uri 'self';
object-src 'none';
frame-ancestors 'self'
```

- explicit `script-src` / `style-src` nonce/hash strategy: none
- Production enforce: disabled

## Why observation stays outside Production

NetlifyはCSP reporting functionやthird-party collectorも利用できるが、Issue #29ではまずapplicationへcollectorを追加しない。

理由:

- Production request metadataを新しい保存先へ送らない
- accidental query string / document URL / source sample collectionを避ける
- additional function / retention / access-control boundaryを増やさない
- zero-costで観測できる
- Report-Only policy自体を変更せず実行できる

観測は`tests/e2e/csp-observation.spec.ts`で行う。

## Data minimization

観測結果へ出力してよい情報:

- fixed route label
- Playwright project name
- `effectiveDirective`
- `violatedDirective`
- `disposition`
- blocked resourceのsanitized category
  - same-origin -> `'self'`
  - external URL -> origin only
  - `data:` / `blob:` -> scheme only
  - inline/eval -> `inline` / `eval` 等のbrowser token

出力しない情報:

- complete document URL
- query string / fragment
- `sourceFile`
- line / column
- CSP `sample`
- request / response body
- cookie
- token
- Admin credential
- connection string

`CSP_OBSERVATION` logへ上記以外を追加しない。

## Automatic Deploy Preview observation

通常のDeploy Preview smokeは`pnpm test:e2e`を実行するため、CSP observation specもChromium / mobile WebKitで実行される。

期待される動作:

1. `/`, `/about`, `/works`, `/blog`, `/news`, `/schedule`, `/links`, `/contact`をread-onlyで表示する。
2. `/admin` login / create-first-user surfaceをread-onlyで表示する。
3. `securitypolicyviolation` eventを収集する。
4. sanitized inventoryだけを`CSP_OBSERVATION`として標準出力する。
5. `/api/works?limit=1&depth=0`が200かつReport-Onlyのままであることを確認する。
6. `Content-Security-Policy` enforcing headerが誤って追加されていた場合はfailする。

violationが存在すること自体ではfailしない。Issue #29のPhase Bではviolationが観測対象だからである。

## Production public / login-surface observation

Productionへの観測も同じspecを使用する。read-only public routesと`/admin` login surfaceにはcredential不要。

PowerShell:

```powershell
$env:E2E_BASE_URL="https://ivmz.ivrm.jp"
pnpm test:csp-observe
Remove-Item Env:E2E_BASE_URL
```

この実行はProductionへwriteしない。

## Authenticated Payload Admin observation

Authenticated Adminは自動credential入力を行わない。

必要な場合だけ、開発者自身がローカルbrowserでloginし、Playwright storage stateを**Repository checkout外の一時ファイル**へ保存する。

PowerShell例:

```powershell
$state = Join-Path $env:TEMP "ivmz-home-csp-admin-state.json"
pnpm exec playwright codegen --save-storage="$state" https://ivmz.ivrm.jp/admin

$env:E2E_BASE_URL="https://ivmz.ivrm.jp"
$env:CSP_ADMIN_STORAGE_STATE=$state
pnpm test:csp-observe

Remove-Item $state -Force
Remove-Item Env:CSP_ADMIN_STORAGE_STATE
Remove-Item Env:E2E_BASE_URL
```

制約:

- login passwordをscript / shell history / GitHub / Notionへ記載しない
- storage stateをRepository配下へ保存しない
- storage stateをCI artifactへuploadしない
- observation完了後に一時stateを削除する
- authenticated observationはread-only route navigationだけにする
- create/update/delete操作はIssue #29 observationでは行わない

現在のread-only authenticated routes:

```text
/admin
/admin/collections/works
/admin/collections/posts
```

## Inventory classification

観測した各violationを以下へ分類する。

### Next.js framework requirement

Next.js / React runtime、framework bundle、framework inline script/style等。

### Payload Admin requirement

Payload Admin UI、Payloadが必要とするscript/style/image/font/connect等。

### Application requirement

`ivmz-home`固有のpublic UI、remote image、API接続等。

### Third-party requirement

外部サービスorigin。実際に必要である証拠があるものだけ候補へ残す。

### Unnecessary / suspicious

不要なextension injection、browser addon、unexpected external resource等。allowlistへ追加しない。

## Enforcement design candidates

### Candidate A — nonce-based CSP

Next.js公式はrequestごとのnonceをCSP headerへ入れるstrict CSPをサポートし、framework scripts / page bundles / Next.js-generated inline script/styleへnonceを自動適用する。

ただしnonce-based CSPはdynamic renderingが必要で、公式documentation上:

- static optimization無効
- ISR無効
- default CDN caching不可
- PPR非互換
- requestごとのSSR負荷増

となる。

そのためpublic site全体へのnonce一括導入は、観測前には採用しない。

### Candidate B — SRI / hash-based CSP

Next.jsにはSRIによるhash-based CSP supportがあるが、現時点ではexperimentalでApp Router + webpack限定。

`ivmz-home`はNext.js 16系で、Next.js 16は`next build`のdefault bundlerがTurbopackである。SRIを採用するにはwebpackへopt-outする必要があり、build pipeline / deploy behaviorの変更を伴う。

したがってSRIも観測前には採用しない。

### Candidate C — public / Admin policy separation

実観測でPayload Adminだけに追加requirementが集中する場合、public routesと`/admin`でpolicyを分離する価値を評価する。

狙い:

- public static / cache behaviorを維持する
- Admin側だけstrict nonce等を検討する
- Payload固有allowlistをpublic siteへ拡散しない

ただしNext.js / Netlifyのrequest path、header propagation、Payload Admin renderingで実際に成立することをDeploy Previewで検証してから採用する。

## Prohibited shortcuts

以下は観測結果なしでは採用しない。

- `unsafe-inline`
- `unsafe-eval`
- `https:` scheme-wide allow
- `*`
- broad wildcard subdomain
- policyを通すためだけのallowlist追加
- Productionへのdirect enforce

## Phase B completion gate

次を満たしてからenforcement candidate実装へ進む。

- Chromium Deploy Preview inventory
- mobile WebKit Deploy Preview inventory
- Production public/login-surface inventory
- authenticated Admin inventory
- framework / Payload / application / third-party分類
- required origin / inline requirementに証拠がある
- unnecessary sourceをallowlistへ含めない
- rendering / cache impactを候補ごとに記録する

## Official references

- Next.js CSP: https://nextjs.org/docs/app/guides/content-security-policy
- Next.js 16 upgrade / Turbopack default: https://nextjs.org/docs/app/guides/upgrading/version-16
- Payload Admin overview: https://payloadcms.com/docs/admin/overview
- Payload production deployment: https://payloadcms.com/docs/production/deployment
- Netlify CSP: https://docs.netlify.com/manage/security/content-security-policy/
