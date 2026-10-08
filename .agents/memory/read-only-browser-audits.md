---
name: Read-only browser audits
description: Isolating Chromium's operating-system storage when auditing in Plan mode.
---

Browser storage isolation must include operating-system user directories, not just the temporary Playwright browser profile.

**Why:** In Plan mode, Chromium can fail before loading the app by attempting to write configuration or NSS certificate databases inside the read-only workspace. Redirecting only configuration and cache directories did not cover its certificate storage.

**How to apply:** Use temporary process-local HOME and XDG configuration, cache, and data locations under /tmp for browser audits, without changing project environment settings. Block mutating requests against actual app services or use isolated mock responses when testing form behavior.
