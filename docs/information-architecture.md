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
