# Larkin2 Opportunities

Public Larkin2 role listings backed by PostgreSQL, plus a separate authenticated portal for managing opportunity content, lifecycle, access, and audit history.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — build and run the API server on `PORT`
- `pnpm --filter @workspace/larkin2-opportunities run dev` — run the public opportunities site
- `pnpm --filter @workspace/larkin2-opportunities-portal run dev` — run the management portal
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run test` — run focused API domain, validation, and authorization tests
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed:opportunities` — idempotently import the six original public role records
- Required environment names: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
- Production injects `VITE_CLERK_PROXY_URL`; leave it empty in development so Clerk uses its development frontend API directly.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Public and portal frontends: React 19, Vite, Wouter, TanStack Query
- Authentication: Replit-managed Clerk
- API: Express 5 with Clerk cookie authentication and role-based authorization
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/larkin2-opportunities/` — public site; the Roles list and detail pages read the public opportunity API
- `artifacts/larkin2-opportunities-portal/` — authenticated management portal
- `artifacts/api-server/` — shared Express API for public and internal surfaces
- `lib/api-spec/openapi.yaml` — source of truth for all API paths and payloads
- `lib/api-client-react/src/generated/` — generated TanStack Query client; never edit by hand
- `lib/api-zod/src/generated/` — generated server validators; never edit by hand
- `lib/db/src/schema/` — relational opportunity, membership, and audit schema
- `scripts/src/seed-opportunities.ts` — idempotent migration of the original six hard-coded roles
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

- Use Larkin2 orange `#f4773f` and dark production colors `#171b1d` / `#101315`.
- Roles are the primary public navigation.
- Never add thick decorative top-edge accent bars.

## Gotchas

- Use pnpm only.
- Do not hand-edit generated API client or generated Zod files.
- Replit Clerk must keep `publishableKeyFromHost`, unconditional `VITE_CLERK_PROXY_URL`, full base-path auth routes, and the canonical `/api/__clerk` server proxy.
- Development schema pushes do not migrate production. Apply schema changes through the Replit publish flow before expecting them in production.
- The original hard-coded role array remains only as seed input; the public site must not import it at runtime.
- The current six imported records intentionally have null application URLs because no real Airtable links were provided.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
