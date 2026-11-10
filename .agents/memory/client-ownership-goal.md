---
name: Client ownership goal
description: Ownership requirements for moving all three apps outside Replit.
---

The user wants all three apps/websites outside Replit so the client has full control of hosting, database, authentication, integrations, and related services. The user has selected Render as the hosting destination; recommend client-owned supporting providers rather than assuming existing database/auth accounts.

**Why:** The user explicitly requested a traditional GitHub-to-hosting setup with client ownership and comprehensive Markdown documentation.

**How to apply:** Keep production accounts, billing, repository ownership, domain control, and recovery access with the client. A recommended provider is not authorization to purchase services, change authentication, migrate data, or switch live traffic.

Prepare the project for Render, update all migration documentation, and remove or disable Replit configuration that would prevent it from running successfully on Render.

**Why:** The user explicitly chose Render and requested migration preparation.

**How to apply:** Audit actual production dependencies instead of deleting every
Replit-named file indiscriminately; distinguish repository readiness from approved
external provisioning, real data migration and traffic cutover.

The user explicitly chose Resend and wants to move its integration by replacing environment/secret values and testing, rather than rewriting it for a new host.

**Why:** The user wants email portability before leaving Replit.

**How to apply:** Keep email credentials and host/account-specific settings server-side and runtime-configurable. Do not reintroduce a mandatory platform connector or claim all other hosting/auth migration work is covered by portable email settings.

When email limits stop sending, the user wants an admin pop-up or email advising that the Resend plan must be changed if new mail needs to go out.

**Why:** The user explicitly requested admin notification rather than discovering quota failures later.

**How to apply:** Include actionable admin-facing quota warnings in email-delivery work; do not depend exclusively on sending a warning email through an already-exhausted allowance.

All key values will be added after migration away from Replit.

**Why:** The user explicitly specified this configuration timing.

**How to apply:** Do not request destination credentials in Replit. Keep examples
blank and document destination-host secret configuration and live verification
as post-migration steps, without claiming they have already passed.

The user explicitly requested: “we can forego clerk an just use the standard auth
we have set up.” Do not treat migration to client-owned external Clerk as
fulfillment of that request.

**Why:** The client's budget concerns motivated avoiding Clerk. The initial
Render preparation missed this instruction and retained Clerk.

**How to apply:** Treat replacing Clerk with standard application-managed
authentication as the intended direction. Verify the proposed replacement is
production-safe; arbitrary-credential testing access is not real authentication.
Distinguish implemented authentication from migration recommendations, and update
the provider inventory and handover documentation when the replacement is made.

The confirmed authentication requirements are email/password, administrator
invitations, no public registration, Resend for invitation and password-reset
emails, and enforced portal/CRM permissions.

**Why:** The user repeated the specific authentication choices after the Render
preparation incorrectly retained Clerk.

**How to apply:** Preserve these requirements rather than asking the user to
choose a provider again. The first administrator's email and approved sender are
destination configuration inputs; keep their values out of tracked documents
and do not request them before the agreed post-migration configuration stage.
