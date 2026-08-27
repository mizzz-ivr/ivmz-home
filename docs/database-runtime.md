# Database Runtime / Pooling Policy

## Purpose

`ivmz-home` はPayload CMSのPostgreSQL接続を `DATABASE_URL` の背後に維持しつつ、migrationとserverless runtimeで異なる接続特性を安全に扱う。

Repository migrationとruntime credentialは引き続き既存方針を維持し、database passwordや完全なconnection stringをRepositoryへ記録しない。

## Connection modes

### Migration / local / persistent process

Repository migration (`pnpm db:migrate`) はdirect connectionまたはSupabase Session poolerを使用できる。

- direct PostgreSQL: `5432`
- Supabase Session pooler: `5432`
- application側で追加のpool上限を強制しない

Migrationはsession-level behaviorや複数接続を必要とする可能性があるため、serverless向けのpool上限を適用しない。

### Netlify serverless runtime

Netlify Functionsのような短命・水平スケールするruntimeではSupabase Transaction poolerを使用する。

Netlify側で次の非Secret環境変数を設定する。

```text
PAYLOAD_DATABASE_POOL_MODE=transaction
```

`src/lib/database-connection.ts` はこのmodeが明示された場合だけ、次の条件をすべて満たす `DATABASE_URL` をruntime用に変換する。

- hostnameが `.pooler.supabase.com` で終わる
- portがSession poolerの `5432`
- `PAYLOAD_DATABASE_POOL_MODE=transaction`

変換内容はportだけである。

```text
5432 -> 6543
```

username / password / hostname / database / query parameterは変更しない。完全なconnection stringを別の環境変数へ複製しないため、credential rotation時の二重管理も避けられる。

Transaction pooler使用時はPayload内部の`node-postgres` application poolを小さい固定上限 `max: 5` に制限する。Payload初期化が接続を保持している間も後続query用の接続枠を確保しつつ、各serverless instanceが過剰な接続を抱え込まない構成にする。`max: 1` は初期化用接続だけでpoolを使い切り、後続の`find()`等がpool待ちになるため使用しない。

## Safety guards

- `PAYLOAD_DATABASE_POOL_MODE` が未設定または `session` の場合、`DATABASE_URL` は一切変更しない
- Supabase pooler以外のhostnameは変更しない
- 既に6543または別portのURLは変更しない
- URL parseに失敗した場合は入力値をそのまま返し、credentialを書き換えない
- GitHub Actions migrationではこのmodeを設定しない
- DB schema / migration / role / password / RLS policyはこのpooling policyでは変更しない

## Prepared statement compatibility

Supabase Transaction poolerはnamed prepared statementsをサポートしない。現在のPayload PostgreSQL adapterはDrizzle ORM + `node-postgres` を使用しており、このRepositoryでは実Deploy PreviewのPayload REST/Admin smokeを必須gateとして互換性を検証する。

Payload / Drizzle / node-postgres更新時にnamed prepared statementの利用方法が変化した場合は、Transaction pooler compatibilityを再検証する。

## Rollout gate

1. Deploy Previewだけ `PAYLOAD_DATABASE_POOL_MODE=transaction` を有効化する
2. Chromium / mobile WebKit / Payload security smokeを実Deploy Previewで完走する
3. `/admin` がPayload login / first-user routeへ正常遷移することを確認する
4. anonymous Users APIが401/403になることを確認する
5. public Content API readが200になり、`docs`配列を返すことを確認する
6. anonymous Content mutationが401/403になることを確認する
7. GitHub CI migrationが従来どおりGREENであることを確認する
8. Preview検証がGREENになった後だけProduction contextへ同じ非Secretmodeを設定する

HTTP 500の許容、security smokeのskip、認可期待値の緩和はしない。
