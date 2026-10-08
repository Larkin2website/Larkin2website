# Training course import and publication handover

The six courses were checked against their original detail pages on 8 October 2026.
They are stored as editable programme records with category **Training course**.
Audience matching settings are separate and are not changed by this import.

## Current source status

| Course | Source registration information | Imported status |
| --- | --- | --- |
| Departmental Budgeting | 8 October, 12 pm (Noon); no year, timezone or session dates | Published, registration unconfirmed; no Apply link |
| Conflict Resolution Training | Deadline 30 September 2026; source session says “Monday, 6th October 2026” | Closed |
| Confidence & Resilience Training – EXTENDED | Extended deadline 2 October 2026; session 5 October 2026 | Closed |
| Excel Foundations Training | Deadline 2 October 2026; session 8 October 2026 | Closed |
| Career Mapping Session | Deadline 13 October 2026; session 17 October 2026 | Published, open before the uncertain deadline window |
| Mental Health Awareness for All | Session 30 September 2026; no separate deadline | Closed |

Conflict Resolution's weekday conflicts with the numeric date: 6 October 2026 is
a Tuesday. The original wording is retained and the discrepancy is disclosed.
Departmental Budgeting must not be opened until missing dates and registration
availability are confirmed. Existing source Apply buttons are not proof that
registration is still open. Closed does not mean the course was delivered.

## Explicit development-only provisioning

The checked source copy is in `scripts/data/training-courses.json`.

Run this non-mutating preparation command:

```sh
pnpm --silent --filter @workspace/scripts run prepare:training-import --development-only
```

It prints one parameterized SQL request with an explicit `environment: development`
target. It does **not** open a database connection or read credentials. An authorised
development-targeted database operation must execute the prepared request explicitly.
It must never be added to application startup, workflow commands, post-merge setup
or publishing. Never substitute a production target.

The statement creates only missing approved slugs and their content sections, in
one atomic statement. Existing rows, statuses and sections are preserved, including
portal edits. It reports each course as created or preserved; inspect preserved
records manually if their metadata differs from the approved source.

The prepared statement **was executed explicitly against the managed development
database on 8 October 2026**. All six records were created and their public pages
were verified using the real development API. The preparation command is
intentionally non-mutating; it is not an unexecuted provisioning substitute.
See `docs/training-course-verification.json` for the database verification and
preservation evidence from this execution.

The broad programme baseline seed is NOT part of this procedure. The import does
not enqueue subscriber emails or register anyone with a course provider.

## Later production content approval

No production data was inspected or changed, and nothing was published.

Before publishing, review the dates and original source wording with the content
owner, especially the two unresolved date issues above. Recheck Career Mapping:
its deadline may have passed by the time this work goes live.

Replit's normal Publish flow applies managed development schema changes; it does
not copy these development content records into the production portal. Do not add
a custom production migration or run the development import against production.
After separately approving publication, use the authenticated live staff portal
to create any missing approved courses as drafts, with category Training course,
their original text sections, correct location, registration state and deadline
text. Set precise System Deadline only when its time and timezone are confirmed.
Use the approved JSON as the source for the original provider application URLs.
Publish only reviewed records; close the four past courses, and keep Budgeting
registration unconfirmed. Review existing same-slug records rather than overwriting.

Finally check the live training page, all-opportunities archive, all six details,
and disabled Apply actions for closed/unconfirmed records. No third-party form
submission is needed. Hub interest registration is not course registration.

## Date-only policy and editor behavior

Public visibility (draft/published/closed/archived) is independent of registration.
Training Apply links require an explicitly verified open registration state.
An exact, confirmed System Deadline takes precedence when supplied.

A source date without a timezone is stored as a date string, not an invented
timestamp. The Apply link is disabled from the earliest start of that date across
UTC offsets +14 to -12 until its latest possible end; during that interval the
status is unconfirmed. After the entire date is past it becomes closed.
This conservative policy prevents assuming a provider's registration cutoff.
Public views refresh their clock and data, and the API independently gates URLs.

## Build verification

The full workspace typecheck passes, including the schema-validated API test
responses. All five artifact builds also pass with each artifact's own managed
`PORT` and `BASE_PATH`. Running the bare root build in a shell without these
managed settings stops at the existing mockup sandbox's required PORT setting;
this is not a training-course build or type error. No artifact routing was changed.
