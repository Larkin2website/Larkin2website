# Portable Resend email setup

For the selected hosting destination, start with the
[Render Deployment Runbook](render-deployment.md). Add all real key values only
after migration on the client-owned host. The Render proposal starts with
`EMAIL_WORKERS_ENABLED=false`; enable workers explicitly for approved monitoring
and recovery tests, while keeping subscriber publication mode off until its
separate launch approval. Replit environment defaults are not destination settings.

All application email now uses the server-only direct Resend API. It does not need
Replit's connector, and it never falls back to that connector when configuration
is absent. This covers enquiries, subscription verification codes, publication
notifications, and CRM sample/controlled tests.

## Configure once, then move by changing runtime values

1. Deploy this code once. For local use, copy the repository-root `.env.example`
   to repository-root `.env` and fill in approved values privately. Real `.env`
   files are ignored by Git and excluded from Replit deployment uploads.
2. On Replit, enter credentials through the project Secrets tool and ordinary
   configuration through environment settings. On Render or another host, use
   its backend environment/secret settings. A physical `.env` is not required.
3. The API entrypoint loads an optional repository-root `.env` **before** app,
   database, and email modules. This works whether started from repository root
   or the API package. Already-injected environment variables take precedence,
   including empty injected values. This loader applies to API startup, not
   unrelated scripts/tests/frontends. Node 24 is the project's supported runtime.
4. After changing settings, restart the backend. No email source changes or
   recompilation are needed. A host may call a restart/release a “redeploy”; that
   is not a requirement to rebuild the email integration.

Example local commands from repository root, after existing database/auth/PORT
configuration is available:

```sh
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

Build once after installing dependencies or changing source. After changing only
runtime email values, stop and run `start` again, not `build`. The production
equivalent is `node --enable-source-maps artifacts/api-server/dist/index.mjs`.
Existing database/auth requirements remain: the email example alone is not a
complete deployment environment.

## Runtime settings

| Name | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Server-only API key from the destination Resend account |
| `RESEND_ACCOUNT_ID` | Required stable non-secret team/account label; retain on key rotation, change only after reconciling attempted sends on account migration |
| `RESEND_WEBHOOK_SECRET` | Server-only signing secret for the registered destination webhook |
| `CONTACT_ENQUIRY_FROM` | Explicit approved bare sender email; required for enquiries |
| `CONTACT_ENQUIRY_TO` | Bare enquiry recipient email; omitted defaults to the approved `admin@HETVopportunities.com`; explicitly blank/invalid is rejected |
| `SUBSCRIPTION_VERIFICATION_FROM` | Explicit approved sender, bare email or `Name <email>`; no developer-domain default |
| `PUBLICATION_EMAIL_FROM` | Explicit approved sender, bare email or `Name <email>` |
| `PUBLIC_OPPORTUNITIES_URL` | HTTPS public site root **including** `/larkin2-opportunities/` while that prefix is used |
| `PUBLICATION_TEST_EMAIL` | The one approved mailbox for CRM controlled tests |
| `EMAIL_ADMIN_FROM` | Explicit approved warning sender; no warning emails without it |
| `EMAIL_ADMIN_TO` | Validated warning recipient; omitted defaults to the existing approved admin mailbox |
| `EMAIL_WARNING_PERCENT` | Early-warning threshold; defaults to 80% |
| `EMAIL_ADMIN_RESERVE` | Recipient slots protected for admin warnings; defaults to 1 |
| `EMAIL_TRANSACTIONAL_RESERVE` | Additional slots protected from publications/tests for enquiries and codes; defaults to 5 |
| `PUBLICATION_EMAIL_MODE` | `off` by default; `live` is necessary but not sufficient for subscriber alerts |
| `PUBLICATION_EMAIL_APPROVED` | Must be `true` only after explicit approval for live publication delivery |
| `PUBLICATION_ALERTS_ACTIVATED_AT` | Exact approved ISO activation cutoff; prevents automatic sending of older batches |
| `SESSION_SECRET` | Existing subscription verification signing secret; transfer securely or deliberately expire in-flight verification codes |

Private values must never be added to `VITE_*` settings, browser bundles, tracked
files, screenshots, or logs. Publication sender/recipient/URL settings are server
runtime values, not Vite build settings. Staff invitation/recovery settings
`STAFF_AUTH_FROM` and `STAFF_AUTH_ORIGIN` are also server runtime values; see
[staff authentication](staff-authentication.md). Database restoration, hostnames,
DNS and actual sender verification still require destination acceptance.

## Sender verification and key permissions

Verify the sending domains in the **destination Resend account** and install the
DNS records supplied by Resend. Domain verification, mailbox readiness, and
sender approval are separate checks. Do not substitute an unapproved sender.

The contact transport retains its `GET /domains` preflight and five-minute cache
of successful sender-domain verification. The shared key therefore needs domain/usage
read permission **and** email sending permission; a Resend sending-only key
cannot satisfy this preflight. Use the account's appropriate Full access key for
the current implementation, protect it only on the server, and rotate it
according to client policy. A 403 must be fixed through approved permissions,
not by disabling verification. If a large domain list spans pages, ensure the
sender is present in the returned list before testing; the current preflight
does not paginate and fails closed if it cannot find the domain.

Enquiries preserve the visitor as Reply-To, not From; accepted messages require a
provider reference. Publication idempotency keys, bounded retries, expiry cutoff,
consent checks, demo restrictions, and webhook signature checks remain in place.
API failures/timeouts are sanitized and are not reported as successful delivery.
Subscription verification deliberately gives the same neutral response even
when configuration/provider delivery is unavailable, to protect subscriber
privacy. Check server warnings and an approved inbox to verify actual delivery.

## Controlled testing, then live approval

Automated tests mock provider calls; no credentials or real messages are needed.
To perform a real check, first obtain explicit approval for sender and test
mailbox. Populate runtime settings privately, restart the API, and use CRM
Communications **Send sample test**. It does not send the subscriber queue.
Confirm both Resend acceptance and inbox/spam receipt, then test a deliberately
approved enquiry and verification request. Do not use real subscriber addresses
without permission.

The publication `off` setting disables subscriber publication delivery only.
Configured contact and verification flows can still send when called. For
staging with restored production data, omit the sending key unless conducting
specifically approved controlled tests; do not expose public staging endpoints
with live credentials and assume publication mode blocks every email flow.

Adding an API key does not authorize a subscriber campaign. Keep live controls
off until approval, a matching audit, and an agreed activation timestamp. Do not
change the existing demo/login policy as part of email setup.

## Webhooks and moving hosts/accounts

1. Configure the same runtime setting names on the new backend, with the intended
   Resend account's credentials, verified senders, enquiry recipient, and new
   canonical public URL.
2. Register the approved backend origin plus `/api/webhooks/resend` in Resend.
   Store **that endpoint's** signing secret as `RESEND_WEBHOOK_SECRET`. Keep raw
   JSON bytes available for verification. Never put private links/tokens in logs.
3. Coordinate in-flight delivery events and old/new endpoints. Do not assume a
   new Resend account can report events for mail accepted by the old account.
4. Restart, conduct approved test sends, and verify signed delivered/bounce/
   complaint callbacks. An unsigned request should receive 401; an unconfigured
   signing secret yields 503, not fake acceptance.
5. Keep the old publication worker disabled before enabling the destination.
   Preserve the existing delivery records, deduplication references, unsubscribe
   state, and public preference links during database/domain migration.

No email rewrite or rebuild is needed for these runtime changes. DNS, webhook
registration, account permissions, the initial code deployment, and other
application migration work still need to be completed separately.

## Free quotas and operational limits

Resend's currently documented free transactional allowance is 100 emails/day
**and** 3,000/month; recheck https://resend.com/pricing before launch. Every
recipient counts, and enquiries, verification, tests, and publications share
the allowance. API rate limits still apply even on a paid plan.

Shared persistent quota protection now reconciles Resend account usage before
sending. Subscriber publications defer safely instead of exhausting ordinary
retries on a known quota/configuration wait. The CRM shows persistent warnings
and blocked-send dialogs; an approved admin warning sender can send an early
warning within a reserved slot. See [Email Delivery Operations](email-delivery-operations.md)
for the reserve, reset, upgrade, synchronization and uncertain-acceptance rules.

Other applications sharing the Resend account can still concurrently consume
the allowance. Provider rejection is the final authority. No plan is purchased
or upgraded automatically.

## Verification performed

Unit/API checks cover direct Authorization, runtime key changes, sender and
recipient validation, missing credentials, timeout and rejection sanitization,
provider acceptance, all three email paths, idempotency, optional `.env` loading
and host precedence. Existing subscription-privacy and webhook tests are retained.
Real provider delivery, sender DNS, and production credentials require a separate
approved configuration/test; they are not claimed by passing mocked tests.

**Current handover status:** Quota controls, warning UI and automated checks are
implemented. The user will add all key values only after migration away from
Replit, through the destination host's server-side environment/secret settings.
Do not request destination credentials in Replit. Live verification of credentials,
account ID, approved senders, signed webhooks and actual test receipt will follow
on that host before subscriber campaigns are enabled. Passing automated tests
does not satisfy that post-migration acceptance gate.
