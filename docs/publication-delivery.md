# Publication notifications

The portal queues matched subscribers only when a role or programme is first published by authorized staff. Saving and reopening do not queue a new batch. Temporary test authentication has been removed. No publication email is sent by default.

## Controlled Resend test

Configure these settings for the API server in the intended environment:

- `RESEND_API_KEY`: server-only direct Resend credential; no Replit connector is
  required. See [portable email setup](resend-setup.md) and `.env.example`.

- `PUBLIC_OPPORTUNITIES_URL`: the public **artifact root**, including `/larkin2-opportunities/` (for example `https://larkin2opportunities.gentraxtech.com/larkin2-opportunities/`). Message links are built relative to this root.
- `PUBLICATION_EMAIL_FROM`: a sender/address verified for publication notifications in Resend. This is separate from the address used for subscription verification; obtain approval before reusing it.
- `PUBLICATION_TEST_EMAIL`: the approved, single test mailbox. The CRM cannot accept a recipient from the browser.

The super-admin CRM Communications page offers **Send sample test** even when there are no published batches. The sample says explicitly that no real publication took place and includes working browse and unsubscribe links. For a currently published batch, **Send controlled test** previews its actual title and link. Both send only to the configured mailbox; neither consumes, changes, or sends the subscriber outbox. Repeated tests use stable Resend idempotency keys (deduplicated for 24 hours, per batch or per daily sample). “Test accepted” means Resend returned a message ID, **not** that the mailbox received it; check inbox/spam separately. Confirm the configured mailbox and sender with the project owner before setting either value.

## Live delivery (not enabled)

Do not configure live mode without separate explicit approval to email subscribers. Once approved, set `PUBLICATION_EMAIL_MODE=live`, `PUBLICATION_EMAIL_APPROVED=true`, and `PUBLICATION_ALERTS_ACTIVATED_AT` to an exact ISO timestamp at activation. All three are required. The worker considers only batches **created on or after** the activation timestamp, so historical pending batches stay untouched and must be reviewed separately. Set live settings in the production environment only if the approval covers production sending; a shared live switch could also send from development.

The API worker runs on the existing API service, in batches, with an atomic claim per recipient. It rechecks current consent, preferences, matching, and public status before each send. Resend acceptance marks a recipient `sent`; it is not inbox delivery. Failed attempts retry with backoff up to five times, with the same recipient-specific idempotency key. Resend keys expire after 24 hours, so retries stop before that boundary and require staff review rather than risk duplicate emails. The CRM exposes batch-level counts and next retry time.

For launch testing: first use a batch with a deliberately approved test mailbox, confirm Resend acceptance and inbox receipt, verify the unsubscribe/preferences link, then separately obtain approval and agree an activation timestamp before enabling the live switch. No live switch should be inferred from a successful test.