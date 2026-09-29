---
name: Publish-time code synchronization
description: Caution about verification when publication happens before an assigned task is completed.
---

When a user publishes while an assigned task is still in progress, inspect the changed files and rerun relevant static checks before completing the task, even if they passed before the publication.

**Why:** In one such handoff, previously unique additions appeared twice after publication, and completion validation caught a TypeScript duplicate-property error that had not existed during the earlier typecheck. The exact synchronization mechanism was not established, so treat this as a concurrency risk rather than a guaranteed publish behavior.

**How to apply:** After the user's publication confirmation, verify the live behavior and then rerun local typecheck and focused tests against the current working tree before final completion.