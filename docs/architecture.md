# アーキテクチャ

## 決定事項

初期構成は **単一のNext.jsアプリケーション** とする。サイトUI、Payload Admin/API、問い合わせ用エンドポイントは、具体的なスケーリング要件またはセキュリティ要件によって分離が必要になるまで、1つのデプロイ単位に維持する。

アプリケーションは標準的なNode.js互換のNext.jsホストへデプロイ可能な構成とする。ホスティング固有APIは境界のアダプターとして扱い、アプリケーションの基本機能そのものにはしない。

## ランタイム層

```text
Browser
  ├─ SSR/RSC DOMコンテンツ（常に利用可能）
  ├─ CSS depth / transform（基本的な視覚拡張）
  └─ 遅延読み込みするclient island
       ├─ GSAP + ScrollTrigger（スクロール演出）
       ├─ Motion（マイクロインタラクション）
       └─ R3F / Drei（重要シーンで本当に必要な場合のみ）

Next.js 16 App Router
  ├─ 公開ページ / RSC
  ├─ Payload CMS統合Admin + REST route
  ├─ 問い合わせserver endpoint
  └─ feed / sitemap / robots / structured data

Portable services
  ├─ DATABASE_URL経由のPostgreSQL
  ├─ object storage adapter（第一候補: AWS S3）
  ├─ email adapter（AWS採用時の第一候補: SES）
  └─ hosting境界で選択するanti-abuse / rate-limit adapter
```

## Cloudflare runtimeへ依存しない

Cloudflareは当面DNS providerとして残る可能性があるが、アプリケーションは以下へ依存しない。

- Workers
- D1
- R2 native binding
- 置き換え不能なアプリケーション基盤としてのTurnstile
- Cloudflare Email Sending

これにより、DNSやインフラを将来AWS側へ移行しても、application runtimeそのものを書き直さずに済む構成を維持する。

## Hosting境界

Launch時の第一候補はNetlifyとする。現時点のNext.js runtimeは、AWS Amplifyが公式に記載しているNext.js 15までの対応範囲より、プロジェクトで利用するNext.js 16の機能に適合しているためである。

コードベースは通常の `next build` / `next start` とportableな環境変数を使用し、将来AWS上のcontainer deploymentへ移行できる余地を維持する。

## CMS境界

Payload CMS `3.88.0` を同一Next.jsアプリケーションへ直接統合する。

Foundationで導入するcollection:

- Users — Payload AuthおよびAdmin identity
- Media — storage境界のみ。cloud storage設定まではproductionのlocal writeを無効化

将来のcollectionは別featureとして実装する。

- Works
- Posts
- News
- Schedule
- SocialLinks
- Contacts
- SiteSettings

ProductsはPhase 2とする。

Foundation時点では具体的なproduct要件がないためGraphQLは無効化する。CMSのHTTP surfaceはPayload REST APIとAdmin UIを採用する。

## 永続化

- Database: `DATABASE_URL` の背後にPostgreSQLを置く。Payload利用のために特定provider固有のapplication SQLを要求しない。
- PostgreSQL schema: Payload管理tableは専用schema `ivumz_home` へ固定し、共有clusterを利用する場合でも `public` や他applicationのtableと名前空間を分離する。これはPostgreSQL標準機能とPayload Postgres adapterの `schemaName` を利用するもので、特定providerへは依存しない。
- Schema lifecycle: `src/migrations` 配下のRepository管理migrationをSource of Truthとする。
- CI: ephemeral PostgreSQL 17 serviceへmigrationを適用してからbuildする。
- Preview / Production: migrationは明示的なdeployment gateとする。`next build` から破壊的なschema変更を自動実行しない。
- Media: local diskはdevelopmentのみ許可する。Payload storage adapterを設定するまではproduction writeを無効化する。
- Production media adapterの第一候補はAWS S3。media-storage PRで必要になった時点で導入し、AWS resourceはTerraformで管理する。

## セキュリティ境界

- Secretをpublic repositoryへ保存しない。
- Payload AdminはPayload Users/Auth collectionを使用し、並行する独自Authを作らない。
- Passwordは14文字以上を必須とする。
- Login失敗5回で15分間accountをlockする。
- Admin userのAPI key認証は無効化する。
- ProductionのAuth cookieはSecureとし、CSRF/CORS originはallow-listで制限する。
- UsersとMediaは匿名writeを許可しない。FoundationではMediaの匿名readも許可しない。
- GraphQLを無効化し、Payload query depthに上限を設ける。
- Contactの配送先はcategory allow-listからserver-sideで決定する。
- Rate limitとbot protectionはmail送信前に適用する。分散IP rate limitはserverlessのin-memory stateではなく、hosting境界の後続実装とする。
- Security reportの配送先は `security@ivrm.jp` のみとする。
- Admin/API routeはpublic indexing対象外とする。
- CSPは実際に利用するscript/media inventoryが確定してから定義する。

## Performance budget

- LCP対象のidentity copyはSSR DOMとして出力する。
- Canonical character imageは最適化したimage assetとし、Canvas textや3D objectを必須条件にしない。
- Navigationやcontent discoveryにWebGLを必須としない。
- Depth表現はCSS transformを優先する。
- 外部SNS feedはserver-side cacheし、障害時はstatic linkへfallbackする。
