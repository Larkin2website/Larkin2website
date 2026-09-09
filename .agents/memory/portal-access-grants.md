---
name: Portal access grants
description: Why pending portal access remains separate from authenticated membership records until claim.
---

Pending access grants must remain independent records until an authenticated identity claims the matching normalized email. Existing membership identity keys should stay required and stable.

**Why:** Making existing membership identity keys nullable requires a destructive schema transition and data backfill during publishing. An additive grants table preserves current memberships and keeps pending access distinct from authenticated access.

**How to apply:** Extend the grant lifecycle in its own table, and transfer a grant into the authenticated membership table atomically when a trusted identity claims it. Preserve the administrator-selected name, role, and active state during transfer. Serialize grant creation, administrative updates, and identity claims through the same database lock so a successful suspension or role reduction cannot be overwritten by a concurrent claim. If a stale update follows a completed claim, return an explicit conflict rather than reporting success.

Only a verified primary email from the identity provider may claim an email-matched grant. Missing, synthetic, or unverified addresses must fail closed before grant resolution.