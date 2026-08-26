# Identity / Domain / Contact Architecture

## Status

2026-08-26 confirmed direction.

Notion `35_Brand / Identity / Domain / Contact Architecture 2026-08-26` is the long-term decision Source of Truth. This document mirrors the parts that affect `ivmz-home` implementation.

## Identity

| Layer | Name / slug | Role |
| --- | --- | --- |
| Unified personal | `ivmz` | Personal platform, canonical URL, general personal contact |
| Person-facing | いゔる。 | SNS / creator / person-facing identity |
| Developer | mizzz（ずーみー） | Developer / OSS / technical identity |
| Team / ecosystem | ivRooom | Team / community / ecosystem |

`ivmz` is a slug and unified identity layer. It does not replace the display name `いゔる。` or the developer identity `mizzz`.

## Domain policy

```text
ivrm.jp
  → ivRooom / Team / Community / Ecosystem

ivmz.ivrm.jp
  → Unified Personal Identity / Portfolio / canonical

mizzz.jp
  → legacy / old-link compatibility
  → 301 Redirect to ivmz.ivrm.jp for Web
```

Rules:

1. New personal portfolio links use `https://ivmz.ivrm.jp`.
2. `https://ivrm.jp` remains the ivRooom root.
3. `mizzz.jp` is not a new canonical Web URL.
4. canonical / OGP / sitemap / Search Console should converge on `ivmz.ivrm.jp`.
5. Repository name is `mizzz-ivr/ivmz-home`. `ivumz-home` is obsolete.

## Mail architecture

| Address | Role | Public use |
| --- | --- | --- |
| `ivmz@ivrm.jp` | Unified Personal / General | Primary personal contact for X, GitHub, portfolio and general inquiries |
| `ivuru@ivrm.jp` | Person-facing | Role-specific From / Reply as いゔる。 |
| `mizzz@ivrm.jp` | Developer / OSS | Role-specific From / Reply for technical work |
| `contact@ivrm.jp` | ivRooom / Team | Team / community / project inquiries |
| `security@ivrm.jp` | Security | Vulnerability / security reports |
| `contact@mizzz.jp` | Legacy alias | Compatibility receive path; not the primary new contact |

The normal public contact surface should expose three addresses:

- General / Personal → `ivmz@ivrm.jp`
- ivRooom / Team → `contact@ivrm.jp`
- Security → `security@ivrm.jp`

`ivuru@ivrm.jp` and `mizzz@ivrm.jp` remain valid identities for replies when the inquiry context calls for them.

## Contact form routing

Recommended application-level routing:

```text
General / Personal / Other
  → ivmz@ivrm.jp

Creator / SNS / いゔる。 context
  → ivuru@ivrm.jp

Technical / OSS / Developer context
  → mizzz@ivrm.jp

ivRooom / Community / Team
  → contact@ivrm.jp

Security
  → security@ivrm.jp
```

The form does not need to ask visitors to understand the identity model. The category controls internal routing; replies can use the most appropriate identity From address.

## Email delivery direction

Inbound is currently based on Cloudflare Email Routing. Outbound is being evaluated with Cloudflare Email Service / Email Sending SMTP.

Before changing outbound delivery:

- preserve working inbound MX / routing
- verify all intended recipient aliases
- do not remove existing SES / Resend DNS merely because it looks old
- keep API tokens and destination addresses out of Git / public screenshots
- treat Workers Paid as an explicit implementation gate for Cloudflare Email Sending in the current account

## Repository rename migration

The repository has been renamed to `ivmz-home`.

Old internal identifiers must be migrated before the Payload / PostgreSQL foundation is merged:

- `ivumz_home` → `ivmz_home`
- `ivumz_home_app` → `ivmz_home_app`
- `mizzz.ivrm.jp` → `ivmz.ivrm.jp` where it represents the canonical site
- general-contact `mizzz@ivrm.jp` → `ivmz@ivrm.jp`

`mizzz@ivrm.jp` itself remains valid for Developer / OSS usage and must not be blindly replaced in technical-contact contexts.
