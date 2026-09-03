---
name: Scoped workspace packages
description: How to add dependencies to an artifact package without accidentally targeting the monorepo root.
---

For dependencies used by one artifact, target that artifact's pnpm workspace package explicitly rather than attempting a generic root add.

**Why:** The generic language-package installer runs from the workspace root, rejects unintended root additions, and does not accept pnpm filter flags as package tokens.

**How to apply:** Use the package-management flow first. If its generic installer cannot express the required workspace scope, use pnpm's filtered add command for the named artifact package and verify its package manifest and lockfile.