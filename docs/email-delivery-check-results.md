# Controlled live email check

## Scope and status

The owner authorised enabling campaigns and sending controlled service tests to
the developer mailbox, plus one message to the administrator mailbox.

Resend independently confirmed `hetvopportunities.com` as verified. Its usage API
confirmed limits of 100 daily / 3,000 monthly, with zero used before this check.
All nine controlled messages were accepted by Resend through the application's
direct transport and persistent shared-quota controls. Acceptance is not inbox
receipt or webhook confirmation.

After the run, the provider confirmed 9 used / 91 remaining daily and 9 used /
2,991 remaining monthly. The unconfigured webhook correctly returned HTTP 503,
not false acceptance. The API restarted successfully, and backend type checking
passed.

The campaign, outbox, and staff-mail queues were inspected before activation:
all were empty. No subscribers, staff accounts, access grants, or publications
were created by the smoke check.

## Acceptance references

| Service | Provider reference |
| --- | --- |
| Contact enquiry | `01a1c671-1842-7bf2-98f5-f60b4cb1dd48` |
| Subscriber verification | `01a1c671-1d60-7043-a2d5-397d76999ec4` |
| Role publication | `01a1c671-2259-7aa6-bbe1-fac19f1f6d5a` |
| Programme publication | `01a1c671-2794-7758-ba0f-ae55b37b341e` |
| CRM publication sample | `01a1c671-2c7f-712e-95e9-eb1fca682c02` |
| Staff invitation sample | `01a1c671-316a-75c7-9122-b2d1954d33a9` |
| Staff password reset sample | `01a1c671-3675-7d63-9a4d-cbd7ca258583` |
| Quota warning sample | `01a1c671-3b65-7eb8-ae68-08a98c743012` |
| Administrator mailbox check | `01a1c671-403b-7881-b1ff-f605fba923a5` |

The first eight went only to the configured developer test mailbox. The last went
only to the administrator mailbox. All subjects have a `[TEST ...]` prefix.

Enquiry, verification, role/programme, and CRM publication checks use their real
application rendering/transport helpers. The verification code has no stored
challenge. Staff invitation/reset messages are inert delivery samples without
authentication links; the quota warning is simulated, not an actual exhaustion
event. These samples do **not** prove account activation/reset, subscriber
preference changes, or the quota-warning trigger end to end.

## Unfinished checks and activation

- Inbox/spam receipt: waiting for owner confirmation.
- Signed provider callbacks: **blocked** because `RESEND_WEBHOOK_SECRET` is absent.
  Mail receipt cannot substitute for a signed callback.
- There is no published deployment currently registered. The running development
  endpoint is temporary and must be accessible to Resend before testing callbacks.
  Do not call it a permanent production endpoint.
- Register `/api/webhooks/resend` on the intended externally reachable host for
  `email.delivered`, `email.bounced`, and `email.complained`; save that endpoint's
  signing secret securely as `RESEND_WEBHOOK_SECRET` and restart the API.
- Verify an actual signed delivered event and its recorded provider reference,
  unsigned rejection, and bounce/complaint handling using safe test fixtures.
- Live campaign approval has been given, but activation is held until callback
  verification is configured. Set a fresh `PUBLICATION_ALERTS_ACTIVATED_AT`
  cutoff on activation to exclude older batches, then enable the approved live
  mode and workers. Do not start both source and destination workers.
- Staff mail additionally requires a valid canonical `STAFF_AUTH_ORIGIN`; this
  setting was absent during the smoke check. A sample delivery does not prove
  that real invitation links can yet be generated.

## Reusable bounded operator check

`artifacts/api-server/src/commands/test-email-services.ts` is never loaded at API
startup. It sends exactly eight developer samples and one administrator sample,
using runtime `PUBLICATION_TEST_EMAIL` and `EMAIL_ADMIN_TO`.

After explicit recipient approval, invoke from repository root:

```sh
APPROVE_EMAIL_SMOKE_TEST=true pnpm --filter @workspace/api-server exec tsx \
  src/commands/test-email-services.ts YOUR_UNIQUE_RUN_LABEL
```

This consumes nine recipient slots. It requires verified configured sender
domains, a healthy provider allowance, and an HTTPS public site URL. Use the same
label only when investigating a partial run within the provider idempotency
window; never retry uncertain acceptance blindly or use a new label to evade a
held reservation. It does not enable workers or campaigns.

See [Resend key setup](resend-key-setup.md) and
[email delivery operations](email-delivery-operations.md).
