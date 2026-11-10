# Controlled live email check

## Scope and status

The owner authorised enabling campaigns and sending controlled service tests to
the developer mailbox, plus one message to the administrator mailbox.

Resend independently confirmed `hetvopportunities.com` as verified. Its usage API
confirmed limits of 100 daily / 3,000 monthly, with zero used before this check.
All nine controlled messages were accepted by Resend through the application's
direct transport and persistent shared-quota controls. A subsequent read of each
provider message confirmed `last_event: delivered` for all nine. This means the
recipient mail server accepted them, not that the owner has confirmed inbox
placement or that the application received the signed callbacks.

After the run, the provider confirmed 9 used / 91 remaining daily and 9 used /
2,991 remaining monthly. The unconfigured webhook correctly returned HTTP 503,
not false acceptance. The API restarted successfully, and backend type checking
passed.

After saving the webhook secret, one additional controlled developer-mailbox
message was sent with reference `01a1c67e-5c7f-78a3-8187-62e1c509f769`. Resend
also reports this message as delivered. No additional administrator test was sent.
The API now correctly returns HTTP 401 for an unsigned callback.

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

## Temporary public preview activation — 10 November 2026 UTC

- The owner approved a temporary public preview. An independent external fetch
  of `/api/healthz` subsequently returned `{"status":"ok"}` rather than the Replit
  login page. This removed the earlier private-preview blocker.
- A fresh controlled developer-mailbox test was accepted with reference
  `01a1c682-b588-726c-904d-2638ffe4bd02`. The application's provider-event table
  recorded its real, signature-verified `email.delivered` event at
  `2026-11-10T17:30:20.099Z`. This is a real provider callback, not a locally
  fabricated signature fixture.
- `RESEND_WEBHOOK_SECRET` is saved. Unsigned callbacks return HTTP 401.
- The existing Resend webhook was updated to subscribe to all three consumed
  events: `email.delivered`, `email.bounced`, and `email.complained`. Its endpoint
  was left unchanged; its signing secret was not rotated.
- Campaigns and background email workers are now enabled on the current preview.
  Activation cutoff: **`2026-11-10T17:30:54.952Z`**. Only eligible batches created
  on or after this cutoff can send; older batches are excluded.
- Before activation, campaign, outbox and staff-mail queues were empty. The
  post-activation outbox was also empty; no bulk campaign was triggered as a test.
- `STAFF_AUTH_ORIGIN` now points to the current preview origin, and
  `PUBLIC_OPPORTUNITIES_URL` points to its `/larkin2-opportunities/` prefix.
  Staff/password and public preference links no longer target the old custom host
  for this preview's runtime.
- Runtime flags: `EMAIL_WORKERS_ENABLED=true`, `PUBLICATION_EMAIL_MODE=live`,
  `PUBLICATION_EMAIL_APPROVED=true`. The quota monitor and staff worker also run.
- API readiness returned HTTP 200 and workers started without reported errors.
  Provider allowance after all 11 tests: **89 daily / 2,989 monthly remaining**.
- Preview access remains temporary and public; staff pages still require
  application authentication. A development workflow is not an always-on
  production host and can stop when the workspace sleeps.

## Remaining checks and Render handover

- Inbox/spam placement is still waiting for the owner's confirmation. The two
  callback-verification tests were additional developer-mailbox messages, making
  ten developer tests and one administrator test overall.
- Actual provider delivery was verified; actual bounce/complaint events were not
  deliberately generated. Their subscriptions are configured, and local
  signature/parser/suppression regression coverage is separate evidence.
- Inert staff invitation/reset samples do not establish real-account acceptance.
  Complete the deliberate first-administrator and staff lifecycle acceptance on
  the destination without treating delivery samples as staff access.
- There is no permanent published deployment established by this preview check.
  For Render, replace both origin/URL values with the approved Render/custom host,
  register its `/api/webhooks/resend` endpoint, and privately save that endpoint's
  secret. Preview environment values do not transfer automatically.
- Disable source workers before starting destination workers. Preserve the
  approved cutoff and delivery/deduplication state unless a separately approved
  campaign reconciliation changes them; do not silently reset the cutoff and
  discard pending work. Keep Render's safe worker/campaign defaults until its
  own callback and migration acceptance checks pass.
- When preview testing ends, either keep the one intended sender operational or
  pause the preview workers/campaigns before restoring private preview access.
  Private preview blocks Resend callbacks; it does not stop outbound workers.

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
