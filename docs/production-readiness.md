# Production readiness register

## Overall status

**Repository implementation and local verification are complete. Destination launch is NOT yet
approved or verified.** No client resource provisioning, production data transfer
or DNS cutover has been performed. Controlled real email and a signed delivery
callback have since been verified on the temporary public preview, and its
campaign worker is enabled for new eligible publications only. The owner also
confirmed inbox receipt of all 11 controlled test emails on 10 November 2026.
This is not
destination launch approval; see [email check results](email-delivery-check-results.md).

The agreed authentication replacement is implemented: email/password,
administrator invitations only, no public staff registration, Resend invitations
and resets, preserved portal roles and active-super-admin-only CRM.
The following register separates code evidence from external acceptance.

## Repository checks

| Check | Evidence/status |
| --- | --- |
| Clerk provider/SDK/proxy and arbitrary-credential login removed | Source/manifests updated; copied flags and legacy cookies are denied |
| Password/session, invitation/reset lifecycle and current permissions | Passed isolated PostgreSQL transactions and real browser staff lifecycle |
| Existing membership IDs/grants/audits preserved | Additive three-table migration, no destructive identity rewrite |
| Origin/CSRF, no-store private APIs, production headers and readiness | Implemented; native HTTP/integration checks |
| Reproducible three-app/API keyless build and native server | Passed without real auth/mail/database build keys; prefixes, headers, closed auth, 404 and shutdown verified |
| Isolated browser invitation/sign-in/access/recovery journey | Passed with captured test mail only; post-login cache race fixed and focused confirmation passed |
| GitHub CI | Checked-in Node/PostgreSQL workflow; first external run remains a destination gate |
| Consistent migration/environment/operations documentation | Render, ownership, staff and Resend guides updated |

### Verification record — 10 November 2026 UTC

- Full API regression run: **126 passed, 1 optional persistence test skipped**,
  zero failures. The optional persistence test was then enabled and passed in its
  own isolated schema; it no longer depends on live development categories or
  risks enqueueing source subscribers.
- Changed authentication integration was rerun after final audit changes and
  passed. Coverage includes unauthenticated/viewer/manager/suspended/super-admin
  states, concurrent token acceptance, revoked/replayed links, old cookies/copied
  flags, CSRF/origin denial, logout/reset revocation, last working administrator
  safety despite legacy uncredentialed admins, preserved legacy identity IDs,
  quota-reset deferral, stable retry content/keys and uncertain/expired retry holds.
- Keyless `pnpm build:render`, `pnpm check:render` and native `pnpm test:render`
  passed. Final changed frontend typechecks/builds and API typecheck/build passed.
  Native HTTP checks also assert production CSP, nosniff, framing and HSTS.
- Browser pass used the real compiled portal/CRM with isolated PostgreSQL,
  persistent credential/session records and locally captured emails. It exercised
  admin invitation/password setup, sign-in/refresh and CRM access; viewer grant,
  invitation/portal access and denied Settings/CRM; recovery, old/new passwords,
  token replay/forgery/missing-token UI and real logout/protected refresh.
  Phone-width sign-in/recovery layouts fit without horizontal clipping.
- The pass discovered an active-query cache race leaving the post-login access
  gate pending. The cache reset/remount fix passed both frontend checks and a
  targeted continuation of the same browser pass: administrator and recovered
  viewer dashboards loaded automatically with login/session/dashboard HTTP 200,
  without a manual reload.
- Normal managed workflows were restarted and served successfully. CRM sign-in
  screenshot showed the production-facing form. The known Replit-only development
  banner-script 404 does not appear in the tested compiled Render frontends.
- Only the reviewed additive staff schema was applied to **development**. No
  production DDL, export or restore was performed. The original repository test
  pass used captured mail; subsequent approved live mail checks are recorded in
  [email check results](email-delivery-check-results.md).

Reproducible evidence is in
`artifacts/api-server/src/lib/staff-auth.integration.test.ts`,
`portal-auth.test.ts`, `role-profile-persistence.test.ts`,
`scripts/render-runtime.test.mjs`, the build/check scripts and
`.github/workflows/ci.yml`. The standalone browser fixture is
`artifacts/api-server/src/commands/staff-auth-browser-fixture.ts`; it requires
explicit fixture mode, rejects production execution and uses an isolated schema
with captured mail, never a normal-app authentication bypass.

## Destination gates — all remain open until an operator records evidence

| Gate | Required evidence / responsible owner |
| --- | --- |
| Client account ownership and costs | Client controls GitHub/Render/Resend/DNS/billing/MFA/recovery; approved region/plans |
| Frozen external build | Fresh GitHub CI and Render build succeed on approved release without Replit tooling |
| Production data/source identity | Authorized actual-production export; private encrypted backup, source/target version checks |
| Restore/schema reconciliation | Empty-target rehearsal, reviewed additive changes, count/constraint/sequence/content comparisons |
| Recovery | Successful restore drill, RPO/RTO/retention and off-provider backup owner |
| First/backup administrators | Privately selected operator bootstrap, actual mailbox proof/password setup; no accidental enrollment |
| Staff authorization | Real invitation, expiry/replay/revoke/reset/logout/suspension; viewer/manager/super-admin boundaries |
| Public journey continuity | Signup/verification/preferences/unsubscribe and legacy links, enquiries, published content/date checks |
| Resend sender/delivery | Verified domain/DNS, approved senders/recipients, correct account/key permissions, actual inbox/spam receipt |
| Signed provider events | Destination raw-body signature/replay/duplicate, delivery/bounce/complaint processing verified |
| Quotas and warnings | Shared daily/monthly account budget/reserves, deferred sending, visible CRM warning and possible admin email |
| Worker recovery | Restart/deploy overlap, claims/idempotency/failure visibility; only one intended live publication worker |
| Host security | Actual HTTPS/cookie/proxy/origin behaviour, approved hostnames, safe headers, canonical staff redirects |
| Cutover | Approved final sync/write pause, DNS/TLS, rollback decision owner, post-cutover reconciliation |
| Campaign activation | Explicit separate signoff, reviewed historical backlog and activation timestamp |
| Handover/source retirement | Client can operate/recover; rollback window closed; legacy links verified before retiring source services |

## How to record acceptance

For each gate, add date/time, approved release, responsible operator, redacted
evidence location, result and exception/expiry. Never paste credentials, personal
exports, raw one-time tokens or full subscriber capability URLs into this file.
Local mocks, CI or a 200 liveness response cannot close real mailbox/DNS/data gates.

Open known operational tradeoffs: one instance/shared release and failure impact;
per-process IP limits; managed provider dependency; client-selected retention,
monitoring, capacity and maintenance responsibilities. Review distributed limits
and worker architecture before scaling beyond the one-instance contract.
