---
name: Resend quota semantics
description: Provider documentation conflicts and conservative delivery expectations.
---

Treat successful Resend usage responses and their reset timestamps as authoritative for releasing quota holds. Do not automatically replenish capacity just because a locally assumed day ended.

**Why:** Resend's usage-reference page described a rolling daily window while its rate-limit/error references described midnight UTC. A local interpretation could release capacity prematurely. Other applications and inbound messages can also consume the shared provider allowance.

**How to apply:** Recheck official provider semantics when changing quota handling, retain safe unknown/stale states, and distinguish provider acceptance, delivery events and confirmed inbox receipt in admin-facing copy. An exhausted email allowance cannot reliably deliver its own warning; retain a non-email admin notification path.
