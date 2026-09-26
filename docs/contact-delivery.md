# Contact Delivery Architecture

## Status

Issue #35 implementation baseline as of 2026-09-26.

This document records the application boundary and the AWS/SES readiness findings used by
`/contact`. Production delivery is intentionally **not enabled** until the SES identity,
production access, credentials, and feedback handling gates are complete.

## Application boundary

The browser submits only:

- `name`
- `email`
- `category`
- `subject`
- `message`
- hidden honeypot field

The browser never supplies a destination mailbox. `recipientFor(category)` remains the
server-side Source of Truth:

| Category family | Destination |
| --- | --- |
| Personal / Job / Collaboration / Media | `ivmz@ivrm.jp` |
| Development / OSS | `mizzz@ivrm.jp` |
| Community / Team | `contact@ivrm.jp` |
| Security | `security@ivrm.jp` |

The route rejects malformed data, oversized request bodies, unsupported content types,
cross-origin submissions, and header-injection inputs before the delivery boundary.

Application logs must not contain the sender email address or message body. Delivery errors
may log only the generated request ID, category, provider kind, and error class.

## Abuse boundary

The first implementation uses defense in depth:

1. exact same-origin POST validation
2. 16 KiB raw body ceiling
3. server-side field validation and normalization
4. hidden honeypot
5. Netlify Edge rate limit for `/api/contact`
6. disabled submit button while a request is pending

The client-side pending state is only a UX duplicate-submit guard. It is not a durable
idempotency guarantee. Durable idempotency can be added later if delivery retries or queueing
make it necessary.

## Preview / Production behavior

### Deploy Preview / Branch Deploy

The delivery adapter returns a Preview acceptance result and sends **no real email**.
This lets Playwright exercise success UX without contacting a real recipient.

Deploy Preview also depends on the dedicated `ivmz-home-preview` Supabase project because the
Netlify build runs the preview-database assertion and migrations before `next build`. If the
project has auto-paused, restore it and wait for `ACTIVE_HEALTHY` before creating the final
validation commit. Do not bypass `scripts/assert-preview-database.mjs`, and never point a
Deploy Preview at the Production database to make validation pass.

### Production

Production fails closed with `503 delivery_unavailable` until a real delivery provider is
configured. The UI retains the submitted values on failure and keeps direct `mailto:`
fallbacks visible.

Do not change this fail-closed behavior merely to make Production appear complete.

## AWS SES account evidence — 2026-09-26

Read-only `GetAccount` / `ListEmailIdentities` checks were performed for:

- `ap-northeast-1`
- `us-east-2`
- `us-east-1`
- `us-west-2`

All four returned:

- `ProductionAccessEnabled=false`
- `SendingEnabled=true`
- `EnforcementStatus=HEALTHY`
- sandbox quota: 200 messages / 24 hours
- maximum rate: 1 message / second
- zero SES identities

Tokyo also reported the current SES pricing plan as `ESSENTIALS`.

AWS documents that sandbox state is Region-specific and permits sending only to verified
recipients/domains until production access is approved.

## Region decision

**Candidate: `us-east-2` (Ohio).**

Reason:

- current Netlify Functions deployment is in `cmh` (Columbus)
- SES API availability was verified in `us-east-2`
- keeping application execution and outbound API calls geographically close reduces avoidable
  cross-region latency

This is a deployment choice, not an inbound-mail migration. Cloudflare Email Routing / the
currently working inbound path and MX records remain unchanged.

## SES identity design

Before enabling Production delivery:

1. create an SES domain identity for `ivrm.jp` in `us-east-2`
2. enable Easy DKIM and publish the SES-provided DNS records
3. verify the identity before requesting Production access
4. keep the existing MX records unchanged
5. use a region-specific custom MAIL FROM candidate such as
   `bounce-us-east-2.ivrm.jp` only after checking existing DNS and DMARC alignment
6. do not weaken an existing DMARC policy merely to make SES setup pass

AWS recommends Easy DKIM as the primary authentication path and describes custom MAIL FROM
as an additive SPF/DMARC-alignment option.

## Credentials

Repository code, Issues, PRs, docs, screenshots, and client bundles must never contain AWS
credentials.

The final SES adapter should receive credentials only from Production-scoped Netlify secret
configuration or a workload-identity mechanism. Preview must not receive credentials that can
send to real recipients.

Least privilege for the runtime sender should be limited to the SES send action(s) required by
the chosen SDK/API and the verified sending identity. Do not grant broad SES administration
permissions to the website runtime.

## Bounce / complaint handling

The current SES account has account-level suppression reasons for both `BOUNCE` and
`COMPLAINT`.

Before real sending acceptance:

- create a configuration set used by every contact-form send
- publish delivery / bounce / complaint / reject events to a monitored destination
- prefer SNS/event publishing over relying only on feedback-forwarding email
- document who receives alerts and how repeated failures are handled
- test with SES mailbox simulator where applicable before sending acceptance mail

AWS documentation requires a bounce/complaint notification path and notes that event
publishing requires applying the configuration set to the send.

## Cost note

The AWS SES pricing page currently lists the Essentials plan at **USD 0.16 per 1,000 emails**
for the first 10 million emails/month, with tiered rates above that volume. Pricing can change;
re-check the official pricing page before Production activation.

For this personal contact-form volume, abuse prevention and operational safety are more
material than per-message SES cost.

## Production enablement gate

Do not switch `createContactDelivery()` to SES until all of these are true:

- [ ] `ivrm.jp` SES identity verified in the selected Region
- [ ] Easy DKIM verified
- [ ] current DMARC/SPF records reviewed
- [ ] custom MAIL FROM decision recorded
- [ ] SES Production access approved
- [ ] runtime authentication uses least privilege
- [ ] Preview has no real-send credentials
- [ ] bounce / complaint event path exists
- [ ] SES adapter unit tests pass
- [ ] Deploy Preview still performs no real send
- [ ] one controlled Production acceptance email succeeds
- [ ] SPF / DKIM / DMARC results are checked on the received message
- [ ] existing inbound routing still works

## Official references

- Amazon SES sandbox / Production access:
  https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- DMARC with SES:
  https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html
- SES sending notifications:
  https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-using-notifications.html
- SES pricing:
  https://aws.amazon.com/ses/pricing/
