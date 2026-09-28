---
name: Public testing access
description: Intent behind the unusually open production testing policy
---

The owner explicitly chose to let anyone on the public published site enter any valid email and non-empty password and receive the same full Portal and CRM access as development testers, including production edits. This is intentional for the current testing phase, not an accidental missing authentication check.

**Why:** Before implementation, the owner was told that the published site is public and that such sessions can read, edit, delete, and publish production records. They explicitly selected full access rather than a restricted site or read-only access.

**How to apply:** Do not describe this as secure staff authentication or silently revert the agreed testing behavior while testing remains active. Keep the warning visible, avoid demo-triggered email sends, and replace this policy with verified staff sign-in before real public use. Reconfirm the policy if the project context changes.