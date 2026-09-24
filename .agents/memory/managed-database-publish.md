---
name: Managed database publish
description: Production schema changes for the project's Replit-managed PostgreSQL database
---

For the Replit-managed PostgreSQL database, apply additive schema changes to development with the normal Drizzle push, then use Replit Publish to apply the development-versus-production schema diff. A missing checked-in SQL migration is not itself evidence that production cannot be updated.

**Why:** Replit's managed database publish flow applies the schema diff; custom startup or deploy-time DDL would be unsafe.

**How to apply:** Confirm the database is still Replit-managed before advising on production changes. If it remains managed, follow the Publish UI and its rename/destructive-change confirmation rather than adding migration code to deployment. If production moves to an external database, revisit this rule and follow that database's documented migration path.