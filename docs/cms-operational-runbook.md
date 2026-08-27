# CMS Operational Runbook

状態: Launch Content / CMS Operational Acceptance — Issue #13

## Purpose

Payload CMSを公開コンテンツのSource of Truthとして運用するためのauthoring / publish / correction / rollback手順をまとめる。

対象Collection:

- Works
- Posts
- News
- Schedule
- Social Links

Production / shared PostgreSQLへE2E fixtureやseedを投入しない。検証は正式公開可能なcontent、または隔離された一時環境だけで行う。

## Public lifecycle

### Works / Posts / News

1. `/admin`へ認証済みPayload userでログインする。
2. 必須fieldを入力する。
3. slugはtitleから自動生成される。公開前にURLとして妥当か確認する。
4. Draftとして保存する。
5. publishする。
6. public listへ反映されたことを確認する。
7. detail route、canonical、Open Graph、JSON-LD、sitemapを確認する。
8. unpublishした場合、public list / detail / sitemapから消え、旧detail URLは404になることを確認する。

Anonymous public readはPayload access controlとapplication queryの両方でpublished contentへ限定する。DraftをPreview代わりにpublic routeへ出さない。

### Schedule

- `visibility = private` を初期状態として使う。
- `startAt`、`timezone`は必須。
- `endAt`は任意だが、指定する場合は`startAt`以降でなければ保存しない。
- 公開する時だけ `visibility = public` に変更する。
- Public UIはtimezoneを明示し、endAtがある場合はstart/endを両方表示する。
- 非公開へ戻す場合は `visibility = private` に変更する。

### Social Links

- URLはHTTP(S)のみ。
- `enabled = true` のitemだけpublic API / UIへ出す。
- `order`の昇順で表示する。
- 全itemをdisableした場合、正常なCMS queryの結果は0件として扱い、Repository fallbackを復活させない。
- Repository fallbackはCMS query自体が失敗した時だけavailability維持のために使う。

## Slug policy

Slugはrequired / unique / indexedで、titleから自動生成できる。

公開後のslug変更は既存URLを変更する。現時点ではredirect tableを持たないため、旧URLは404になる。

運用ルール:

- 初回publish前にslugを確定する。
- 誤字修正等で変更が必要な場合は、外部リンク・SNS・記事から参照されていないか確認する。
- SEO上重要な公開URLを変更する場合は、slug変更と301 redirectを同じ変更単位で設計する。redirect management自体はIssue #13のscope外。

## Canonical policy

### Internal canonical post

- canonical: `/blog/[slug]` のivmz URL
- Open Graph: internal canonical
- BlogPosting JSON-LD: 出力する
- sitemap: 含める
- body: CMS textをpublic detailへ表示する

### External canonical post

- canonical: CMSの外部HTTP(S) URL
- Open Graph URL: external canonical
- BlogPosting JSON-LD: internal routeでは出力しない
- sitemap: internal detail URLを除外する
- internal route: summary / taxonomy / external canonicalへの導線として維持する

Malformed canonicalはmetadata生成を壊さずinternal canonicalへ安全にfallbackする。

## URL / XSS boundary

Admin validationで外部URLはHTTP(S)だけを許可する。加えてpublic query adapterでもURLを再検証し、直接DB変更やlegacy dataでvalidationを迂回された値をpublic `href`へ渡さない。

Posts / News / Worksの本文系fieldは現時点でplain text / textarea baselineであり、raw HTMLとして解釈しない。React text nodeとして表示する。

JSON-LDはscript-breaking characterをescapeしてから出力する。

## Correction

Works / Posts / News:

1. 対象documentを編集する。
2. Draftで内容を確認する。
3. 修正版をpublishする。
4. list / detail / metadata / sitemapを再確認する。

Schedule / Social Links:

1. 対象documentを編集する。
2. visibility / enabledを含めて修正する。
3. public UIとanonymous API boundaryを確認する。

## Rollback

Works / Posts / NewsはPayload versions / draftsを有効化している。誤公開時はまずunpublishし、Adminのversion historyから直前の正常versionを復元して再publishする。

Schedule / Social Linksは現行modelでversion historyを有効化していない。通常の誤りはAdminで値を戻し、重大なデータ破損はdatabase backup / provider restore手順を使う。Issue #13ではversioning追加のためのschema変更は行わない。

## Empty state and fallback policy

CMS queryが正常に0件を返した状態は運用上の有効な状態である。

- Works / Posts / News / Schedule / Social Linksのpublic destinationは0件をempty stateとして扱う。
- Homeも成功した0件を0件として扱い、過去のstatic launch contentを復活させない。
- CMS query failure / timeout時だけHome全体またはLinksのstable fallbackでavailabilityを維持する。

これにより、最後のpublished itemをunpublishした時や最後のSocial Linkをdisableした時に古いstatic contentが再露出しない。

## Acceptance checklist

### Works

- create / edit / draft / publish / unpublish
- `/works` / `/works/[slug]`
- canonical / Open Graph / CreativeWork JSON-LD
- sitemap inclusion
- unknown slug 404

### Posts

- create / edit / draft / publish / unpublish
- `/blog` / `/blog/[slug]`
- category / tags / publishedAt
- internal / external canonical policy
- BlogPosting JSON-LD boundary
- sitemap policy

### News

- create / edit / draft / publish / unpublish
- `/news` / `/news/[slug]`
- Article JSON-LD
- externalUrl
- sitemap / 404

### Schedule

- create / edit
- startAt / endAt validation
- timezone display
- public/private boundary
- empty state

### Social Links

- enabled-only public boundary
- order
- safe URL
- disabled item non-public
- successful zero-result empty state

## Security regression gates

- `/admin`はPayload loginまたはcreate-first-user flowへ遷移する。
- Anonymous `/api/users?limit=1` は401/403。
- Anonymous content mutationは401/403。
- Anonymous draft queryは0件。
- Anonymous private Schedule / disabled Social Links queryは0件。
- 403 / 500 / unexpected 404をsuccessとして扱わない。
- SecretをRepository、Issue、PR、Notionへ記載しない。

## Launch acceptance gate

実コンテンツを使う最終acceptanceでは、Production test fixtureを作らず、正式公開可能なcontentを1件以上使う。

現在DBに正式contentが存在しない場合は、コード・CI・Previewの安全性確認までを先に完了し、正規Admin userと公開可能contentが用意された時点でcreate → publish → unpublishの実地確認を行う。
