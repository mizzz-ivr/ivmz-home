# Database Runtime / Pooling Policy

## Purpose

`ivmz-home` はPayload CMSのPostgreSQL接続を `DATABASE_URL` の背後に維持しつつ、migrationとserverless runtimeで異なる接続特性を安全に扱う。

Database passwordや完全なconnection stringをRepository / Issue / PR / Notion / CI logへ記録しない。

## Current environment topology

| Context | Database | Migration connection | Runtime connection |
| --- | --- | --- | --- |
| Production | Supabase `ivrm-core` | explicit release gate | Netlify serverless transaction mode |
| Deploy Preview | Supabase `ivmz-home-preview` | Netlify buildでsession mode | Netlify serverless transaction mode |
| Branch Deploy | `ivmz-home-preview` | Netlify buildでsession mode | Netlify serverless transaction mode |
| GitHub CI | ephemeral PostgreSQL 17 | normal PostgreSQL | test process |
| Local | local/dev PostgreSQL | normal PostgreSQL | persistent process |

Production dataをPreviewへcopyしない。

## Connection modes

### Migration / local / persistent process

Repository migration (`pnpm db:migrate`) はdirect connectionまたはSupabase Session poolerを使用できる。

- direct PostgreSQL: `5432`
- Supabase Session pooler: `5432`
- application側でserverless向けpool上限を強制しない

Migrationはsession-level behaviorや複数接続を必要とする可能性があるため、serverless transaction poolingへ自動変換しない。

Deploy Preview / Branch Deploy migration commandでは `PAYLOAD_DATABASE_POOL_MODE=session` を明示し、runtime側のtransaction poolingと分離する。

### Netlify serverless runtime

`src/lib/database-connection.ts` は次の優先順位でpool modeを解決する。

1. `PAYLOAD_DATABASE_POOL_MODE=session|transaction` が明示されていればその値を使う。
2. 未設定でもNetlify Functions runtimeで `AWS_LAMBDA_FUNCTION_NAME` が存在する場合は `transaction` と判定する。
3. それ以外はURLを変更しない。

transaction mode時に、`DATABASE_URL` がSupabase Session pooler (`*.pooler.supabase.com:5432`) の場合だけportを変換する。

```text
5432 -> 6543
```

username / password / hostname / database / query parameterは変更しない。

Transaction pooler利用時だけPayload内部の`node-postgres` poolを `max: 5` に制限する。`max: 1` はPayload初期化用接続でpoolを使い切る可能性があるため使用しない。

## Safety guards

- `PAYLOAD_DATABASE_POOL_MODE=session` の場合はtransaction portへ変換しない
- Supabase pooler以外のhostnameは変更しない
- Session pooler `5432`以外のportは変更しない
- URL parseに失敗した場合は入力値をそのまま使う
- username / password / hostname / database / query parameterを再生成しない
- GitHub CI migrationでtransaction modeを強制しない
- DB schema / migration / role / password / RLS policyはpooling helperでは変更しない
- connection stringをdiagnostic logへ出さない

## Prepared statement compatibility

Supabase Transaction poolerはnamed prepared statementsに制約がある。

Payload / Drizzle / `node-postgres`の更新時は、real Deploy PreviewでPayload REST/Admin smokeを実行してcompatibilityを再確認する。

Dependency更新だけを理由にtransaction pooling compatibilityを推測で維持扱いにしない。

## Preview migration target guard

Issue #18 / PR #21でDeploy Preview / Branch Deploy migrationにfail-closed target guardを導入済み。

- contextが`deploy-preview` / `branch-deploy`以外なら拒否
- `DATABASE_URL`未設定なら拒否
- Preview Supabase Project refと一致しなければ拒否
- Production Project refは明示的に拒否
- migration commandのみsession modeを強制
- Production buildにはPreview migration commandを設定しない

Repository `src/migrations/` をmigration Source of Truthとし、Supabase CLI migrationとの二重管理やmigration historyの手動INSERTを行わない。

## Runtime acceptance

fresh Deploy Previewでは最低限次を確認する。

1. build中のPreview migration target guardが通る
2. Payload public API preflight 200
3. `/admin` login surfaceが正常
4. anonymous Users APIが401/403
5. public Content API readが200
6. draft / versions / private dataがanonymousへ漏れない
7. anonymous mutationが401/403
8. Chromium / mobile WebKitがGREEN
9. non-existent probe identityによるlogin rate limit 429
10. secret scan 0 matches

Remote GETの既知transient transport failureだけはshared E2E helperで最大1回retryする。HTTP 4xx/5xx、assertion failure、POST/PATCH/DELETE mutationはretryしない。

## Production gate

Production runtimeはGitHub `main` -> Netlify Git integrationのreviewed deployだけを使用する。

Production migrationはbuildと切り離し、必要なschema migrationがある時だけbackup / migration review / rollbackを準備したrelease gateとして実行する。

HTTP 500の許容、security smokeのskip、認可期待値の緩和でdeployを通さない。
