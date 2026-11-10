# HETV Opportunities Project

This repository contains the public HETV Opportunities Hub, Larkin2 Opportunities Portal, HETV Audience & Engagement CRM, and their shared API and PostgreSQL libraries.

## Client-owned migration

Read the [Client-Owned Migration Guide](docs/client-owned-migration.md) for recommended providers, account ownership, required portability changes, data and authentication migration, deployment, testing, cutover, rollback, backups, costs, and client handover.

The repository targets one paid Render Node service serving all three websites and the API, with Render PostgreSQL, app-managed invitation-only staff authentication and direct Resend. **No destination provisioning, data transfer, live email verification or DNS cutover has been performed.** See [production readiness](docs/production-readiness.md) and [staff authentication](docs/staff-authentication.md).

Start with the [Render Deployment Runbook](docs/render-deployment.md): exact commands, Blueprint, environment matrix, schema/restore paths, Replit dependency inventory, verification gates and rollback. All destination key values are entered only after migration, on the client-owned host.

```sh
corepack enable
pnpm install --frozen-lockfile --prod=false
pnpm build:render
pnpm check:render
pnpm test:render
# Only with destination runtime/database settings configured:
pnpm start
```

Applying `render.yaml` can create paid resources and an initial deploy; it requires separate approval. Automatic redeploys and email workers are disabled in the proposal.

## Email configuration

Email uses direct Resend with server-side runtime settings. See
[Portable Resend Setup](docs/resend-setup.md) and the secret-free
[environment example](.env.example). Set credentials privately, restart the API,
and conduct approved controlled tests on the destination; Resend runtime changes
do not require rebuilding. Authentication also uses server runtime configuration;
there is no browser authentication key. No real email is sent by automated checks.

## Existing project operations

See [Project Context and Run Instructions](replit.md) for the current application's structure and workspace commands.
