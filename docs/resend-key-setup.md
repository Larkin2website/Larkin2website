# Resend key and approved sender setup

The approved sender for enquiries, subscriber verification, publication alerts,
staff invitations/password resets, and administrator quota warnings is
`admin@hetvopportunities.com`. Enquiries and quota warnings also go to this address.
The repository-root `.env.example` records these non-secret settings.

## Save the API key securely

- In Replit, use the secure secret form or the project's Secrets tool to save
  `RESEND_API_KEY`. Do not paste it into chat, source files, or `.env.example`.
- On Render, add `RESEND_API_KEY` as a secret environment value on the shared API
  service, together with the sender variables from `.env.example`. Replit secrets
  do not transfer automatically to Render.
- For local operation only, a private, ignored repository-root `.env` may hold the
  same runtime values. Never commit that file.
- Set `RESEND_ACCOUNT_ID` to a stable, non-secret label identifying the intended
  Resend account. Keep the label for rotations within the same account; change it
  when switching accounts. The application uses this to separate quota/retry state.
- Restart the API service after runtime configuration changes. No frontend rebuild
  is required to change email credentials or sender values.

## Saving a key is not delivery approval

The owner confirmed that `hetvopportunities.com` is verified in Resend; a subsequent
direct application API check independently confirmed the verified status.
If switching Resend accounts during migration, confirm verification in the destination
account as well. The API key must have the permissions required by the application's email,
domain, and usage checks. Configure the actual endpoint's `RESEND_WEBHOOK_SECRET`
separately; it is not the API key.

Do not enable background workers or subscriber campaigns merely because a key
has been saved. Confirm the remaining runtime settings, approved test recipients,
actual delivery, signed webhook processing, and quota health using the
deployment/readiness runbooks.
`EMAIL_WORKERS_ENABLED` and publication approval settings retain their safe defaults.

See [Render deployment](render-deployment.md),
[staff authentication](staff-authentication.md), and
[production readiness](production-readiness.md) for the full launch checks.
The [controlled email check results](email-delivery-check-results.md) distinguish
real provider acceptance from inbox confirmation and outstanding webhook checks.
