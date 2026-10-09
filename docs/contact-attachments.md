# Contact form attachments

Visitors can attach files to a contact message. Nothing is trusted until a **managed malware scan**
and our own **content checks** both pass, and the CMS decides which sizes/types are allowed (within
hard limits that live in code).

Status: implemented behind a switch. **Off by default.** It does nothing until the AWS resources
exist, the `CONTACT_ATTACH_*` variables are set, the migration is applied and an admin enables it.

## Flow

```text
browser                       Next.js (Netlify)                        AWS
-------                       -----------------                        ---
1 pick file ──────────────►  POST /api/contact/attachments
  (client pre-check)          validate name/type/size vs CMS policy
                              sign upload token, presign POST ──────►  (S3 presigned POST)
2 upload directly ─────────────────────────────────────────────────►  S3  quarantine/<uuid>
                                                                        └─ GuardDuty Malware
                                                                           Protection scans it and
                                                                           tags the object
3 poll (≈ every 2s) ──────►  POST /api/contact/attachments/finalize
                              GetObjectTagging
                              pending  → "scanning"
                              threat   → delete + reject
                              clean    → read bytes, verify content,
                                         copy to clean/<uuid>, delete quarantine ─► S3 clean/<uuid>
                              return signed attachment token
4 submit message ─────────►  POST /api/contact  { …, attachments:[tokens] }
                              verify tokens + policy + object exists
                              store references in the CMS inbox
```

Why this shape:

- **Nothing unscanned is ever attachable.** The attachment token (HMAC-signed, 1 h) is issued only
  after both checks pass, and `/api/contact` accepts only those tokens. A client cannot attach an
  arbitrary key or another visitor's file.
- **We do not write our own antivirus.** Detection is delegated to AWS GuardDuty Malware Protection
  for S3 (signatures/ML maintained by AWS, no servers to run). Our code adds *structural* checks.
- **Files never touch the app server on upload** (browser → S3 directly), so large uploads do not
  consume function time, and S3 itself enforces the exact size and content type.
- **Stateless.** Tokens are signed with a key derived from `PAYLOAD_SECRET`; no extra DB table for
  in-flight uploads.

## Content checks (after the scanner says clean)

| Kind | Checks |
| --- | --- |
| Images (PNG/JPEG/WebP) | magic bytes; **re-encoded** with `sharp` (drops metadata, trailing data, polyglots); pixel cap |
| PDF | `%PDF-` header; rejects `/JavaScript`, `/JS`, `/Launch`, `/OpenAction`, `/EmbeddedFile`, `/RichMedia`, `/XFA`, `/AA`, `/SubmitForm`, `/ImportData` |
| Text (txt/md/csv) | valid UTF-8, no NUL bytes |
| Office (docx/xlsx/pptx) | ZIP central-directory parse only (never extracted); rejects macros (`vbaProject.bin`, macro-enabled content types), ActiveX, `embeddings/`, external templates/OLE relationships, encrypted/zip64 archives, path tricks and zip-bomb ratios; main part must match the declared type |
| All | declared extension **and** MIME must match one vetted type; double extensions like `x.exe.pdf` refused; display name sanitised (bidi/control chars stripped); storage key is a server-generated UUID |

PDF checks are defence in depth only (object streams can hide names); the malware scan is the
primary control. Legacy binary Office formats (`.doc/.xls/.ppt`), macro-enabled formats, archives
and executables are **not** in the catalog and cannot be enabled from the CMS.

## What admins can configure (CMS → Inbox → Contact settings)

| Setting | Range | Default |
| --- | --- | --- |
| Allow file attachments | on/off | **off** |
| Max size per file | 1–20 MB | 5 MB |
| Max number of files | 1–5 | 3 |
| Max total size | 1–50 MB | 15 MB |
| Allowed file types | choose from the vetted catalog | PNG, JPEG, WebP, PDF |

Values are clamped by the server to the hard limits in `src/contact/attachments/catalog.ts`, and
unknown type ids are ignored, so a CMS mistake can never widen what is accepted beyond the code.
Changes apply immediately (settings are read per request). Turning a type off also invalidates
already-issued tokens for that type.

## Where files end up

`contact-submissions.attachments[]` holds `{ filename, key, size, contentType, sha256 }` (read-only,
not editable via API). The bytes stay in the private bucket under `clean/`.

Admins open a file from the inbox row's **download path**
(`/api/contact/attachments/download?row=<id>`): it requires an authenticated Payload user, then
redirects to a **60-second** presigned URL forced to `Content-Disposition: attachment` and
`application/octet-stream`, so browsers never render or execute it. Attachments are **not** attached to the
notification email (it only states the count).

## Setup checklist

1. **AWS** — review and apply `infra/contact-attachments/` (private bucket, TLS-only policy, CORS,
   lifecycle, GuardDuty Malware Protection plan for `quarantine/`, least-privilege IAM user).
   It has not been applied or `terraform validate`d from this repository: review it first.
2. Create an access key for the IAM user **out-of-band** and put it only in Netlify.
3. Netlify (Production, optionally Preview) environment variables — all four required:
   `CONTACT_ATTACH_BUCKET`, `CONTACT_ATTACH_REGION`, `CONTACT_ATTACH_ACCESS_KEY_ID`,
   `CONTACT_ATTACH_SECRET_ACCESS_KEY` (not `AWS_*`, which Netlify reserves). They are also read at
   build time to add the bucket origin to the (Report-Only) CSP `connect-src`.
4. **Database** — apply `*_contact_attachments` migration (release gate in
   `docs/database-runtime.md`: backup → review → `pnpm db:migrate` → deploy). It is additive.
5. In `/admin` → Inbox → **Contact settings**, tick *Allow file attachments* and pick the types.
6. Submit a test message with a harmless file; then the EICAR test string (as `.pdf`/`.txt`) must be
   rejected as *malware detected*.

Until steps 1–5 are done the form simply shows no file picker.

## Operations

- **Scan latency** is usually seconds; the browser polls for up to 2 minutes, then asks the visitor
  to retry. Objects stuck in `quarantine/` expire after 1 day (lifecycle rule).
- **Infected / failed scans** delete the quarantine object and report a generic reason to the
  visitor. Check GuardDuty findings for repeated attempts.
- **Retention**: `clean/` objects expire after 90 days by default (`clean_retention_days`). The
  inbox row keeps the reference, so a download after expiry returns 404/503; export what you need.
- **Rate limits**: `/api/contact/attachments*` is limited to 120 requests/minute/IP at the edge.
- **Rotating the secret**: changing `PAYLOAD_SECRET` invalidates in-flight tokens (visitors re-upload).

## Local / Preview behaviour

Without the `CONTACT_ATTACH_*` variables there is no storage, the policy endpoint reports
`enabled: false` and the picker is hidden (the default for local dev and Deploy Previews). The
Playwright spec `tests/e2e/contact-attachments.spec.ts` mocks the whole pipeline, so it runs against
any deployment without AWS.

## Threats considered

| Threat | Mitigation |
| --- | --- |
| Malware in an upload | managed scan before attach; unscanned/failed/unsupported results are never clean |
| Type spoofing (`.exe` renamed, polyglots) | extension + MIME + magic-byte agreement; images re-encoded |
| Macro/active documents | Office macro/embedding/external-reference rejection; PDF active-content rejection |
| Zip bombs / archive tricks | central-directory-only parsing with entry/size/ratio limits |
| Path or name tricks | UUID keys; sanitised display names; bidi/control stripping |
| Oversized uploads | S3-enforced exact `content-length-range`; server size re-check; CMS limits clamped |
| Attaching someone else's/arbitrary object | HMAC-signed tokens bound to id/key/size/hash; `clean/` prefix only |
| Public exposure of files | private bucket, public-access block, no public URLs; admin-only 60 s presigned download |
| Swapping a scanned object for an unscanned one (the presigned POST stays valid for 15 min) | the scan tag is re-checked after the bytes are read; a replaced object has no tag and is rejected; promotion uses the bytes we verified, never a re-read |
| Abuse / scan cost (GuardDuty bills per GB scanned) | exact-size presigns, attachments off by default (no edge rate limit yet: see "Known gap" note), 1-day quarantine expiry; add an AWS Budgets alert for GuardDuty/S3 |
| Admin mis-configuration | hard ceilings and a vetted type catalog in code |

## Known gap: edge rate limit for the attachment endpoints

A dedicated Netlify rate-limit edge function for `/api/contact/attachments*` was removed from this change:
with it deployed, the preview smoke check for the Payload login rate limit (`/api/users/login`) stopped
returning 429 on three consecutive runs. Until that is understood, enable attachments only after adding
a rate limit for these paths (e.g. a Netlify/WAF rule or an in-app limiter) and an AWS Budgets alert.
