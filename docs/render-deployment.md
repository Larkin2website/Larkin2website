# Render deployment and migration runbook

## Status and approved architecture

Repository implementation targets **client GitHub → one paid native Node Render
service → same-region paid Render PostgreSQL**, with **application-managed
invitation-only email/password authentication** and **direct Resend**.
There is no Clerk provider/key/proxy requirement and no first-visitor promotion.
The three websites retain their prefixes and share `/api/`.

No Render resource, production export/restore, real sender/domain verification,
mail delivery, DNS change or campaign activation has been performed. All real
destination values are entered **after migration**, privately on Render. The
Blueprint is a proposal requiring client approval of costs/region/capacity.

## Build, start and repository

Work from the **repository root**, not the API artifact. Node **24.22.1**, pnpm
**10.26.1**, React/ReactDOM **19.1.4** and the lockfile are pinned.

```sh
corepack enable
pnpm install --frozen-lockfile --prod=false
pnpm build:render
pnpm check:render
pnpm test:render
pnpm --filter @workspace/api-server test
```

The focused build typechecks shared libraries/four deployable packages, compiles
the three SPAs with their distinct bases and bundles the API. It excludes the
design sandbox/seeds and does not read real database/auth/mail values. PostgreSQL
integration tests require an isolated test database; CI supplies one. No real
provider credentials are needed for CI.

On the configured host:

```sh
pnpm start
```

Render injects `PORT`; Express binds `0.0.0.0`, serves the compiled frontends when
`SERVE_STATIC_APPS=true`, and routes APIs/raw signed webhooks before SPA fallbacks.
Unknown APIs return JSON 404; missing assets do not return unrelated HTML.
Fingerprint assets are cached; indexes/private APIs are no-store.
Startup performs no seeds or DDL.

The Blueprint uses one instance, Frankfurt, PostgreSQL 16 and initial compute
tiers `0.5c-512mb` / `0.1c-256mb`. Review capacity, memory, source DB version,
storage, retention and current pricing before creation. Never downgrade a newer
source major version. Database `ipAllowList: []` denies external network access;
use Render's internal connection. A temporary approved operator CIDR requires
explicit authorization and removal afterward.

Auto-deploy is off, workers are off, publication mode is off. Applying a Blueprint
may still create paid resources and an initial deployment; it is not a dry run.
Validate without provisioning if desired:

```sh
curl -fsSL https://render.com/schema/render.yaml.json -o /tmp/render-schema.json
pnpm check:render /tmp/render-schema.json
```

## Runtime environment matrix

Use Render Environment/secret management or an untracked repository-root `.env`
for an authorized local installation. Injected values override `.env`. Restart
after runtime changes; email/auth changes do not need a browser rebuild.
Never put secrets in `VITE_*`, tracked files or logs.

| Setting | Destination action |
| --- | --- |
| `DATABASE_URL` | Approved private/internal PostgreSQL URL; Blueprint reference |
| `NODE_ENV`, `PORT` | `production`; Render-supplied port |
| `SERVE_STATIC_APPS` | `true` |
| `ALLOWED_HOSTS` | Approved custom hostnames, comma-separated; Render hostname automatically allowed |
| `SESSION_SECRET` | Strong unpredictable signing value, at least 32 characters; plan source public-verification compatibility |
| `STAFF_AUTH_ORIGIN` | Canonical HTTPS origin with no path/query; staff aliases redirect here |
| `STAFF_AUTH_FROM` | Approved Resend-domain sender for invitations/resets |
| `FIRST_ADMIN_EMAIL`, optional `FIRST_ADMIN_NAME` | Explicit operator bootstrap only; remove after setup |
| `RESEND_API_KEY` | Destination account key with permissions required by direct mail/quota/domain checks |
| `RESEND_ACCOUNT_ID` | Stable intended-account identifier; retain on same-account key rotation, change for another account |
| `RESEND_WEBHOOK_SECRET` | Destination endpoint signing secret |
| `CONTACT_ENQUIRY_FROM`, `CONTACT_ENQUIRY_TO` | Approved bare sender/recipient addresses |
| `SUBSCRIPTION_VERIFICATION_FROM`, `PUBLICATION_EMAIL_FROM` | Explicit verified approved senders |
| `PUBLIC_OPPORTUNITIES_URL` | Approved public URL including `/larkin2-opportunities/` |
| `PUBLICATION_TEST_EMAIL` | Approved controlled test inbox |
| `EMAIL_ADMIN_FROM`, `EMAIL_ADMIN_TO` | Approved warning sender/admin mailbox |
| `EMAIL_WARNING_PERCENT`, `EMAIL_ADMIN_RESERVE`, `EMAIL_TRANSACTIONAL_RESERVE` | Defaults 80, 1, 5; shared recipient allowance/reserves |
| `EMAIL_WORKERS_ENABLED` | `false` until approved schema/email setup; `true` enables monitoring/staff mail/job processing |
| `PUBLICATION_EMAIL_MODE`, `PUBLICATION_EMAIL_APPROVED`, `PUBLICATION_ALERTS_ACTIVATED_AT` | Keep `off`, `false`, blank until separately approved campaign/cutoff |
| `BASE_PATH` | Assigned separately per frontend by build script; not one global value |
| `LOG_LEVEL` | Optional runtime setting; do not enable personal-data/credential logging |

`.env.example` is the blank inventory. Former `AUTH_PROVIDER`, Clerk settings and
test/demo flags are not used. Copying old flags/cookies cannot restore test access.
Missing required staff setup fails closed; a public page loading does not certify
authentication or email readiness.

## Database: choose the correct path

Review DDL, target identity, backups and authorization before execution. SQL files
are tracked DDL, not exports of client data:

- `0000_render_baseline.sql`: original 21-table application baseline.
- `0001_staff_auth.sql`: additive credentials, sessions and staff-mail tables.

### Deliberately empty installation

Only on a confirmed empty approved target, with PostgreSQL tools:

```sh
psql "$DATABASE_URL" -X --set=ON_ERROR_STOP=1 --single-transaction \
  -f lib/db/migrations/0000_render_baseline.sql \
  -f lib/db/migrations/0001_staff_auth.sql
```

No automated deploy hook runs this. Never replay these files on an arbitrary
restored or already-migrated database.

### Existing production migration

1. Identify and authorize export of production, not development.
2. Check versions/extensions and rehearse encrypted schema+data restore into a
   new empty isolated database. Do **not** apply the baseline first.
3. Compare restored schema with both migrations/current Drizzle schema. A source
   already containing staff tables does not need `0001` replay. An older source
   may also need reviewed quota/outbox differences; `0001` alone is not proof
   that all historical differences have been reconciled.
4. For a compatible old 21-table schema missing all three staff tables, apply
   only reviewed `0001_staff_auth.sql` transactionally after backup/approval.
   Partial existing staff schema requires a reviewed reconciliation, not blind SQL.
5. Compare counts, constraints, sequences, dates, consent, opt-outs, matching,
   publication queues, memberships/grants and audit attribution. Prove reads/writes
   and a backup restore before cutover.

`pnpm --filter @workspace/db run schema:generate` generates future offline diffs
from checked-in snapshots. It neither inspects nor migrates a restored database.
Keep a destination migration record with reviewed file/checksum, release, date,
operator and backup evidence. Do not fabricate Drizzle history for unverified
restores. `push`/`push-force` are development tools, not production release steps.
No code in this task migrates Replit's managed production database.

Use provider-supplied TLS/connection settings and valid certificates. Never set
`NODE_TLS_REJECT_UNAUTHORIZED=0` or globally disable certificate validation.

## Staff and email setup

Follow [staff authentication](staff-authentication.md) for the explicit
`pnpm --filter @workspace/api-server run auth:bootstrap` command and staff
invitation/recovery flows. Retain legacy membership IDs and audits; approved staff
set passwords through new one-time email links. Never erase memberships or
globally activate users to make login work.

Follow [Resend setup](resend-setup.md) and [email operations](email-delivery-operations.md).
Verify destination domains/DNS, key/account permissions, approved sender/mailboxes,
real test inbox/spam receipt and signed callbacks at `/api/webhooks/resend`.
Do not claim delivery from an API key or mocked acceptance. Staff mail shares
transactional quota; CRM warnings remain when warning email cannot be sent.

Enable workers explicitly only after controlled setup. Keep subscriber publication
mode off until separate approval and reviewed backlog/cutoff. One always-on
instance is the starting contract; in-memory IP limits are not distributed.
Persistent mail claims, fencing and provider idempotency support interruption
recovery, not an exactly-once promise. Rehearse deploy overlap on the destination.
SIGTERM/SIGINT stop ticks, drain work/HTTP and close the pool within 25 seconds.

## Security, health and dependency inventory

- Persistent opaque sessions, password hashing, invitation/reset expiry and replay
  protection, per-request roles, origin/CSRF checks and production headers are
  described in the staff guide.
- `/api/healthz` is process liveness only and remains the initial Blueprint health
  path so incomplete destination setup can boot without pretending to be ready.
- `/api/readyz` returns safe 503 until staff origin/signing/sender, worker, Resend
  key/account/webhook settings and staff DB columns are available. It performs
  no provider network probes and does **not** certify sender verification,
  application data, inbox receipt, DNS, quotas or operational recovery.
- Complete the readiness register before public cutover. After setup an operator
  may select `/api/readyz` as Render's health path if its configuration-dependency
  semantics match the agreed operations policy.
- Clerk frontend/backend SDKs, provider components, server proxy and automatic
  enrollment/testing sessions are removed. Source tenant retirement is a later,
  separately approved action; no tenant deletion was performed.
- Direct Resend removes the connector runtime dependency. Replit Vite overlays/
  banner/cartographer are development-only and excluded from production plugins.
- `.replit`, artifact metadata and post-merge helpers are inert on Render. Do not
  copy workspace defaults. Render executes only the reviewed build/start commands.
- Sandbox/seeds remain source-only, not production startup dependencies. Only
  compiled public assets are served, not the repository or environment files.

## Acceptance, cutover and rollback

Use [production readiness](production-readiness.md) as the evidence register and
the [ownership/migration guide](client-owned-migration.md) for the complete
cutover sequence. Required external gates include approved resources/costs,
restore reconciliation, real staff/mail acceptance, worker recovery, backup
restore, custom domains/TLS, client administration and final DNS/campaign approval.

Pause all source writes/jobs for final sync; do not create two writable or sending
deployments. Keep source services available through the approved rollback window.
DNS rollback does not copy new destination records back; freeze/reconcile data
before recovery. Retire old hosting/provider access only after acceptance and
legacy-link continuity.

## Official references

- https://render.com/docs/blueprint-spec
- https://render.com/schema/render.yaml.json
- https://render.com/docs/monorepo-support
- https://render.com/docs/web-services
- https://render.com/docs/node-version
- https://render.com/docs/postgresql-creating-connecting
- https://render.com/docs/postgresql-backups
- https://render.com/pricing

Recheck provider details, available plans and pricing before provisioning.
