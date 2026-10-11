---
name: Programme seed safety
description: Why approved programme seed data must not run automatically after portal editing is enabled.
---

The approved static programme dataset is a recovery and reconciliation source. Keep its seed operation explicit; do not add it to routine application startup or publishing without first making the merge policy preserve portal-authored changes.

**Why:** Programme editors can change the same records through the portal, while a full reconciliation replaces section content and approved baseline fields. Automatic execution could silently undo legitimate editorial work.

**How to apply:** Use the seed deliberately when provisioning an empty environment or restoring the approved baseline. For recurring bootstrap, first implement a create-if-missing or version-aware merge policy.

For approved training courses on the live site, create only missing records
through the authenticated live portal and its supported lifecycle. Preserve
existing records and editorial changes; never substitute production SQL or the
development import. Any required project build publication is performed by the
owner through normal Publish, not automatically by the agent.

**Why:** The user explicitly set these boundaries for live training-course
provisioning. Content publication is separate from project build deployment.

**How to apply:** Recheck the live staff inventory before creating records, inspect
publication-alert behavior before transitions, and obtain owner-run Publish when
the live presentation needs the current project build.