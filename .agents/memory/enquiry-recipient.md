---
name: Enquiry recipient
description: Owner-approved sender for all application email and enquiry recipient.
---

The owner approved `admin@hetvopportunities.com` as the sender for all application
email, including staff authentication, subscriber messages, enquiries, and quota
warnings. It is also the enquiry and administrator warning recipient.

**Why:** The owner explicitly confirmed that this sender applies to all email.

**How to apply:** Keep enquiry delivery, public enquiry contact details and
direct-email fallback destinations consistent with this address. Sender selection is now approved; do not ask the user to choose a different sender. Keep form email delivery unavailable until the approved sender is configured and its domain is verified. Do not substitute another sender or claim the mailbox is ready.

The owner confirmed that the sender domain is verified in Resend. Treat this as
owner-reported verification, not proof of inbox delivery, working webhooks, or
verification in a different destination account.

**Why:** Domain verification and delivery acceptance are separate requirements.

**How to apply:** Do not ask the owner to repeat the same domain setup. Check
actual delivery separately; recheck domain verification if the Resend account changes.
