---
name: Preview root paths
description: Include the trailing slash when visiting the root of a path-routed artifact.
---

Visit path-routed artifact roots with a trailing slash, such as `/larkin2-opportunities/`, not the bare prefix.

**Why:** In this workspace a browser request to the bare artifact prefix reached a non-app route, so homepage checks waited for elements that were never rendered.

**How to apply:** Append `/` to the artifact prefix in browser test root URLs. Screenshot paths relative to an artifact should use `/`.
