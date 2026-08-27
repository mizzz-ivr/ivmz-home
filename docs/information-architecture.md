# Information Architecture

```text
/
├─ /about
├─ /works
│  └─ /works/[slug]
├─ /blog
│  └─ /blog/[slug]
├─ /news
│  └─ /news/[slug]
├─ /schedule
├─ /store              # Phase 2 / Coming Soon at launch
├─ /contact
├─ /links
└─ /legal
   ├─ /privacy
   ├─ /terms
   └─ /tokushoho       # enable with Store
```

## Home order

1. Hero / Identity
2. Selected Works
3. What I Do / About snapshot
4. Latest Writing
5. News / Activity
6. Schedule
7. Social Signal
8. Contact

The signature scroll choreography may visually combine adjacent pieces, but URLs, headings and primary content remain semantic DOM.

## Navigation model

The public site uses Next.js App Router for routing, SSR/ISR, metadata, and Payload-backed content, but public route changes intentionally use native document navigation.

- `/about`, `/works`, `/blog`, `/news`, `/schedule`, `/contact`, `/links`, and `/legal/*` are independent public routes.
- Internal links between public routes use plain `<a href>` rather than `next/link`.
- Route changes therefore create a new document request instead of Next.js client-side SPA navigation.
- Same-page anchors such as Home section scroll and footer Back to Top remain normal fragment navigation.
- Direct navigation and reload must remain valid for every public route.
- Theme preference is restored before paint from `localStorage` on every document.
- Signature Intro is shown only for the first document in a browser session; subsequent document navigations suppress it via the existing `sessionStorage` marker.

This keeps the deployment/runtime benefits of Next.js while making the visitor-facing navigation behavior explicitly MPA-like.

## Shared site footer

The footer belongs to `src/app/(site)/layout.tsx`, not to an individual Home section.

It must therefore appear exactly once on every public site route and provide stable navigation to:

- Home
- About
- Works
- Blog
- News
- Schedule
- Contact
- Links
- Privacy
- Terms

The Home Contact section remains content/CTA only; it must not contain a second local footer.

## Identity presentation

The site canonical is `ivmz.ivrm.jp` and the unified personal identity slug is `ivmz`.

The site should explain, rather than collapse, the role split:

- `ivmz` — unified personal identity / platform / general contact
- いゔる。 — person-facing / SNS / creator identity
- mizzz — Developer / OSS / technical identity
- ivRooom — Team / Community / Ecosystem

## Contact page

Visitors should not need to know which internal mailbox to choose before contacting.

Recommended public categories:

- General / Personal
- Creator / SNS
- Technical / OSS / Developer
- ivRooom / Community / Team
- Security
- Other

Application routing:

```text
General / Personal / Other -> ivmz@ivrm.jp
Creator / SNS               -> ivuru@ivrm.jp
Technical / OSS / Developer -> mizzz@ivrm.jp
ivRooom / Team              -> contact@ivrm.jp
Security                    -> security@ivrm.jp
```

The normal public contact surface should primarily show:

- `ivmz@ivrm.jp`
- `contact@ivrm.jp`
- `security@ivrm.jp`

`ivuru@ivrm.jp` and `mizzz@ivrm.jp` remain role-specific reply identities. `contact@mizzz.jp` is legacy compatibility and is not a new primary contact path.
