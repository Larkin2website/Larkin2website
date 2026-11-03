# HETV Opportunities Hub

Public HETV Opportunities Hub role listings backed by PostgreSQL, plus the separate Larkin2 portal for managing opportunity content, lifecycle, access, and audit history. The public hub covers multiple productions; its existing domain, URLs and deployment routing remain unchanged.

The user's explicit correction, “change the name, but leave the domain for the moment,” supersedes the feedback PDF's proposed HETVOpportunitiesHub.com domain. Domain purchase, hostname routing and publishing are excluded from this website-feedback work.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — build and run the API server on `PORT`
- `pnpm --filter @workspace/larkin2-opportunities run dev` — run the public opportunities site
- `pnpm --filter @workspace/larkin2-opportunities-portal run dev` — run the management portal
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — alias for the focused Render production build
- `pnpm build:render` — focused production build for all three websites and the API; excludes the sandbox and seeds
- `pnpm check:render` and `pnpm test:render` — inspect built prefixes/Blueprint and exercise the native production server without real auth/mail keys
- `pnpm start` — production server from the repository root; requires runtime settings described in `docs/render-deployment.md`
- `pnpm --filter @workspace/api-server run test` — run focused API domain, validation, and authorization tests
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed:opportunities` — idempotently import the six original public role records
- `pnpm --filter @workspace/scripts run seed:opportunity-options` — idempotently provision default categories and backfill categories from historical opportunities
- Required environment names: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
- Managed Replit production injects `VITE_CLERK_PROXY_URL`. Render/external mode does not use that proxy; `build:render` clears it and requires a destination public-key rebuild after configuration.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Public and portal frontends: React 19, Vite, Wouter, TanStack Query
- Authentication: existing Replit-managed Clerk in workspace mode; explicit external Clerk configuration for the prepared Render deployment
- API: Express 5 with Clerk cookie authentication and role-based authorization
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle) plus Vite production frontend outputs

## Where things live

- `artifacts/larkin2-opportunities/` — public site; the Roles list and detail pages read the public opportunity API
- `artifacts/larkin2-opportunities-portal/` — authenticated management portal
- `artifacts/api-server/` — shared Express API for public and internal surfaces
- `lib/api-spec/openapi.yaml` — source of truth for all API paths and payloads
- `lib/api-client-react/src/generated/` — generated TanStack Query client; never edit by hand
- `lib/api-zod/src/generated/` — generated server validators; never edit by hand
- `lib/db/src/schema/` — relational opportunity, membership, and audit schema
- `scripts/src/seed-opportunities.ts` — idempotent migration of the original six hard-coded roles
- `scripts/src/seed-opportunity-options.ts` — explicit operator-run seed for default and legacy opportunity categories; not a Render startup hook
- The public visual system is rooted in `artifacts/larkin2-opportunities/src/index.css`; the portal theme is in its own `src/index.css`.

## Architecture decisions

- The public website and management portal remain separate Vite artifacts but share one Express API and one PostgreSQL database.
- OpenAPI is contract-first. Change `lib/api-spec/openapi.yaml`, then regenerate client hooks and server validators.
- Public reads expose only `published`, `closed`, and `filled` opportunities. Drafts and archived records never leave the protected API.
- Portal access has three roles: `super_admin`, `opportunity_manager`, and read-only `viewer`.
- The first authenticated account becomes the initial active Super Admin only when membership storage is empty. Every later first-seen account is inactive until approved by a Super Admin.
- Archive is the normal removal path. Permanent deletion requires a Super Admin, an already archived record, and explicit confirmation.
- Clerk-specific code is isolated to the provider, proxy middleware, and portal authorization boundary to preserve migration flexibility.

## Product

- Visitors can search all currently visible Larkin2 roles, open internal role-detail pages, and follow an application link only when one is configured on an open role.
- Approved staff can view dashboard counts and activity, search/filter/sort opportunities, create and edit full role content, preview the public layout, and manage publishing lifecycle.
- Super Admins can approve, suspend, and assign roles to portal members, inspect audit history, and permanently delete archived opportunities.

## User preferences

- Public pages retain the original paper-and-orange identity, original video hero and intro/scroll/reveal animations, with light or orange UI surfaces instead of dark backgrounds. Keep HETV Opportunities Hub naming, reduced-motion support and the separate portal's branding/theme unchanged.
- Roles are the primary public navigation.
- Never add thick decorative top-edge accent bars.

## Gotchas

- Use pnpm only.
- Do not hand-edit generated API client or generated Zod files.
- Managed Replit Clerk retains hostname-derived keys and `/api/__clerk`. External/Render mode uses explicit keys and no Replit proxy; do not reintroduce managed inference into that path.
- Development schema pushes do not migrate production. Replit's existing production schema uses its Publish flow; future Render schema/restore operations are explicit, reviewed manual steps in the Render runbook.
- Render startup performs no seeds or DDL. Approve any deliberately empty-install initialization separately; never overwrite restored editorial content on boot.
- The original hard-coded role array remains only as seed input; the public site must not import it at runtime.
- The current six imported records intentionally have null application URLs because no real Airtable links were provided.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- `docs/render-deployment.md` is the executable migration-preparation handover. No destination keys, real identity migration, email verification or traffic cutover have been performed; all destination key values are added only after migration.
