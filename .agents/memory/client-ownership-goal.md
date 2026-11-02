---
name: Client ownership goal
description: Ownership requirements for moving all three apps outside Replit.
---

The user wants all three apps/websites outside Replit so the client has full control of hosting, database, authentication, integrations, and related services. The client has no preferred providers; recommend a stack rather than assuming an existing provider choice.

**Why:** The user explicitly requested a traditional GitHub-to-hosting setup with client ownership and comprehensive Markdown documentation.

**How to apply:** Keep production accounts, billing, repository ownership, domain control, and recovery access with the client. A recommended provider is not authorization to purchase services, change authentication, migrate data, or switch live traffic.

The user explicitly chose Resend and wants to move its integration by replacing environment/secret values and testing, rather than rewriting it for a new host.

**Why:** The user wants email portability before leaving Replit.

**How to apply:** Keep email credentials and host/account-specific settings server-side and runtime-configurable. Do not reintroduce a mandatory platform connector or claim all other hosting/auth migration work is covered by portable email settings.
