# Contact email (SES) setup runbook

What it turns on: an owner notification to the category mailbox **and** a receipt email to the visitor.
Until it is configured, submissions are stored in the CMS Inbox with `notification = skipped`.

The receipt email contains only fixed text and the receipt id; nothing the visitor typed is echoed.
Set `CONTACT_AUTOREPLY=off` to send the owner notification only.

## 1. SES identity (region `us-east-2`)

1. SES → Identities: `ivrm.jp` (already created; see `contact-delivery.md`). It must show **Verified**.
2. Publish the three Easy DKIM CNAME records in DNS. Do not weaken an existing DMARC policy.
3. Recommended: custom MAIL FROM domain (e.g. `mail.ivrm.jp`) with its MX and SPF TXT records.
4. Create a configuration set `ivmz-contact` with an event destination (bounce / complaint / delivery).
   `CONTACT_SES_CONFIGURATION_SET` is mandatory: the notifier stays off without it.

## 2. Production access (leave the sandbox)

In the sandbox SES can only send to verified addresses, which breaks the visitor receipt.
SES → Account dashboard → **Request production access**:

- Mail type: *Transactional*
- Website URL: `https://ivmz.ivrm.jp`
- Use case (example): "Contact form on a personal site. Each submission sends one notification to the
  site owner and one receipt to the person who submitted the form. About 10 messages per month. Sending
  rate is limited by a rate limit on the form, and bounces / complaints are tracked through a
  configuration set event destination."
- Acknowledge the bounce/complaint handling requirement.

Approval usually takes about a day.

## 3. Least-privilege IAM user for the runtime

Create an IAM user (no console access) with only this policy, then an access key:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail"],
      "Resource": [
        "arn:aws:ses:us-east-2:<ACCOUNT_ID>:identity/ivrm.jp",
        "arn:aws:ses:us-east-2:<ACCOUNT_ID>:configuration-set/ivmz-contact"
      ],
      "Condition": { "StringEquals": { "ses:FromAddress": "ivmz@ivrm.jp" } }
    }
  ]
}
```

## 4. Netlify environment variables (Production scope only, secrets)

| Variable | Value |
| --- | --- |
| `CONTACT_SES_REGION` | `us-east-2` |
| `CONTACT_SES_ACCESS_KEY_ID` | the IAM user's key id |
| `CONTACT_SES_SECRET_ACCESS_KEY` | the IAM user's secret (mark as secret) |
| `CONTACT_SES_CONFIGURATION_SET` | `ivmz-contact` |
| `CONTACT_FROM_EMAIL` | `ivmz@ivrm.jp` (must belong to the verified identity) |
| `CONTACT_AUTOREPLY` | optional; `off` disables the visitor receipt |

Do not set them for Deploy Previews: previews never send email.
After saving, trigger a new production deploy (env changes apply on the next build).

## 5. Verify

1. Submit a test from `https://ivmz.ivrm.jp/contact` with your own address.
2. Expect: the review screen, then success; a record in `/admin` → Inbox with `notification = sent`;
   the owner mail at the category mailbox; the receipt mail at your address.
3. `notification = failed` / `unknown` → check Netlify function logs for `CONTACT_NOTIFY_FAILED`
   (`CONTACT_ACK_FAILED` means only the visitor receipt failed).
4. Check the SES console for bounces / complaints after the first sends.
