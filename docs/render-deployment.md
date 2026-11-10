# Render deployment and migration runbook

> **Authentication correction:** The confirmed destination requirement is
> application-managed **email/password**, **administrator invitations only**,
> **no public registration**, and **Resend for invitation/password-reset emails**,
> with existing portal/CRM permissions enforced. Clerk is not the approved target.
> The current code and Clerk-specific instructions below describe the earlier
> preparation, not a completed replacement. **Do not provision a new Clerk
> account from those instructions.** Replacing Clerk and updating the executable
> deployment configuration remain outstanding before launch. The first
> administrator's email and approved sender are supplied privately at the
> post-migration configuration stage, not committed here.

## 1. Status and client ownership

Repository preparation is implemented; **nothing has been provisioned, migrated,
published or switched to Render** by this work. All destination key values are
entered **after migration**, in the client-owned Render environment/secret
settings, not in Replit, GitHub, this document or chat.

The intended stack is client-owned GitHub, one paid Render Node web service,
same-region paid Render PostgreSQL, client-owned external Clerk, and direct
Resend. Client administrators must own billing, MFA/recovery, DNS and provider
accounts. Developer access should be delegated and removable.

The root `render.yaml` is a reviewed proposal, not authorization to incur costs.
It disables auto-deploy and email workers. Blueprint creation can still trigger
an initial deployment; `autoDeployTrigger: off` only disables subsequent automatic
deploys. Do not apply it until the client approves provisioning.

## 2. Architecture

```text
Client GitHub repository (repository-root build context)
    |
    +-- Render Node service, one instance
          /larkin2-opportunities/         public hub
          /larkin2-opportunities-portal/  staff management portal
          /hetv-audience-crm/             audience CRM
          /api/...                       shared API and Resend webhook
          |
          +-- Render PostgreSQL, private/internal connection
          +-- client-owned Clerk
          +-- direct Resend
```

Express serves the compiled websites; there are no production Vite processes.
Keeping one origin and existing prefixes avoids unnecessary CORS and cookie
changes. The Render hostname's root redirects to the public hub. Existing
approved legacy hostnames retain their staff/public root redirects; they are not
evidence of client domain ownership. Add approved custom domains to Render and
`ALLOWED_HOSTS` before sending traffic to them.

API routes and signed raw-body webhooks precede website fallbacks. Missing APIs
return JSON 404, missing assets do not return unrelated HTML, fingerprinted
assets are cached and SPA index pages are not cached.

## 3. Exact build and start commands

Node **24.22.1** and pnpm **10.26.1** are pinned. Work from the **repository root**,
not an individual app directory, so shared libraries and asset imports exist.

```sh
corepack enable
pnpm install --frozen-lockfile --prod=false
pnpm build:render
pnpm check:render
pnpm test:render
```

`build:render` typechecks shared libraries and the four deployable packages,
builds the three frontends with their distinct prefixes, and bundles the API.
It excludes the mockup sandbox, seed scripts and database mutations. It forces
external frontend auth, clears the Replit Clerk proxy setting and disables
frontend testing flags, even if workspace flags were accidentally inherited.
Compilation needs no real database/auth/mail keys and no injected `BASE_PATH`
or listening `PORT`.

On the configured destination:

```sh
pnpm start
```

This starts `artifacts/api-server/dist/index.mjs` from the repository root.
Render supplies `PORT`; the process binds `0.0.0.0`. A database connection string
is required to initialize the application module. `/api/healthz` is a **process
liveness check**, not proof that the schema, data, auth, mail or database
connectivity is ready. Check actual public/database-backed reads separately
before launch. No database schema or seed operation runs at startup.

Without `SERVE_STATIC_APPS=true`, the API does not mount compiled frontends;
this preserves the current separate Replit development workflows.

## 4. Blueprint and service choices

The proposal selects Frankfurt for both services, Node compute `0.5c-512mb`,
PostgreSQL compute `0.1c-256mb`, one API instance, and PostgreSQL 16.
**Review region, source database version, memory, storage, backups and retention
before provisioning.** Increase the database major version if the source is newer;
do not attempt a cross-major downgrade. The initial small database is a starting
configuration, not a capacity guarantee.

As checked against Render's published pricing on 3 November 2026, those compute
tiers list $7/month and $6/month respectively. This **$13/month compute subtotal
is not an all-inclusive quote**: PostgreSQL storage, backup/retention features,
bandwidth, build usage, workspace charges, taxes and Clerk/Resend/domain charges
may be additional. Confirm current costs and client approval in Render.
Free sleeping compute and expiring free databases are not the production
recommendation for scheduled subscriber delivery.

The database Blueprint disables external network access (`ipAllowList: []`) and
uses the internal connection reference. Do not add public database access except
for a specifically approved, time-limited operator CIDR, then remove it.

Optional local Blueprint validation, without provisioning:

```sh
curl -fsSL https://render.com/schema/render.yaml.json -o /tmp/render-schema.json
pnpm check:render /tmp/render-schema.json
```

The optional schema check validates with the official JSON schema, not an API
call that creates services. Review the Blueprint preview in Render as a separate
destination gate.

## 5. Environment and secret matrix

Only server runtime values can change through a restart without recompilation.
Vite values are **public build-time values** and require a new build.
Use `.env.example` only as a blank inventory. Hosting-injected values override
an untracked root `.env`; never commit or log the real file.

| Variable(s) | Where / classification | Destination action |
| --- | --- | --- |
| `NODE_VERSION`, `PNPM_VERSION` | Non-secret toolchain | Pinned in Blueprint and repository |
| `NODE_ENV` | Server runtime | `production` |
| `PORT` | Render-provided runtime | Leave to Render; do not hardcode the platform port |
| `DATABASE_URL` | Server secret | Blueprint internal database reference; use approved target only |
| `SERVE_STATIC_APPS` | Server runtime | `true` |
| `AUTH_PROVIDER` | Server runtime | `external`; Render also selects external mode automatically |
| `RENDER`, `RENDER_EXTERNAL_HOSTNAME` | Render-provided runtime | Do not copy Replit equivalents or fabricate a hostname |
| `ALLOWED_HOSTS` | Server runtime, non-secret | Comma-separated approved custom hostnames, no schemes or paths; Render's assigned hostname is automatically allowed |
| `CLERK_PUBLISHABLE_KEY` | Server runtime, public identifier | Destination Clerk app's public key |
| `CLERK_SECRET_KEY` | Server secret | Same destination Clerk app; never a `VITE_` variable |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend build-time, public | Same destination app; add then rebuild portal and CRM |
| `VITE_AUTH_PROVIDER` | Frontend build-time | Forced to `external` by production build |
| `VITE_CLERK_PROXY_URL` | Frontend build-time | Cleared for external Clerk; do not copy Replit proxy URLs |
| `PUBLIC_TEST_LOGIN_ENABLED`, `DEV_DEMO_LOGIN_ENABLED`, `PORTAL_DEMO_MODE` | Server runtime | `false`; external auth additionally refuses test access even if these are mistakenly true |
| `VITE_PUBLIC_TEST_LOGIN_ENABLED`, `VITE_DEV_DEMO_LOGIN_ENABLED`, `VITE_PORTAL_DEMO_MODE` | Frontend build-time | Production build forces `false` |
| `EMAIL_WORKERS_ENABLED` | Server runtime | `false` initially; explicitly approve `true` after schema, mail and worker checks |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` | Server secrets | Destination account's full-access key and webhook signing secret |
| `RESEND_ACCOUNT_ID` | Server runtime, non-secret | Stable label for the intended Resend account; retain for same-account key rotations |
| `CONTACT_ENQUIRY_FROM`, `CONTACT_ENQUIRY_TO` | Server runtime | Explicit approved bare addresses; no developer sender fallback |
| `SUBSCRIPTION_VERIFICATION_FROM`, `PUBLICATION_EMAIL_FROM` | Server runtime | Approved senders on verified domains |
| `PUBLICATION_TEST_EMAIL`, `EMAIL_ADMIN_FROM`, `EMAIL_ADMIN_TO` | Server runtime | Approved test/admin mailbox and explicit warning sender; confirm rather than assuming old developer settings |
| `PUBLIC_OPPORTUNITIES_URL` | Server runtime | Actual destination public URL including `/larkin2-opportunities/`; set before email tests |
| `EMAIL_WARNING_PERCENT`, `EMAIL_ADMIN_RESERVE`, `EMAIL_TRANSACTIONAL_RESERVE` | Server runtime | Defaults 80, 1, 5; counts/reserves are shared with essential mail |
| `PUBLICATION_EMAIL_MODE`, `PUBLICATION_EMAIL_APPROVED`, `PUBLICATION_ALERTS_ACTIVATED_AT` | Server runtime | Keep `off`, `false`, blank until separately approved campaign activation |
| `SESSION_SECRET` | Server secret | Preserve securely where compatibility is required, or explicitly expire/reissue verification codes/sessions |
| `BASE_PATH` | Per-frontend build setting | Assigned separately by `build:render`; never one shared value for all three apps |
| `LOG_LEVEL` | Optional server runtime | Existing default; avoid unnecessary debug logging of personal records |

Do not expose private keys via frontend variables or API configuration endpoints.
Missing external Clerk configuration leaves staff screens closed and protected
API requests unauthorized; it is not an alternative login system. Public pages
can load while destination setup is incomplete.

## 6. Database: choose one path, never combine blindly

The offline baseline is `lib/db/migrations/0000_render_baseline.sql`.
It represents the current 21-table schema, including consent, memberships,
suppression/delivery history, quota reservations and outbox claim metadata.
It contains DDL only, not client records, and has **not** been applied to a
destination database.

### A. Brand-new, deliberately empty installation

Only after target identity, emptiness, DDL review and operator authorization,
use an approved PostgreSQL client and an appropriately restricted connection:

```sh
psql "$DATABASE_URL" -X --set=ON_ERROR_STOP=1 --single-transaction \
  -f lib/db/migrations/0000_render_baseline.sql
```

There is no automatic pre-deploy or initial-deploy migration hook. SQL execution
requires PostgreSQL tools on the authorized operator machine or an approved
destination shell; this native Node build does not install those tools.
Do not run baseline SQL against an existing or restored schema.

### B. Existing production data migration

1. Obtain explicit production export authorization and identify the authoritative
   production database. Do not substitute the development database.
2. Check source/destination PostgreSQL versions, extensions, timezone and tools.
   Use a compatible `pg_dump`/`pg_restore` version; store the encrypted backup
   outside Git and the deployment source.
3. Rehearse a full schema+data restore into an empty isolated destination using
   ownership/ACL settings appropriate to Render. Do not first apply the baseline.
4. Compare the restored schema to the checked-in schema/baseline. Older source
   schemas may lack recent quota/outbox columns; review and apply only the
   required additive differences through an authorized migration.
5. Compare counts, constraints, sequences, representative records, consent,
   opt-outs, role permissions, matching, date-only content and delivery state.
   Test application reads/writes on rehearsal data before a final cutover.

`pnpm --filter @workspace/db run schema:generate` generates future offline
Drizzle diffs; it does not inspect, migrate or reconcile an arbitrary restored
database. This is a new migration baseline, not evidence that the source has
Drizzle migration history. Do not mark it applied on an existing database without
verifying schema equivalence. Existing `push`/`push-force` commands remain
development tools and are not an unattended production migration strategy.

Use the provider-supplied connection/TLS settings and validate certificates for
external connections. Never set `NODE_TLS_REJECT_UNAUTHORIZED=0` or globally
disable certificate checks to resolve a connection problem.

## 7. Authentication setup after migration

Create/authorize the client-owned Clerk application and configure its destination
domains and callbacks. Enter matching server/public keys, then rebuild for the
browser key. External mode uses explicit keys and Clerk's standard frontend API,
not Replit hostname inference or the Replit proxy.

Source Replit-managed tenant export/transfer permissions are not assumed.
Choose an authorized identity migration or re-invite approved staff and reconcile
their application memberships. Preserving an email address does not guarantee
the new Clerk user ID equals the old ID. Do not delete or globally activate
memberships to make login work.

The existing empty-membership first-admin bootstrap remains unchanged. Keep
destination signups restricted during setup and supervise the approved first
admin claim before admitting other users. Test pending/suspended/viewer/manager/
super-admin permissions and sign-out; verified identity is not blanket access.

## 8. Email, jobs and signed webhooks

Follow [Resend setup](resend-setup.md) and
[Email delivery operations](email-delivery-operations.md). No real email or
destination webhook callback is verified by repository tests.

After destination sender/DNS and mailbox approval, configure runtime values and
the reachable HTTPS endpoint `/api/webhooks/resend`. Confirm signature checks,
provider references, actual test inbox/spam receipt and delivery/bounce/complaint
handling. Enable `EMAIL_WORKERS_ENABLED=true` for approved monitoring/job tests;
keep publication mode off until separate campaign approval.

Initially run one always-on API instance. Workers stop taking new periodic ticks
on SIGTERM/SIGINT while current work is allowed to finish; HTTP requests drain
and the database pool closes. A 25-second bound prevents a stuck deploy. Forced
termination relies on persistent leases, claim fencing and provider idempotency
for recovery, not in-memory promises. Rehearse interruption recovery on the
destination; do not run the old and new live publication workers simultaneously.

## 9. Replit dependency inventory

| Item | Decision |
| --- | --- |
| Root/API connector SDK dependency | Removed; Resend is direct and there were no active connector imports |
| Replit frontend overlay/banner/cartographer | Development-only conditional imports; absent from production build plugins |
| Native dependency platform exclusions | Removed; restore normal package-manager platform selection |
| Unbounded Clerk direct package versions | Pinned to existing releases; React/React DOM patched to their supported 19.1.4 level |
| Mandatory injected frontend port/base | Replaced by stable app defaults and explicit per-app production build bases |
| Managed Clerk host inference/server proxy | Retained only for existing managed workspace mode; bypassed in external/Render mode |
| Arbitrary-credential test flags | Forced off in production builds and rejected by destination backend |
| `.replit`, `.replitignore`, artifact metadata and post-merge helper | Retained as inert workspace metadata; Render does not execute them |
| Mockup sandbox and seed scripts | Retained in repository, excluded from production build/start commands |
| Existing domain-root redirect map | Retained for URL continuity; only GET/HEAD redirects; approved Render domains must be configured separately |
| `attached_assets` and app public assets | Retain required licensed assets; only referenced/compiled and public app output is served, not the entire repository |

Do not copy `.replit` environment defaults into Render. Render's Blueprint and
runtime environment are authoritative there. Keeping ignored workspace metadata
does not create a Render runtime dependency.

## 10. Rehearsal, cutover and rollback

- Approve client ownership, service costs, storage region, backups and recovery
  objectives; push the prepared source to the client-owned GitHub repository.
- Provision the approved isolated Render service/database, review the Blueprint
  preview, and keep email workers/campaigns off. Restore/reconcile schema/data
  before treating database-backed routes as ready.
- Enter destination values; rebuild when the Clerk public browser key changes.
  Complete real staff login/authorization, public role/programme reads, controlled
  CRUD on rehearsal records, subscriber preferences/unsubscribe, email and job
  recovery checks. Do not send to existing subscribers as a smoke test.
- Before launch, take a verified backup, pause source writes/jobs, perform an
  approved final sync, reconcile identities, validate counts and perform bounded
  acceptance checks. Change DNS only with explicit approval.
- Keep the old site/database available for the agreed recovery window. Monitor
  auth failures, API errors, job state, quota warnings and provider outcomes;
  explicitly approve campaign activation and later automatic release behavior.
- For a code-only fault, use a compatible prior build. For data problems, freeze
  writes first and reconcile post-cutover records before rollback. DNS rollback
  alone does not copy new data back and must not create two active sending sites.
- Retire Replit and revoke obsolete provider access only after recovery and
  legacy-link continuity are confirmed.

## 11. Verification record and remaining gates

Local preparation verification, 3 November 2026:

| Check | Result |
| --- | --- |
| Frozen install and all four deployable-package typechecks/builds, without Replit routing or real database/auth build keys | Passed |
| Official Render Blueprint JSON-schema validation | Passed; no provisioning |
| API regression suite | 133 passed, 1 skipped |
| Built native-server HTTP/auth-denial/static/shutdown fixture | Passed |
| Browser: portal sign-in deep-link refresh and CRM protected route without keys | Passed; closed configuration screens, no app crashes or Replit proxy/tool requests |
| Existing managed workspace workflows after restart | All running |

The browser check deliberately did not authenticate a real external Clerk user.
The native-server fixture uses an unusable non-secret database URL and performs
no client-data operations; it verifies startup isolation, not database readiness.

Preparation checks are recorded at task handover. The repository includes:

- Frozen-lockfile install and isolated production builds with Replit, routing,
  database and auth key variables removed from the build environment.
- Offline official Blueprint-schema validation and checks of compiled asset bases.
- Production HTTP fixture checks of all three compiled sites, API 404/auth
  denial, copied test-flag rejection, no startup DB mutations and clean SIGTERM.
- Domain/forwarded-host, cache, deep-link and missing-asset regression tests.
- Existing API regression coverage, including quota ledger PostgreSQL concurrency.

These do **not** certify a fresh external machine or actual Render deployment.
GitHub/Render must repeat the frozen install/build on their own infrastructure.
Remaining launch gates: approved resources and versions, restore/schema rehearsal,
actual staff authentication and identity mapping, browser acceptance with the
destination Clerk keys, actual inbox receipt and signed external callbacks,
worker interruption recovery, domain/DNS approval and final data/campaign signoff.

## Official references

Reviewed 3 November 2026; recheck provider details before provisioning:

- https://render.com/docs/blueprint-spec
- https://render.com/schema/render.yaml.json
- https://render.com/docs/monorepo-support
- https://render.com/docs/web-services
- https://render.com/docs/node-version
- https://render.com/docs/postgresql-creating-connecting
- https://render.com/pricing
