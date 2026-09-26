---
name: Subscription verification privacy
description: Why email-code issuance cannot depend on provider latency or subscriber-specific failure responses.
---

For public subscription-code requests, do not assume identical response bodies prevent address enumeration. Sending mail only for subscribed addresses while awaiting the provider makes response timing observable; subscriber-specific storage or sender errors can also change HTTP status.

**Why:** A security review of the email-code flow found that a direct Resend call before responding made active addresses slower, and challenge-storage failures could distinguish active from unknown addresses even when normal responses matched.

**How to apply:** Keep issuance responses independent of whether an address is subscribed, including timing and failure paths. Ensure any asynchronous delivery failure cannot grant access and is recorded without exposing the address. If changing delivery architecture, prefer a durable dispatch mechanism that preserves this privacy boundary.