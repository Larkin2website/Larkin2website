# Email delivery, quota protection and admin warnings

## Status and ownership

The software uses the client's direct Resend API settings, not a mandatory Replit
connector. Quota protection is persistent in PostgreSQL and works with all three
applications' shared backend. There is no automatic plan purchase, campaign
activation, DNS change, production database change, or traffic cutover.

**Configuration timing:** The user has confirmed that all key values will be
added after migration away from Replit. Do not request or provision the destination
credentials in Replit. Keep tracked examples blank; supply real values through
the client-owned host's server-side environment/secret settings after migration.

**Live-delivery verification is intentionally deferred until after migration.**
It requires the intended account's direct API key, webhook secret, verified
senders, account identifier, and approved test recipient. Missing settings safely
prevent email sending in the meantime. Automated provider mocks and local
database checks are not proof of a real inbox receipt. Record the actual
destination-host test results below before enabling subscriber campaigns or
signing off email delivery.

## What admins see

Every signed-in CRM page shows a persistent warning when mail configuration,
allowance, synchronization or sending needs attention. Communications shows
daily/monthly usage, available capacity, reset information, last successful sync,
deferred subscriber alerts, and warning-email status. Usage and settings refresh
while the page remains open. A blocked admin test-send opens a keyboard-accessible
dialog explaining the specific problem.

At an allowance limit the guidance is: **Upgrade your Resend plan to send more
now, or wait until the allowance resets.** The billing link opens the provider's
billing settings; it does not purchase anything.

Short request-rate throttles are not treated as evidence that a plan upgrade is
needed. Missing/invalid permissions and unavailable or stale account usage are
separate states. Unknown usage is never displayed as a confirmed empty allowance.
Provider acceptance is not a promise of delivery or inbox placement.

## Shared budget and reserves

- The free reference allowance is 100 recipients/day and 3,000/month. The provider
  usage endpoint supplies actual current limits, usage and reset timestamps;
  paid plans may have no daily cap. Do not hardcode free limits after an upgrade.
- Counts include this app's enquiries, verification codes, publications, tests,
  and admin notices. Resend-reported external sends/inbound usage are included.
- Default early warning: 80%. Default protected capacity: 1 admin-warning slot and
  5 additional essential-mail slots, applied to **both daily and monthly budgets**.
  Publication and test sends stop before using those reserves. Ordinary enquiry
  and verification mail can use the essential reserve but not the warning slot.
  Admin warnings can use the warning slot, never send above the actual allowance,
  and count as email themselves.
- With the default reserves, 94 of 100 available daily slots can be used by
  publications/tests when no essential/admin mail has been sent. The UI may
  therefore report alerts paused while some capacity remains reserved.
- Set `EMAIL_ADMIN_FROM` explicitly to an approved verified sender. Set
  `EMAIL_ADMIN_TO` to the intended client mailbox (omission uses the existing
  approved admin address). No developer sender is used implicitly.
- The warning is deduplicated for its triggered daily or monthly period.
  Repeated page visits, worker ticks and rejected requests do not create repeated
  accepted notices. If the provider allowance is already exhausted, the warning
  email cannot be promised; the persistent CRM warning remains authoritative.
- Warning mail is disabled by the existing temporary-test-login restriction.
  The current test login is not a substitute for an authorized production admin.

## Persistent safety and synchronization

PostgreSQL account-row locks serialize quota reservations across backend
instances. Reservations are committed before a network send, then settled in a
separate transaction after provider acceptance. A lost response or failed local
acceptance write retains a conservative hold rather than releasing possibly used
capacity. The ledger stores payload/key digests and provider references, not
email bodies, recipient addresses, API keys or raw provider errors.

Account usage is refreshed at most once per minute per account through
`GET https://api.resend.com/usage`. The key needs Full access for domain/usage
reads and sending; sending-only keys cannot satisfy this setup. Fresh snapshots
are combined with local reservations, not blindly added to every historical
accepted message. Unsettled/uncertain holds may temporarily overestimate usage;
that is intentional safety, not a provider usage claim. Confirmed old sends
are not double counted after a snapshot refresh.

No new send proceeds with unknown, expired or failed account verification.
Snapshots older than two minutes are stale. Provider reset timestamps are used
rather than silently clearing the budget when the local clock crosses midnight.
Published Resend documentation currently conflicts on rolling versus UTC daily
windows, so actual provider timestamps and subsequent successful refresh govern
release. A provider usage outage can delay sending safely.

New requests are spaced at least one second apart across this app's workers.
Provider request-rate errors honor a safe retry delay; this does not guarantee
other services sharing the team cannot consume its request rate or allowance.
The provider is final authority. Read:

- https://resend.com/docs/api-reference/usage/retrieve-usage
- https://resend.com/docs/api-reference/rate-limit
- https://resend.com/docs/api-reference/errors

## Subscriber queue recovery

Known quota, short-rate, configuration, and safe pre-send availability waits
return alerts to pending with a reason and a bounded next check. They do not use
the five ordinary failure attempts. A separate monotonically increasing claim
version fences late completions even when an attempt count is restored.

The worker checks deferred messages at most once per minute. Provider-confirmed
resets or increased limits allow sending to resume without a code change.
An existing live-mode approval and activation cutoff are still required, and
temporary test access still prevents subscriber sending.

Before each resumed send, consent, suppression, matching and publication
availability are rechecked. Closed publications or expired structured deadlines
are skipped; unpublished/ineligible items are not emailed because they were once
in a queue. Verification codes are not placed in a days-long queue: a blocked
code is discarded, and the user can request a fresh one. Public responses retain
their neutral content and timing to avoid revealing subscribed addresses.

### Uncertain acceptance is not a quota wait

Stable idempotency keys are retained for safe replay inside a conservative
23-hour window. After that window, uncertain acceptance requires staff review:
the system does **not** invent a new key and risk sending a duplicate. Ordinary
provider/network failures retain bounded retries; unresolved cases remain
visibly failed rather than pretending to be delivered.

To resolve a review case, the technical owner must inspect the original
provider record/reference and reconcile the existing outbox/reservation state.
Do not delete ledger records, reset attempts, or mint a new key just to make a
failed batch turn green. If absence of provider acceptance cannot be established,
leave it held and explain the uncertainty to the client.

## Upgrades, key rotation and moving accounts

1. An authorized client admin upgrades in Resend if desired. No code change or
   automatic purchase is made. After the next successful usage refresh, new
   limits are reflected and safe pending sends can resume.
2. Keep `RESEND_ACCOUNT_ID` stable while rotating a key for the same team. A key
   change invalidates the usage snapshot and requires successful revalidation;
   the persistent deduplication ledger is retained.
3. Before changing Resend accounts, stop the old worker, reconcile in-flight and
   uncertain sends, and choose a new stable `RESEND_ACCOUNT_ID`. Previously
   attempted publications from another account are held for staff review,
   not blindly replayed into the new provider account.
4. Populate the new credentials/senders/webhook secret through server-only secret
   settings, update public URLs as needed, restart the backend, and conduct
   approved tests. Do not run old/new subscriber workers simultaneously.
5. Keep the database ledger and subscriber consent/suppression data during host
   migration. Never copy secrets into tracked `.env.example` or browser settings.

## Database deployment

The development schema now includes account quota state, reservation records and
outbox deferral/claim/account metadata. Apply development schema using the
existing Drizzle workflow. There is **no startup DDL or migration hook**.
Replit's managed production schema changes go through its Publish flow.
For the future client-owned external PostgreSQL, review and apply the schema
through the destination's approved migration process before starting this code.
Do not deploy code expecting the new schema against an unchanged database.

## Tests and handover checklist

Automated tests cover shared recipient budgets, reserve priorities, parallel
last-slot reservations, real PostgreSQL locking and restart persistence, external
usage, settlement without double counting, reset/upgrade behavior, warning
deduplication, missing permissions, expired codes, lost responses, stale usage,
payload conflicts, signed webhooks, deferral outcomes, claim fencing, protected
health endpoints and sanitized blocked-send responses.

Post-migration live checks still to complete on the client-owned host, using
**only approved test mailboxes**:

- [ ] Supply direct `RESEND_API_KEY`, stable `RESEND_ACCOUNT_ID` and endpoint's
  `RESEND_WEBHOOK_SECRET` securely; verify actual `GET /usage` permissions.
- [ ] Verify approved sender domains/DNS and configure enquiry, code, publication
  and admin-warning senders explicitly.
- [ ] Confirm approved test/admin recipients; do not use production subscribers.
- [ ] Send bounded controlled tests for enquiry, verification, publication sample
  and warning message; record provider references without publishing private data.
- [ ] Confirm actual inbox/spam receipt; record acceptance separately from receipt.
- [ ] Check signed delivered/bounce/complaint handling; test fixtures alone do not
  prove the public webhook is reachable.
- [ ] Check quota warning and recovery using safe fixtures or a dedicated test
  account; do not intentionally exhaust the client's live allowance.
- [ ] Confirm subscriber live mode remains off until separate campaign approval.

These unchecked items are post-migration acceptance gates, not successful checks
and not requests to configure credentials in Replit.
