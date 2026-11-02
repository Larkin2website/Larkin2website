# Client-Owned Migration Guide

Prepared: 12 October 2026
Status: direct Resend email portability, shared quota controls and CRM admin warnings are implemented. Real email verification and full hosting/database/auth migration, provider setup, and cutover remain incomplete.

Credential timing confirmed by the user: all key values will be added after
migration away from Replit. Keep destination secrets out of Replit and tracked
files; enter them in the client-owned host's environment/secret settings.
Run the live email acceptance checklist there before enabling subscriber
campaigns. Until then, missing email configuration intentionally prevents sending;
no live-delivery verification is claimed.

This guide covers HETV Opportunities Hub, Larkin2 Opportunities Portal, HETV Audience & Engagement CRM, and their shared API, PostgreSQL database, authentication, email, assets, domains, and operational handover. It recommends providers because the client has no preferred stack. Account creation, purchases, code changes, data exports, DNS changes, and retiring services require separate approval.

## Contents

- 1. Executive recommendation
- 2. Architecture and routing
- 3. Client ownership checklist
- 4. GitHub and reproducible releases
- 5. Hosting configuration and required changes
- 6. Background delivery and scaling
- 7. Authentication migration
- 8. Database migration and future schema releases
- 9. Secrets and environment configuration
- 10. Email, webhooks, and existing links
- 11. Staging and acceptance testing
- 12. Production cutover runbook
- 13. Rollback and recovery
- 14. Ongoing operations and costs
- 15. Client handover and retirement
- 16. Decisions still needed
- 17. Official references

## 1. Executive recommendation

Use the following client-owned services:

| Responsibility | Recommended provider | Reason |
| --- | --- | --- |
| Source code and release history | GitHub organisation and private repository | Standard repository ownership, collaboration, review, and automation |
| Websites and shared API | One paid, always-running Render Node web service | Fits the existing Express server; can serve all three compiled React apps and their API on the same origin |
| Persistent data | Paid Render PostgreSQL | Keeps the existing PostgreSQL/Drizzle model; colocates API and database; supports managed recovery on paid plans |
| Staff authentication | Client-owned Clerk application | Retains the existing auth library rather than replacing authentication technology during migration |
| Transactional and notification email | Client-owned Resend account, direct API connection | Retains the current email provider but removes reliance on Replit's connector |
| Domains and DNS | Client-owned registrar; Cloudflare DNS if a new DNS provider is needed | Separates domain control from hosting; do not move an existing working registrar unnecessarily |
| Operational oversight | Render logs/alerts plus a client-owned uptime monitor | Makes availability and service failures visible to the client |
| Long-term backup copies | Client-owned encrypted backup destination, such as a restricted S3 bucket | Keeps recovery copies outside the database service; retention must be agreed |

This is account ownership and portability, not ownership of provider infrastructure. Render, Clerk, and Resend remain managed vendors. A VPS or self-hosted identity system would offer more infrastructure control but introduce substantially more patching, security, and operational work. That is not the recommended first migration.

Use paid production compute and database plans. Do not base client production on a sleeping web service or a free database without recovery capabilities. Select actual capacity after measuring traffic, database size, memory usage, and expected email volume.

## 2. Architecture and routing

Keep one GitHub repository containing the three frontends, shared API, shared libraries, and release documentation. The canvas/mockup sandbox is a design tool, not a fourth client production app; it does not need a deployed service.

Recommended deployment:

    Client-owned GitHub repository
                  |
          approved build/release
                  |
       Render Node web service
          |-- /larkin2-opportunities/         public hub
          |-- /larkin2-opportunities-portal/  staff portal
          |-- /hetv-audience-crm/             audience CRM
          |-- /api/                           shared Express API
          |-- background publication delivery
                  |
       Render PostgreSQL, same region
                  |
       External Clerk and direct Resend

Serve compiled frontend files through Express in production. This static-serving layer needs to be added; the current API does not already replace Replit's frontend routing.

Retain existing path prefixes initially. Each mounted frontend needs its own index-page fallback for valid application routes. API routes must run before frontend fallbacks; unknown API requests must never return a website's index.html. Missing static assets should return an appropriate error rather than unrelated HTML. Set suitable caching for fingerprinted assets and avoid stale index-page caching. Preserve root redirects, public detail URLs, query strings, and canonical-link behavior.

If multiple existing hostnames are retained, point approved hostnames at the same Render service and make host-based landing redirects explicit. The code contains host-specific redirects, but domain ownership and which hostnames are live must still be confirmed. These are not proof that the client owns the domains.

One shared hostname is the simplest auth arrangement. Multiple hostnames must be validated against Clerk's multi-domain/session configuration; sharing a backend does not automatically share browser sessions. Authenticated API requests should remain same-origin for each website. If frontends are later separated into independent hosting services, deliberately configure credentialed requests, allowed origins, cookies, CSRF protection, and Clerk tokens instead of assuming the current relative requests will work.

Tradeoff: one service shares release timing, scaling, and failure impact across all three apps. It is recommended for migration simplicity; splitting services can be considered later if traffic or availability requirements justify it.

## 3. Client ownership checklist

The client creates or becomes the verified owner of every production account. Do not create production subscriptions under a developer's personal account and assume inviting the client later is equivalent to ownership.

- [ ] Client-owned GitHub organisation and private repository.
- [ ] Client-owned Render workspace, billing method, recovery details, and administrator access.
- [ ] Client-owned Clerk application with production instance and recovery access.
- [ ] Client-owned Resend account, sender domains, billing, and webhook configuration.
- [ ] Client-controlled domain registrar and DNS administration.
- [ ] Client-owned encrypted backup destination and monitoring account.
- [ ] MFA enabled for administrators; recovery codes stored securely.
- [ ] At least two appropriate recovery/administrative contacts where supported.
- [ ] Developer invited with a named account and minimum necessary privileges; no shared passwords.
- [ ] Service ownership, renewal responsibilities, billing, and offboarding procedures recorded.

Confirm where data may be stored, applicable privacy obligations, provider agreements, and retention requirements before creating the production database. Do not infer legal compliance from selecting a region.

## 4. GitHub and reproducible releases

Keep the repository root as Render's build root because the apps import shared workspace libraries. Render documentation warns that files outside a configured root directory are unavailable at build/runtime; setting the root to only the API artifact would exclude shared dependencies.

Repository preparation must include:
- The application code, shared libraries, pnpm workspace configuration, dependency lockfile, and approved deployment documentation.
- A pinned, supported Node version compatible with the existing Node 24 project and a pinned pnpm version matching the lockfile.
- Reviewed dependency versions; avoid unexpected upgrades from unbounded auth package versions during migration.
- Secret-free environment examples and a documented Render service specification, ideally a reviewed render.yaml without secret values.
- Explicit production builds for only the three websites and API. Do not deploy or require the design sandbox.
- GitHub checks for library/application typechecking, focused API tests, and production builds.
- Protected production branch and a clear approval process. Keep production auto-deploy disabled during cutover preparation; enable an agreed release process afterward.

This guide is stored at docs/client-owned-migration.md and linked from the repository README.md so it is included with the source code in GitHub. The original task-planning copy lives under .local, which is excluded by .gitignore; use this tracked guide as the client handover document. Update it when implementation decisions or provider behavior change.

Never commit environment files containing secrets, database dumps, authentication exports, user records, recovery codes, or backup archives. Inspect repository history as well as current files for accidental secrets. Rotate any exposed credentials. Check that fonts, images, and videos used by the websites are present and licensed; large durable assets may need client-owned object storage and revised URLs instead of Git history. Do not deploy Replit's internal tools or workspace caches.

## 5. Hosting configuration and required changes

The following is a target specification, not a configuration that has already been tested.

| Setting | Proposed value |
| --- | --- |
| Render service type | Paid Node web service |
| Repository root | Repository root, not an individual artifact directory |
| Runtime | Pin a tested Node 24 release and matching pnpm version |
| Runtime environment | NODE_ENV=production |
| Port | Use Render's injected PORT; bind to the host interfaces needed by Render |
| API health check | /api/healthz |
| Start command after builds | node --enable-source-maps artifacts/api-server/dist/index.mjs |
| Database | Paid Render PostgreSQL in the same approved region; internal connection where supported |
| Frontends | Three Vite production outputs mounted at their current base paths |

Build sequence to implement and verify:
1. Install workspace dependencies using pnpm install --frozen-lockfile.
2. Build/typecheck shared libraries before application checks.
3. Build each of the three frontend packages with its own BASE_PATH and correct Vite Clerk publishable key.
4. Build the API with its existing esbuild script.
5. Deploy only when checks and all outputs succeed.

Current frontend Vite configuration requires both PORT and BASE_PATH even during builds. Refactor that portability restriction so frontend compilation does not need a running frontend port, or supply explicit build-only values until it is changed. One global BASE_PATH cannot represent all three builds; set it per command/package. The current output folders are each artifact's dist/public directory.

Remove or isolate Replit-specific Vite development plugins and production reliance on artifact/workflow configuration. Replace managed Clerk host/key inference and proxy assumptions with a supported external Clerk configuration. Email now uses direct runtime-configured Resend; follow [portable email setup](resend-setup.md), configure destination values, restart, and test rather than rewriting it. Add production static serving, fallback routing, trusted-proxy handling appropriate to Render, and safe hostname validation.

The existing Replit production startup runs the opportunity-option seed before accepting traffic. Review whether that exact idempotent category setup is still required and perform it as an explicit release operation. Do not replace it with broad opportunity/programme seeding or overwrite editorial records on every boot.

Keep OpenAPI as the API contract source of truth. Regenerate generated hooks/validators if an API contract changes; never hand-edit generated files.

## 6. Background delivery and scaling

The API starts a periodic publication-delivery worker. A paid always-running service is recommended so processing is not tied to incoming web requests. Initially, retaining it in the API process is the smallest change, provided restart/deploy overlap is safe.

Before enabling production email:
- Verify database claim/lease behavior under simultaneous old/new instances and deploy overlap.
- Verify retries, timeouts, failure visibility, and graceful shutdown.
- Use stable provider idempotency keys where supported and appropriate; a database claim alone does not guarantee exactly-once sending if a process dies after sending but before recording success.
- Make worker enablement and staging suppression explicit, and prove they work.
- Keep only one intended active deployment processing the production queue during cutover.

If the API scales to multiple replicas or independent email availability is required, extract delivery into a dedicated Render background worker and remove it from API startup. A separate worker needs its own build/start contract and reviewed queue/lease behavior; it is not already configured.

In-memory rate limits are per process and reset on deploy. Assess whether database/shared-store limits are necessary before multi-instance scaling. Do not claim high availability from a single small service.

## 7. Authentication migration

The project currently uses Replit-managed Clerk. The destination is a new client-owned Clerk application, unless an authorized, supported tenant transfer is confirmed.

Do not assume managed-tenant transfer, user-export access, password-hash access, or preservation of Clerk user IDs. The source is a managed tenant. Authorized dashboard/export/transfer access must be confirmed through the source platform before promising continuity; access available to one operator does not establish client ownership.

Preferred process:
1. Inventory authorized production staff identities and application memberships/roles without placing personal data in this document.
2. Confirm the supported export/import or transfer path with the source and destination providers. Keep the existing tenant intact.
3. If supported, import eligible production identities using approved tools and create an explicit old-ID to new-ID mapping.
4. If export/import is unavailable or unnecessary for the small staff population, re-invite approved staff into the client-owned app and securely reconcile memberships. Tell staff whether re-verification or password setup is required.
5. Update both portal and CRM providers and API middleware, production domains, allowed redirects, and login methods.
6. Preserve active/inactive membership state, all roles, access grants, and audit attribution. Where historical actor IDs cannot be replaced safely, preserve them as historical attribution rather than deleting or reassigning history.
7. Provision the initial client super-admin deliberately. Do not rely on first-login auto-admin behavior after restoring existing membership data.
8. Test authentication, authorization, account suspension, logout, and unauthenticated API rejection in both apps.

Source development users and source production users are separate. Existing sessions are not assumed portable; plan for staff to sign in again. Subscriber records in PostgreSQL are not automatically staff Clerk accounts and should not be turned into auth users.

Required production flags: PUBLIC_TEST_LOGIN_ENABLED=false and DEV_DEMO_LOGIN_ENABLED=false. Remove or disable frontend testing-login entry points and ensure backend bypasses remain disabled. PORTAL_DEMO_MODE must not grant production access. Test arbitrary credentials and expired temporary sessions as negative cases. The current permissive testing policy was intentional for testing, not appropriate for client production.

## 8. Database migration and future schema releases

Export the actual production database, not the development database. Confirm source PostgreSQL version, extensions, schema objects, database size, connection limits, and target compatibility. Use a compatible pg_dump/pg_restore version and provider-supported secure access.

A safe rehearsal restores into a new empty staging database, not over a populated target. Backups are sensitive: encrypt them, restrict access, keep them out of GitHub, and delete temporary copies under an agreed retention policy.

Example commands for an authorized operator, NOT executed by this guide:

    pg_dump --dbname="$SOURCE_PRODUCTION_DATABASE_URL" --format=custom --no-owner --no-acl --file="$PRIVATE_BACKUP_PATH"
    pg_restore --dbname="$EMPTY_TARGET_DATABASE_URL" --no-owner --no-acl --exit-on-error "$PRIVATE_BACKUP_PATH"

These variable names are placeholders, not existing project secrets. Supply credentials through an approved secret store; do not paste them into chat, documents, shared shell history, or logs. Verify target identity before every restore. The example deliberately avoids destructive clean/drop flags.

Preserve and reconcile:
- Opportunities, complete role content, category/options, dates, and publication states.
- Programmes, sections, registration state, and editorial content.
- Audience/CRM records, preferences, website-purpose selections, consent and acquisition metadata, and unsubscribe state.
- Enquiries, communication batches, delivery queues, attempts, and provider event history.
- Staff memberships, access grants, permission states, and historical audit records.
- Legacy preference/unsubscribe capability hashes and other link-validation data.
- IDs, relationships, constraints, indexes, sequence values, and relevant extensions.

Exclude or invalidate temporary test-login sessions deliberately; do not migrate them as valid staff access. Verification challenges and session-signing secrets need a specific decision: either preserve securely for a justified short compatibility period or invalidate in-flight codes and require a fresh request. Do not confuse SESSION_SECRET with legacy management-token hashing; existing legacy management capability hashes must remain unchanged.

Rehearsal verification should compare table counts and representative records, sequence/identity behavior, constraints, date-only values, and application reads/writes. Opening a page is not a restore test.

The repository has historical SQL files and development Drizzle push commands, but this does not prove a complete production migration chain. Build and validate a baseline from the restored schema, identify already-applied changes, and adopt a reviewed versioned migration workflow. Do not replay all historical SQL blindly or use push-force against production. Database migrations should run as a controlled release step, with a backup and compatibility checks; not on every API request or boot.

## 9. Secrets and environment configuration

Store actual values in the client-owned hosting/provider secret managers. Only the Clerk publishable key is intended for browser bundles; database credentials, Clerk secret keys, Resend keys, webhook secrets, and SESSION_SECRET must never use VITE_ variables or appear in frontend output.

| Name | Location/purpose | Migration handling |
| --- | --- | --- |
| DATABASE_URL | Backend; PostgreSQL connection | New client database connection, private/internal where possible |
| CLERK_SECRET_KEY | Backend only | New client-owned Clerk production secret |
| CLERK_PUBLISHABLE_KEY | Backend auth configuration | Match the client-owned instance |
| VITE_CLERK_PUBLISHABLE_KEY | Portal/CRM build-time public key | Correct environment-specific key; rebuilding is required when changed |
| VITE_CLERK_PROXY_URL | Existing managed proxy config | Remove or deliberately replace for external Clerk; do not keep a broken Replit dependency |
| SESSION_SECRET | Backend verification/signing | Secure destination value; explicitly decide code invalidation/compatibility |
| RESEND_API_KEY | Direct-email backend secret | Implemented for all three email flows; configure at runtime and restart, no connector required |
| RESEND_WEBHOOK_SECRET | Backend event verification | Store the destination Resend endpoint's signing secret; never reuse blindly across endpoints |
| CONTACT_ENQUIRY_FROM | Backend enquiry sender | Explicit approved client sender; verify domain |
| CONTACT_ENQUIRY_TO | Backend enquiry recipient | Optional validated override; omission retains the existing approved product mailbox |
| SUBSCRIPTION_VERIFICATION_FROM | Backend verification sender | Explicit client sender; remove reliance on developer-domain fallback |
| PUBLICATION_EMAIL_FROM | Backend notifications sender | Explicit verified sender |
| PUBLIC_OPPORTUNITIES_URL | Backend email links | Confirm canonical public URL and current prefixes |
| PUBLICATION_EMAIL_MODE | Publication controls | No live sending in staging; controlled activation in production |
| PUBLICATION_EMAIL_APPROVED | Publication approval gate | Enable only after approved sender and tests |
| PUBLICATION_TEST_EMAIL | Controlled testing | Test inbox only; not a client data export destination |
| PUBLICATION_ALERTS_ACTIVATED_AT | Alert activation cutoff | Set after reviewing backlog; prevent unintended historical alerts |
| PUBLIC_TEST_LOGIN_ENABLED | Backend testing bypass | false in client production |
| DEV_DEMO_LOGIN_ENABLED | Development testing bypass | false in client production |
| PORT, NODE_ENV | Backend runtime | Render PORT; production environment |
| BASE_PATH | Individual frontend build | Existing prefix per app; not one shared global value |

Inventory additional domain/auth/runtime settings during hosting migration. The contact recipient now supports the runtime override listed above; confirm mailbox ownership and destination rather than silently substituting a developer mailbox. The optional repository-root `.env` loader preserves injected host values; see `.env.example` and the email setup guide.

Rotate destination provider credentials as appropriate. If a signing secret is temporarily retained for compatibility, record why, restrict access, and schedule rotation. Never document actual secret values in this guide.

## 10. Email, webhooks, and existing links

All email paths (contact enquiries, subscription verification, and publication/test delivery) now use direct Resend. Supply runtime credentials, account ID, senders, URLs, warning recipient and webhook secret using [portable email setup](resend-setup.md); no email rebuild is needed when those values change. Shared quota protection and CRM warnings are covered in [Email Delivery Operations](email-delivery-operations.md). Explicit failures and neutral subscription-verification responses are preserved; no live provider delivery has been verified by mocked tests.

In the client Resend account:
- Verify approved sending domains and configure DNS records supplied by Resend. Review SPF, DKIM, and DMARC without breaking existing mail delivery.
- Use the subscriber's address as reply-to where appropriate, not as an unauthorized from address.
- Configure the destination delivery-event webhook at the approved hostname plus /api/webhooks/resend.
- Verify signatures against raw request bytes and the new endpoint secret; test replay/duplicate event handling.
- Coordinate old and new webhook endpoints so in-flight events are not lost and duplicate callbacks do not double-count.
- Honor unsubscribe/suppression state, bounce/complaint handling, provider limits, and retry backoff.
- Prove staging cannot send to the restored subscriber population. Redirection to a test inbox or a verified non-sending mode must cover every email code path, not just the publication worker.

Preserve existing public domains and paths wherever possible so previously sent preference/unsubscribe links continue to resolve. If a hostname cannot be retained, obtain control of an approved redirect/compatibility endpoint and verify complete path/query preservation. A generic homepage redirect is not enough for token-bearing links. Never expose these URLs in logs or analytics.

## 11. Staging and acceptance testing

Use a separate database, Clerk environment/application configuration, and controlled email setup. Restrict staging access. Production-derived data should be minimized/anonymized where feasible; maintain equivalent link/permission behavior for testing and protect any real data retained for rehearsal.

Acceptance checklist:
- [ ] All three websites load, navigate, refresh deep links, and display their assets on desktop/mobile.
- [ ] Public roles/programmes show correct visible states, links, dates, filters, and content.
- [ ] Draft and archived content remains protected.
- [ ] Portal and CRM sign-in, sign-out, redirects, expiry, and permitted multi-host behavior work.
- [ ] Approved roles behave correctly; suspended/inactive accounts and arbitrary credentials are rejected.
- [ ] Client super-admin can manage access without accidental first-user promotion.
- [ ] Create/edit/publish/close/archive flows preserve data and audit history.
- [ ] Permanent deletion remains permission-gated and confirmation-gated.
- [ ] Subscriber signup, verification, preferences, and unsubscribe work, including legacy links.
- [ ] Neutral verification responses preserve privacy and production rate limits remain effective.
- [ ] Enquiries reach only the approved test mailbox during staging, then the approved client mailbox in production.
- [ ] Delivery retries, webhook verification, duplicate events, suppression, and worker restart behavior are verified.
- [ ] No old publication backlog is sent unintentionally.
- [ ] Database counts, relationships, sequences, editorial dates, and representative records match the approved source.
- [ ] A backup has been restored successfully and the application checked against it.
- [ ] Logs exclude credentials, private tokens, full subscriber URLs, and unnecessary personal data.
- [ ] CI builds from a fresh clone without Replit runtime services.
- [ ] Alerts and provider access are visible to the client.

Record results, date, responsible person, and outstanding exceptions separately. This document does not assert any checklist item has passed.

## 12. Production cutover runbook

Before the scheduled window:
1. Obtain client approval for downtime, staff re-login, data migration, and DNS changes.
2. Complete staging checks, rehearse timing, verify target capacity, and record the approved release identifier.
3. Back up DNS configuration and confirm domain access, Clerk domain verification, and destination TLS readiness.
4. Lower DNS TTL ahead of the window if appropriate. Establish a clear rollback decision owner.
5. Take an initial secure source backup and confirm recoverability. Disable automatic deployments for the window.

During the window:
1. Pause writes across all apps, including public subscriptions/enquiries; pausing portal edits alone is not sufficient. Display a clear temporary notice rather than claiming submissions were saved.
2. Stop source email delivery and other mutating background tasks; allow in-flight work to settle. Define how in-flight webhook callbacks are handled before taking the final snapshot.
3. Create the final production export and restore it into the verified empty destination. Reconcile record counts, delivery state, and approved staff identity mappings.
4. Apply only reviewed, necessary destination schema changes; keep senders/workers disabled until state is verified.
5. Start destination services and perform protected smoke checks without sending to subscribers.
6. Switch approved DNS/routing and verify public, portal, CRM, auth redirects, API, and HTTPS from outside the old environment.
7. Reopen writes on the destination only. Leave the old deployment read-only or in maintenance so visitors with cached DNS cannot create divergent records.
8. Activate verified email/webhook processing with approved cutoff and queue state; ensure the source worker remains stopped.
9. Monitor sign-in, application errors, database connectivity, enquiries, delivery failures, and unsubscribe behavior.

Do not delete the old database, tenant, or deployment during the cutover. A finite rollback/observation window must be agreed with the client; its duration is not assumed by this guide.

## 13. Rollback and recovery

Separate code rollback from database rollback. An older build may not understand a changed schema, and DNS rollback does not copy new data back.

- Before destination writes begin: keep source workers disabled while assessing; restore routing to the intact source only when its auth and sender configuration are still valid, then reopen source writes deliberately.
- After destination writes begin: freeze both systems, export destination changes, and reconcile against the source before reopening it. Include new subscriptions, opt-outs, editorial changes, audit events, delivery state, and webhook events. Never undo an unsubscribe or resend completed notifications because a backup is older.
- If auth identities changed: source and destination identity mappings require separate review; staff may need different sign-in instructions during rollback.
- For code-only failures: prefer a compatible prior build against the current database when safe rather than restoring old data.
- For data corruption: restore into a new database, validate it, then switch connections under a controlled write freeze. Preserve evidence and logs without exposing personal data.

Success criteria for rollback: one authoritative writable database, correct staff access, preserved subscriber consent/opt-outs, and one intended email processor. Document how duplicates and post-cutover records were reconciled.

## 14. Ongoing operations and costs

Budget categories, not a fixed quote:
- Always-running Render web compute, build usage, network egress, and any workspace/collaboration charges.
- Paid PostgreSQL compute, storage, recovery capability, and capacity growth.
- Staging resources and, if later required, a dedicated email worker.
- Clerk active-user/features usage and any required paid authentication features.
- Resend message volume and sending-domain/features charges.
- Domain renewals, backup object storage, monitoring, and ongoing maintenance.

Verify live provider pricing and included features before purchase. This guide does not promise a total monthly price or that free auth/email tiers satisfy the client. Choose spending alerts and who approves upgrades.

Render's current documented recovery window for paid Postgres depends on workspace plan: Hobby 3 days; Pro or higher 7 days. Logical exports are retained for 7 days. These figures were checked on the preparation date and must be rechecked at purchase. They are not a substitute for agreed retention or restore tests.

Set client-approved recovery objectives: maximum tolerable data loss (RPO) and maximum outage (RTO). A nightly export alone can lose nearly a day of writes; provider PITR and independent exports serve different purposes. Proposed baseline is managed PITR plus encrypted daily off-provider backups, with retention agreed to privacy/business needs and periodic restore drills. Select an appropriate bucket region and restrict access. Do not promise the baseline has been configured.

Operational runbook should cover releases, schema changes, credential rotation, staff offboarding, failed email processing, database restoration, availability incidents, and domain/SSL issues. Assign an operator: managed hosting does not eliminate application maintenance, dependency updates, or response to incidents.

## 15. Client handover and retirement

- [ ] Client signs in independently to GitHub, Render, Clerk, Resend, DNS, backup, and monitoring services.
- [ ] Client owns billing and recovery, not merely collaborator access.
- [ ] GitHub contains current deploy/run/environment documentation and this approved migration guide in a tracked docs directory.
- [ ] Client receives a provider/service inventory with links and responsibilities, without passwords or private keys.
- [ ] Secure credential/recovery-code access is handed over through an approved password manager/secret store.
- [ ] Domain renewal, backup retention, alert recipients, and maintenance ownership are confirmed.
- [ ] Client has demonstrated a basic release/rollback and understands staff-access administration.
- [ ] Rollback/observation window is closed explicitly after client acceptance.
- [ ] Retained source backups and private export files follow the agreed retention/deletion policy.
- [ ] Old Replit hosting, managed integrations, auth, and database are retired only after dependencies and legacy-link continuity are confirmed.
- [ ] Obsolete developer credentials and unnecessary developer access are revoked with client approval.

## 16. Decisions still needed

The providers are recommended; these implementation details require confirmation:
1. Who will be the client's primary and backup administrators?
2. Which existing domains are owned by the client and must remain unchanged?
3. Is one canonical hostname acceptable, or must all three branded hostnames remain?
4. Which database region, data-retention policy, and provider agreements are required?
5. What downtime and recovery objectives are acceptable?
6. How many real staff identities exist, and is supported identity export/transfer available?
7. Who owns the sender domain and approved receiving mailbox?
8. What traffic, data size, email volume, and budget should capacity planning use?
9. Who will maintain the system after handover?

Do not guess answers or treat absence of a provider preference as approval to buy subscriptions or move live data.

## 17. Official references

Checked or used on 12 October 2026. Recheck provider behavior and pricing at implementation.

- Render Node/Express hosting: https://render.com/docs/deploy-node-express-app
- Render monorepo roots and build filters: https://render.com/docs/monorepo-support
- Render PostgreSQL backups/recovery: https://render.com/docs/postgresql-backups
- Render custom domains/TLS: https://render.com/docs/custom-domains
- Render pricing: https://render.com/pricing
- Clerk migration overview: https://clerk.com/docs/guides/development/migrating/overview
- Clerk documentation: https://clerk.com/docs
- Resend documentation entry point: https://resend.com/docs
- Replit production/development database documentation: https://docs.replit.com/features/data-and-storage/development-and-production
- Replit Clerk documentation: https://docs.replit.com/features/auth-and-identity/clerk-auth

Clerk's generic migration documentation does not establish permission to export or transfer a Replit-managed tenant. Resolve source access separately; never delete the source authentication system as a prerequisite to investigating migration.
