---
name: Workspace package installs
description: Package installation helper cannot target individual artifact packages in this pnpm workspace
---

For a dependency owned by one artifact, use a workspace-filtered pnpm add command rather than the generic package installation helper.

**Why:** The helper runs pnpm add at the workspace root, which pnpm refuses; passing --filter as a package token is rejected before the command runs. A filtered pnpm command installs the package in the owning artifact and updates its lockfile importer correctly.

**How to apply:** When adding an artifact-specific npm dependency in this monorepo, identify the artifact package name first and scope the add operation with pnpm --filter.