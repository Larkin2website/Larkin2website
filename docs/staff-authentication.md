# Staff authentication and operations

## Production contract

The portal and CRM use application-managed email/password authentication stored
in PostgreSQL. There is no Clerk SDK, tenant dependency, browser key, public staff
registration, arbitrary-credential login or first-visitor administrator promotion.
Public subscriber signup, verification, preferences and unsubscribe are separate,
unchanged public flows; a subscriber is not a staff account.

Staff pages use one canonical HTTPS `STAFF_AUTH_ORIGIN`. Approved legacy staff
hostnames redirect there in production; legacy public subscriber URLs are not
rewritten by that redirect. API requests remain same-origin. Deliberate separate
staff origins require a future reviewed cookie/origin design, not wildcard CORS.

## Runtime settings, supplied after migration

Use the destination secret manager (Render Environment). An untracked repository
root `.env` works for an authorized local installation; injected variables win.
Never put credentials in `VITE_*`, Git, screenshots, support logs or this guide.

- `DATABASE_URL`: approved destination PostgreSQL connection.
- `SESSION_SECRET`: privately generated, unpredictable value of at least 32
  characters. Also protects public verification challenges; decide compatibility
  deliberately before replacing a source signing value.
- `STAFF_AUTH_ORIGIN`: exact HTTPS origin, no path/query/credentials.
- `STAFF_AUTH_FROM`: explicit approved sender on a Resend-verified domain.
- Resend API key, stable account identifier, quota settings and signed webhook
  configuration: see [Resend setup](resend-setup.md).
- `EMAIL_WORKERS_ENABLED=true`: only after schema, account and sender approval.
  This enables staff-email processing and quota monitoring, not subscriber
  campaigns. Publication mode/approval/cutoff remain separate gates.
- `FIRST_ADMIN_EMAIL`, optional `FIRST_ADMIN_NAME`: operator command only.

No real values are requested or embedded during repository preparation. Configure
and restart after migration; no authentication/email rebuild is required.

## Initial administrator and existing staff

1. Restore/reconcile the database using the Render runbook, including the additive
   staff-auth migration. Do not delete existing membership or audit records.
2. Confirm client ownership, approved first administrator and mailbox, origin,
   sender domain, Resend account and quota configuration privately.
3. Set the bootstrap variables, then run from the repository root:

   ```sh
   pnpm --filter @workspace/api-server run auth:bootstrap
   ```

4. The command queues one invitation and prints no password/token/link. It never
   runs at application startup. Delivery requires the approved worker settings.
5. Open the invitation from the mailbox, choose a password, then sign in.
6. Invite remaining approved staff through portal Settings / access management.
   Existing membership IDs remain unchanged, including historical provider IDs.
   A legacy ID alone does not indicate a password: `hasPassword` is authoritative.
7. Establish a second approved super-admin and test recovery/offboarding before
   launch. Remove the bootstrap email/name settings afterward.

The command refuses once a credentialed active super-admin exists. If the selected
email already has a membership, that membership must already be an approved
active super-admin; it is not silently promoted. Ambiguous duplicate emails
require operator reconciliation. A new installation uses a pending super-admin
grant, claimed only after single-use email proof.

No source password/session export is assumed. Existing staff set new passwords.
Pending grants remain separate from memberships until invitation acceptance.
Suspended grants/members cannot accept invitations. Acceptance uses the current
approved role/status, not stale values copied into a link.

## User and administrator flows

- Sign-in: `/larkin2-opportunities-portal/sign-in` or
  `/hetv-audience-crm/sign-in`.
- Forgot password: corresponding `/forgot-password` page. Every valid address gets
  the same response; account lookup and sending happen off the request path.
  Unknown/suspended accounts receive no email. Provider/storage failure is not
  exposed as account existence.
- Password setup: `/set-password#token=...`. Tokens use a fragment, never a
  query/path; the browser removes it from history after reading it.
- Settings: grant & invite; invite an existing uncredentialed member; inspect
  newest-first history; resend replaces/revokes the old link; revoke pending
  invitations. Grant creation and queue failure are reported separately.
- Provider acceptance means accepted by the mail API, **not verified inbox
  delivery**. Deferred/failed/uncertain delivery requires the displayed action.
- A viewer has read-only portal access; opportunity managers retain their existing
  editorial permissions; only super-admins manage access or enter CRM.
- Suspension and role changes invalidate sessions. The last working credentialed
  super-admin cannot be suspended/demoted even if uncredentialed legacy admins
  remain. These operations share the existing identity transaction lock.

## Security and lifetime

Passwords use salted scrypt (`N=65536,r=8,p=2`), with two concurrent hashes and a
bounded waiting queue. Passwords are 12–128 characters; managers/paste are allowed.
Unknown-user sign-in performs the same password derivation. Authentication errors
do not reveal whether an email is present or suspended.

Opaque random session tokens are stored only as SHA-256 hashes. Cookies are
HttpOnly, SameSite=Lax, path `/api`, and Secure in production. Sessions expire
after eight hours or 30 minutes idle; login rotates the token and logout removes
the stored session. Current active membership/role is rechecked on each request.
Password changes invalidate all sessions and outstanding links for that account.
Successful sign-in/out, invitation lifecycle, password changes and access
management have persistent audit events without credential/token material.

State-changing staff requests require the exact configured Origin. Authenticated
mutations also require a session-bound anti-CSRF header; the shared API client
adds it only for same-origin requests. Session responses/private APIs are no-store.
Production headers include CSP, anti-framing, nosniff, referrer and permissions
policies, plus HSTS on HTTPS. No wildcard credentialed CORS is enabled.

Invitation links expire after 48 hours; reset links after 30 minutes. Consumption,
revocation and identity claiming are transactional and single-use, including
concurrent submissions. Only a token hash and a nonce are stored: reproducing the
same retry link requires the signing secret. Secret rotation invalidates old
links. Session/password/one-time tokens never enter application logs.

IP rate limits: sign-in 20/15min, recovery 5/15min, password setup 20/15min,
invitation writes 30/15min, plus a general 600/min API bound. Recovery queues at
most three requests per address/15min regardless of account existence. IP windows
are per process, not a distributed anti-abuse service: retain one instance and
review shared limits before scaling. Do not use permanent account lockouts.

## Mail retries and retention

Staff mail uses the existing shared quota/reservation transport as transactional
mail. Recipient counts consume the same account allowance as enquiries, public
verification, publications and admin warnings. Exhaustion defers sending; quota
reset timestamps control retry timing. The CRM warning remains available if no
email capacity remains, so a warning email is never guaranteed.

Persistent claims use 90-second leases, attempt fencing and stable idempotency
keys. At most five attempts occur before expiry; ambiguous acceptance is held for
review rather than blindly resent. No automatic retry crosses the conservative
23-hour idempotency window or a different Resend account. Manual resend creates a
new token/job after operator review; old links are revoked.

The explicitly enabled maintenance worker removes expired/idle sessions, marks
expired/exhausted jobs failed and removes mail-link records after 30 days, in
bounded batches. Memberships and security audit history are not deleted by this
cleanup. Agree audit retention separately. With workers disabled, an authorized
operator must account for maintenance backlog before enabling them.

## Verification versus external acceptance

Isolated PostgreSQL tests cover real password/session/invitation transactions,
legacy-cookie denial, CSRF, replay/concurrent acceptance, revocation, reset,
suspension and CRM boundaries. Browser fixtures capture mail locally in an
isolated schema; they never use the Resend network. They are explicit standalone
test commands and are never imported by normal startup.

These do not verify actual client mailbox control, provider DNS, production TLS,
Render proxy behaviour or live delivery. Complete and record the destination
checks in [production readiness](production-readiness.md) before launch.
