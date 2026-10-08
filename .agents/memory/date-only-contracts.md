---
name: Date-only API contracts
description: Why editorial dates without a timezone must remain strings across generated API boundaries.
---

Keep source date-only values as validated strings rather than timestamps.

**Why:** This project's API generator converts OpenAPI `format: date` to a coerced JavaScript Date on the server. That changes a date-only editorial value's type and can introduce a timezone or timestamp that the provider never supplied.

**How to apply:** For date-only fields backed by text, use a string pattern plus calendar-date validation; inspect the generated validator when changing contracts. Exact confirmed timestamps may still use `format: date-time`.
