---
name: Cookie notice is not consent
description: Keep public-site cookie messaging separate from permission for optional tracking
---

The public site's dismissible cookie notice is informational, not an opt-in. Do not treat its dismissal marker as permission for analytics or other non-essential cookies.

**Why:** The user requested a notice, not a consent mechanism. At the time of implementation, no active public analytics script was found, while the Privacy Notice mentioned analytical cookies; implying consent from dismissal would be misleading.

**How to apply:** If optional tracking is introduced or discovered, verify actual browser behavior and seek an approved consent flow that defers those cookies until visitors opt in. Keep the existing notice's dismissal state separate from consent state.