---
name: Private preview verification
description: Why in-workspace HTTP checks cannot prove whether a development preview is public
---

Requests to a development preview made from the same Replit workspace may be treated as authenticated, even when Private development URL is enabled. A 200 response from the workspace shell alone does not prove that outside visitors can access the preview.

**Why:** An internal curl still returned 200 after the private-preview setting was enabled. Replit documentation distinguishes in-workspace requests from unauthenticated visitors on another network.

**How to apply:** Confirm the setting in Developer tools → Networking with the user, or test from a genuinely separate network or signed-out external browser. Do not use an internal curl result as the sole privacy check before enabling development-only access to current records.

Private preview blocks inbound provider callbacks but does not stop outbound
email workers.

**Why:** A provider can accept and deliver email while its signed delivery event
is blocked by the preview's login gate. Mail delivery alone cannot prove webhook
verification, and restoring private preview does not pause campaign sending.

**How to apply:** Require a real recorded signed event before accepting callback
setup. Pause outbound workers when ending public-preview email tests unless the
preview is intentionally remaining the active sender.