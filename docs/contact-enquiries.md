# Contact enquiries

The public contact page is `/larkin2-opportunities/contact`. The desktop header,
mobile navigation and footer link to it. Direct email links in other public
content remain available.

## Delivery and sender approval

The owner-confirmed recipient is `admin@HETVopportunities.com`. The existing Resend
connection is used without exposing its credentials to the browser.

`CONTACT_ENQUIRY_FROM` is a non-secret configuration value containing the sender
email address specifically approved by the owner for contact enquiries. There is
no default and no fallback to the subscription-verification sender. Until this
approval/configuration exists, submissions fail explicitly and offer direct email.

The transport verifies the sender's domain with Resend, caching a successful
verification for five minutes. It requires an accepted email response containing
a provider ID before returning success. The visitor's validated email is Reply-To,
never From. Emails contain plain text rather than visitor-supplied HTML.

Automated tests use mocked delivery. No real test enquiries should be sent without
the owner's permission. A normal successful submission means provider acceptance
for delivery, not confirmed inbox receipt.

## Input, abuse and retries

- The generated OpenAPI contract defines the real endpoint and input limits.
- Name, email, subject and message are trimmed and required. Unknown properties,
  oversized fields, header-control characters and filled honeypots are rejected.
- Browser cross-site requests are rejected; the endpoint accepts JSON only.
- Per-process safeguards limit each source IP to 20 attempts per 15 minutes,
  each normalized email to three new delivery attempts per 15 minutes, and total
  new delivery attempts to 60 per hour. These include failed attempts.
- Rate-limit maps are bounded and cleared when windows expire. These are
  process-local protections, not a distributed quota across multiple replicas.
- The browser synchronously locks duplicate submissions, retains failed input
  and uses the same request UUID for retries of the same trimmed payload.
- The server coalesces matching concurrent requests and briefly caches acceptance.
  Resend receives an idempotency key, including on retries after network failures.
- No enquiry content or addresses are logged, saved in the application database,
  added to subscriber records or used to activate marketing delivery.

## Contact information

The email is taken from existing public contact links. The registered office and
company names are taken from the existing Website Terms, clearly labelled as a
registered office rather than a walk-in contact location. No phone number or
social account has been invented.
