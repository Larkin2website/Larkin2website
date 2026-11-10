# Client-owned migration guide

## Recommended and agreed stack

| Responsibility | Recommendation | Reason |
| --- | --- | --- |
| Source and releases | Client-owned GitHub organisation/private repository | Portable code, reviewed changes and reproducible releases |
| All three websites/shared API | One paid always-on Render Node service | Matches Express/Vite and keeps cookies/API same-origin |
| Database | Paid Render PostgreSQL, same approved region | Preserves PostgreSQL/Drizzle and provides managed recovery options |
| Staff authentication | App-managed email/password in PostgreSQL | Client's confirmed choice: administrator invitations only, no public staff registration |
| Invitations, resets, enquiries, verification and alerts | Client-owned Resend account, direct API | Runtime configuration, shared quota controls, no Replit connector |
| Domains/DNS | Client-owned existing registrar; Cloudflare DNS if needed | Preserve existing domains/links without unnecessary registrar moves |
| Backups/monitoring | Client-controlled encrypted off-provider backup storage and uptime alerts | Independent recovery and client visibility |

The Clerk replacement is implemented, not an outstanding provider choice.
No destination account, paid resource, live data migration, sender verification
or DNS cutover has been performed. **All real destination values are supplied
after migration**, in the client-owned host's secret manager. This guide does
not authorize purchases, exports, restores or traffic changes.

Render/Resend remain managed infrastructure providers; client control means
ownership of accounts, billing, source, data, credentials and operations—not
ownership of provider infrastructure. A VPS would require additional security
patching and operations and is not the recommended first move.

## Architecture and ownership

```text
Client GitHub -> approved Render build/release -> one native Node service
  /larkin2-opportunities/         Public Opportunities Hub
  /larkin2-opportunities-portal/  Staff portal
  /hetv-audience-crm/             Audience & Engagement CRM
  /api/                          Shared API and signed Resend webhook
                  |
      Client Render PostgreSQL + direct Resend
```

The mockup sandbox is not a fourth production app. Build from the repository
root so workspace libraries/assets remain available. Express serves compiled
SPAs and APIs; production does not run three Vite servers. Preserve paths and
all approved legacy public preference/unsubscribe links.

Use one canonical HTTPS staff hostname. Approved legacy staff-page hosts redirect
there; host-only sessions are not automatically shared across domains. Public
legacy links keep their existing capability semantics. Set `ALLOWED_HOSTS` and
`STAFF_AUTH_ORIGIN` deliberately; do not use wildcard credentialed CORS.

Before provisioning, the client must own:

- GitHub organisation/repository and protected release branch.
- Render workspace, billing and recovery; approved capacity/region.
- Resend account, sender domain, billing and delivery webhook.
- Registrar/DNS, backup storage and monitoring.
- Named admin accounts with MFA and securely retained recovery access.
- A documented maintainer, approval owner, backup admin and offboarding process.

Developer access must be named, least-privilege and removable. Do not put client
production subscriptions under a developer's personal account. Confirm data
residency/privacy obligations and agreements; region selection is not a legal
compliance certificate.

## Migration phases

### 1. Prepare GitHub and destination

The repository includes pinned Node/pnpm, frozen lockfile, `render.yaml`,
production scripts, a CI workflow, blank `.env.example` and reviewed migration
SQL. Run the [Render runbook](render-deployment.md) exactly. Protect the production
branch; keep automatic deployment and subscriber campaigns off during migration.
Review Git history for accidental credentials and keep dumps/exports outside Git.
Confirm asset licences and availability; use client-owned object storage if
future media exceed sensible source-repository limits.

### 2. Rehearse database restoration

Obtain explicit export approval and identify the **actual production database**,
not development. Check PostgreSQL versions/extensions, tools, size, constraints,
sequences, connection limits and timezone. Never attempt a major-version downgrade.

For an authorized operator only, with private variables from a secret manager:

```sh
pg_dump --dbname="$SOURCE_PRODUCTION_DATABASE_URL" --format=custom \
  --no-owner --no-acl --file="$PRIVATE_BACKUP_PATH"
pg_restore --dbname="$EMPTY_TARGET_DATABASE_URL" --no-owner --no-acl \
  --exit-on-error "$PRIVATE_BACKUP_PATH"
```

Use a new empty isolated target, encrypt and restrict the backup, and verify the
target before executing. These commands have **not** been run by repository
preparation. Never combine full restore with blind baseline replay. Apply only
reviewed missing additive schema changes after comparison with the source.

The original 21-table baseline is followed by the additive three-table staff-auth
migration. The Render runbook distinguishes empty installation, old full restore,
and a source that already contains those tables. No schema/seed operation runs
at application startup; no `push-force` is a production migration strategy.

Preserve:

- Roles, complete role profiles, categories/options, publication states and dates.
- Programmes/sections and registration state; never overwrite edits with seeds.
- Subscriber preferences, consent, acquisition, suppression and unsubscribe state.
- Enquiries, communication/outbox attempts, quotas and signed provider event history.
- Membership IDs, active/suspended roles, pending grants and security audits.
- Legacy link hashes, relationships, indexes and sequence values.

Legacy test-session rows are inert, not valid staff access. Source provider
sessions/passwords are not portable; approved staff establish new passwords.
Choose whether to preserve the signing secret temporarily for public verification
continuity or deliberately expire/reissue outstanding challenges. Never rewrite
legacy management capability hashes. Protect retained source backups and avoid
exporting personal records into documentation.

Compare table counts, representative records, constraints, sequences and date-only
values; test reads/writes and a restored backup. A homepage loading is not proof
of a successful restore.

### 3. Configure authentication and email after migration

Use [staff authentication](staff-authentication.md), [Resend setup](resend-setup.md)
and [email operations](email-delivery-operations.md). Runtime values need only a
restart, not a frontend rebuild. There is no new Clerk account or browser auth key.

The first admin is explicitly selected by an operator bootstrap command; nobody
becomes admin by being the first visitor. Existing membership IDs remain intact.
The client then invites approved staff and assigns/reviews their existing roles.
CRM stays active-super-admin only; public subscribers never become staff accounts.

Verify the Resend sender domain/DNS, approved sender and receiving mailboxes.
An API key alone proves none of these. Configure signed delivery callbacks at
`/api/webhooks/resend`. Test signatures, duplicate events, actual inbox/spam
receipt and failure visibility using controlled mailboxes only.

Every recipient consumes the same Resend account allowance, including staff mail,
admin warnings and other applications on that account. The free allowance is not
a delivery guarantee. At a limit, mail pauses/defer rules apply and authorized CRM
admins see a persistent warning. Warning email uses reserved capacity where
possible but cannot be promised when the provider is exhausted/unavailable.
Any plan upgrade is the client's manual decision; the application buys nothing.

### 4. Destination acceptance

Complete the [production-readiness register](production-readiness.md) with date,
operator, release and evidence:

- All three sites/assets and deep-link refresh work on desktop/mobile.
- Staff invitation, password setup/reset, login/logout/expiry and role boundaries
  work; arbitrary credentials, old cookies, replay and suspended users fail.
- CRUD/lifecycle and audits preserve approved data and permissions.
- Public signup/verification/preferences/unsubscribe, including legacy links,
  remain functional and private.
- Sender verification, real test delivery, signed webhooks, quota warnings and
  controlled worker interruption/recovery succeed.
- Backup restore, alerts, HTTPS, client ownership and support responsibilities
  are proved—not merely configured.

Use isolated/anonymized staging data where possible. No smoke test sends to the
restored subscriber population. Technical `/api/readyz` is not a substitute for
this operational acceptance or mailbox/domain verification.

### 5. Cutover and rollback

1. Approve timing, downtime, recovery objectives, release, responsible operators
   and rollback decision owner. Back up DNS; verify TLS and provider access.
2. Pause **all** source writes, including subscriptions/enquiries and webhooks as
   coordinated, not just staff editing. Stop source sending and settle in-flight
   work before the final snapshot.
3. Securely export/restore final data, reconcile counts and schema, and keep
   destination campaigns off while performing bounded acceptance.
4. Switch DNS only after approval. Reopen destination writes only; leave the old
   site read-only/maintenance to avoid divergent cached-DNS writes.
5. Enable approved monitoring/staff-email workers. Subscriber campaigns need
   separate approval, reviewed backlog and activation cutoff. Never run source
   and destination live publication workers concurrently.
6. Monitor auth/API errors, database availability, forms, delivery and opt-outs.
   Keep source services intact for the agreed rollback window.

For a code-only fault, roll back to a schema-compatible release. For data issues,
freeze writes and reconcile destination-only changes first. DNS rollback alone
does not copy records back; avoid two writable/sending sites. Use staged additive
schema changes rather than automatically reversing data-bearing migrations.

## Operations, costs and retirement

Use paid always-on compute/database with client-approved recovery features.
The Blueprint's initial small tiers are proposals, not capacity guarantees or
all-inclusive quotes. Recheck current Render/Resend pricing, storage, backups,
bandwidth, build usage, taxes, domain and monitoring charges before purchase.
There is no external staff-authentication provider subscription in this setup.

Agree RPO/RTO, encrypted daily off-provider backups, retention and periodic restore
drills in addition to provider recovery. A nightly dump can lose nearly a day's
writes; managed backups are not proof of successful restoration. One service is
simple but shares failure/release/scaling impact across all three sites. Keep one
instance until distributed rate limits and worker overlap have been reviewed.

Client handover must demonstrate independent provider login, release/rollback,
backup restoration, staff invitation/offboarding, key rotation and quota handling.
Record costs, alerts, retention, renewals and maintenance ownership without
secrets. Retire source Replit hosting/database/integrations and the old source auth
tenant only after acceptance, recovery window and legacy-link continuity. Never
delete the source tenant as a prerequisite to password migration.

## References

- Exact commands/configuration: [Render runbook](render-deployment.md).
- Current verification and outstanding gates: [production readiness](production-readiness.md).
- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/monorepo-support
- https://render.com/docs/postgresql-backups
- https://render.com/docs/custom-domains
- https://render.com/docs/blueprint-spec
- https://render.com/pricing
- https://resend.com/docs

Recheck provider features/pricing before purchase. No provider preference is
permission to purchase services or move live data.
