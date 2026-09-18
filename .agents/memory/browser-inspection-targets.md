---
name: Browser inspection targets
description: Headless Chromium target selection in this workspace.
---

Do not assume the first Chrome DevTools target is the application tab.

**Why:** This workspace's Chromium can list a built-in extension background page before the actual web page. Connecting to it produces missing application elements and misleading navigation failures.

**How to apply:** When directly inspecting through CDP, select a target with type `page` and a non-extension URL before navigation or DOM inspection.