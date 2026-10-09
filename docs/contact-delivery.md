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

Production stores every valid submission in the CMS inbox (`/admin` → Inbox) and returns success.
See [CMS inbox and email notification](#cms-inbox-and-email-notification-production) below.

- With the five `CONTACT_*` variables unset, the submission is stored and `notification` is
  `skipped`; there is no email. **Monitor the Inbox** until SES is enabled.
- If the database is unavailable, or the migration has not been applied, the route returns a
  generic failure (`502`). The UI retains the submitted values and keeps direct `mailto:`
  fallbacks visible.
- Production never returns `503 delivery_unavailable` for a configured deployment. That response
  remains only when the runtime context is unexpectedly missing (fail closed).

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

At the time of the initial read-only check, all four Regions had zero SES identities.
After selecting `us-east-2`, an `ivrm.jp` DOMAIN identity was created there with Easy DKIM
enabled. Its current state is:

- identity verification: `PENDING`
- verified for sending: `false`
- Easy DKIM: `PENDING`
- DKIM key length: RSA 2048-bit
- custom MAIL FROM: not configured
- Production access: still `false`

Tokyo also reported the current SES pricing plan as `ESSENTIALS`.

AWS documents that sandbox state is Region-specific and permits sending only to verified
recipients/domains until production access is approved.

## Region decision

**Selected: `us-east-2` (Ohio).**

Reason:

- current Netlify Functions deployment is in `cmh` (Columbus)
- SES API availability was verified in `us-east-2`
- keeping application execution and outbound API calls geographically close reduces avoidable
  cross-region latency

This is a deployment choice, not an inbound-mail migration. Cloudflare Email Routing / the
currently working inbound path and MX records remain unchanged.

## SES identity design

Before enabling Production delivery:

1. [x] create an SES domain identity for `ivrm.jp` in `us-east-2`
2. [ ] publish the three SES-provided Easy DKIM CNAME records
3. [ ] wait for identity / Easy DKIM verification
4. [ ] request Production access only after domain verification
5. [x] keep the existing MX records unchanged
6. [ ] use a region-specific custom MAIL FROM candidate such as
   `bounce-us-east-2.ivrm.jp` only after checking existing DNS and DMARC alignment
7. [ ] do not weaken an existing DMARC policy merely to make SES setup pass

Creating the SES identity itself did not change DNS or inbound routing. If this SES path is
abandoned before Production use, rollback is to remove any SES-specific DKIM / MAIL FROM DNS
records that were added and then delete the `ivrm.jp` SES identity in `us-east-2`.

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

## CMS inbox and email notification (Production)

Production no longer fails closed. `/api/contact` now treats the **Payload CMS inbox as the
source of truth** and email as a best-effort notification.

```text
validated submission
  -> save to `contact-submissions` (Payload Local API, overrideAccess)   -- failure => 502
  -> if CONTACT_* SES variables are present: send notification email    -- failure => stored anyway
  -> mark `notification` = sent | failed | unknown | skipped
```

- Deploy Preview / Branch Deploy are unchanged: validation-only, nothing is stored or sent.
- The collection has `create: false`; only the server route creates records. Reading, triage
  (`status`, `internalNote`) and deletion require an authenticated Payload user (`/admin` → Inbox).
- `notification = skipped` means SES is not configured yet. The submission is still in the inbox.
- `notification = unknown` means the send exceeded its time budget and the request was aborted; SES
  may or may not have accepted it, so check the mailbox before assuming it was not sent.
- Email never makes an already-stored submission fail; failures log only `requestId`, notifier
  kind and error class (no address or body).

### Attachments

File attachments (malware-scanned, admin-configurable) are documented in
[`contact-attachments.md`](./contact-attachments.md). They are off until configured.

### Retry safety (idempotency)

The form generates a `requestId` (UUID) per submission and reuses it when the same content is
retried after a failure; editing any field starts a new one. The server stores with a unique
`requestId` and treats an already-stored id as success (no second record, no second email). This
covers a save that finishes after the route has already answered 504 — a visitor retry does not
create a duplicate. A malformed or missing id is ignored and a server-side id is generated.

### Enabling the email notification

Set all of these in the Netlify **Production** environment (they are intentionally not `AWS_*`,
which Netlify reserves). Until all five exist the notifier stays disabled.

| Variable | Example |
| --- | --- |
| `CONTACT_SES_REGION` | `us-east-2` |
| `CONTACT_SES_ACCESS_KEY_ID` | IAM user limited to `ses:SendEmail` on the `ivrm.jp` identity |
| `CONTACT_SES_SECRET_ACCESS_KEY` | secret for the same IAM user |
| `CONTACT_FROM_EMAIL` | an address on the verified `ivrm.jp` identity |
| `CONTACT_SES_CONFIGURATION_SET` | SES configuration set with event publishing, so delivery / bounce / complaint events reach the monitored destination |

Email additionally requires SES production access (sandbox only delivers to verified addresses).
The visitor's address is only ever used as `Reply-To`.

### Production release gate for this change

This change adds a table. Per `docs/database-runtime.md` Production migration is a separate
release step, **not** part of the build:

1. Back up the Production database.
2. Review `src/migrations/*_contact_submissions.ts` (additive: new table/enums plus a nullable
   column on `payload_locked_documents_rels`).
3. Run `pnpm db:migrate` against Production.
4. Deploy the same revision from `main`.
5. Submit a test message and confirm it appears in `/admin` → Inbox.

If the code is deployed before step 3, submissions return a generic failure (502) and nothing is
lost silently.
