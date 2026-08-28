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

Remote navigationだけは既知の一時的transport/navigation failureに限り最大2回まで試行する。HTTP status assertion、CSP header assertion、violation分類自体はretryしない。retry diagnosticには固定route labelとattempt以外のrequest/response情報を出さない。

## Deploy Preview inventory — 2026-08-28

Exact-head Deploy Preview Smoke run `#309` / commit `cc26be416ce6ade0a1810d974c25fda9422a5fd4` はChromium / mobile WebKitともGREEN。

両browserで共通して観測したsanitized inventory:

| Surface | Effective directive / blocked category | Classification |
| --- | --- | --- |
| public routes | `script-src-elem` / `inline` | Next.js / React framework requirement candidate |
| public routes | `style-src-attr` / `inline` | framework/application rendering requirement candidate |
| `/admin` login surface | `script-src-elem` / `inline` | shared Next.js / React requirement candidate |
| `/admin` login surface | `style-src-attr` / `inline` | shared rendering requirement candidate |
| `/admin` login surface | `style-src-elem` / `inline` | Payload Admin-specific requirement candidate |
| Deploy Preview | `frame-src` / `https://app.netlify.com` | Netlify Deploy Preview environment; do not promote to Production allowlist |

観測上、`unsafe-eval`を要求するviolationは確認していない。外部`script` / `img` / `font` / `connect` / `worker` originをProduction policyへ追加すべき証拠も、このPreview inventoryからは得られていない。

この結果から、Payload Adminだけ追加のinline style requirementを持つため、public routesと`/admin`のpolicy分離は有力candidateとして残す。ただしauthenticated Admin operationまで観測する前に確定しない。

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

Next.jsのSRIについては、**16.3.3時点で公式情報に整合しない記述があるため、webpack opt-outの要否をRunbook上で断定しない**。

確認済みの公式情報:

- CSP guideは`experimental.sri`をexperimental / App Router / webpack-onlyと記載している。
- Turbopack API referenceにも`experimental.sri.algorithm`をTurbopack未対応featureとして記載している。
- 一方、Next.js 16.2 release notes / Turbopack 16.2 release notesはJavaScript filesのSRI supportをTurbopack improvementとして明記している。

したがって、enforcement PRを作る前に**exact Next.js `16.3.3` + current Netlify build pipeline**で小さなPreview spikeを行い、次を実測する:

1. Turbopack buildで`experimental.sri`が実際に有効か。
2. emitted external JavaScriptへ`integrity`が付与されるか。
3. inline React Server Components / flight scriptsがstrict `script-src`で残るか。
4. CDN/Netlify配信後もintegrity hashが一致するか。
5. `style-src-attr` / `style-src-elem` requirementをSRIでは解決できないことを前提に別strategyが必要か。

SRIはexternal JavaScript integrityとinline script/style CSP許可を同一問題として扱わない。Preview inventoryではinline script/styleが実際に主要violationなので、SRI単独をenforcement solutionとはみなさない。

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

- [x] Chromium Deploy Preview inventory
- [x] mobile WebKit Deploy Preview inventory
- [ ] Production public/login-surface inventory
- [ ] authenticated Admin inventory
- [x] Previewのframework / Payload / application / third-party初期分類
- [ ] authenticated Adminを含むrequired origin / inline requirementに証拠がある
- [x] Preview由来の不要sourceをProduction allowlistへ含めない方針
- [x] rendering / cache impactをcandidateごとに記録

## Validation history

- Iteration head `16378105fa3861bf821bdc4bfc187d7632b210f1`: CI `#343` success。format / lint / typecheck / unit / migration / generated artifacts / buildを通過。
- Final exact-head Deploy PreviewはこのRunbook更新commitを対象に、PR titleから`[skip netlify]`を外した状態で実施する。

## Official references

- Next.js CSP: https://nextjs.org/docs/app/guides/content-security-policy
- Next.js 16 upgrade / Turbopack default: https://nextjs.org/docs/app/guides/upgrading/version-16
- Next.js 16.2 release notes: https://nextjs.org/blog/next-16-2
- Payload Admin overview: https://payloadcms.com/docs/admin/overview
- Payload production deployment: https://payloadcms.com/docs/production/deployment
- Netlify CSP: https://docs.netlify.com/manage/security/content-security-policy/
