# Live training course publication

## Status after owner-run Publish on 11 October 2026

**Complete: live content and published presentation verified.**

The live staff portal initially contained only First Credit, Director Pathway and
Producer Pathway. All six approved training slugs were missing, including drafts
and archived records. The six were created using the live portal's editor, saved
as drafts, reviewed against `scripts/data/training-courses.json`, and published
using the portal's supported status actions. Past courses were then closed using
the normal published-to-closed transition.

No production SQL, development import, startup seed, staff-authentication change,
subscriber-delivery activation, or automatic project deployment was used.

## Live public URLs and reviewed states

Public root: https://larkin2opportunities.gentraxtech.com/larkin2-opportunities

| Course | Public detail path | Publication / registration |
| --- | --- | --- |
| Departmental Budgeting | `/opportunities/departmental-budgeting` | Published; neutral provider-form access |
| Conflict Resolution Training | `/opportunities/conflict-resolution-training` | Closed / closed |
| Confidence & Resilience Training – EXTENDED | `/opportunities/confidence-resilience-training` | Closed / closed |
| Excel Foundations Training | `/opportunities/excel-foundations-training` | Closed / closed |
| Career Mapping Session | `/opportunities/career-mapping-session` | Published / open |
| Mental Health Awareness for All | `/opportunities/mental-health-awareness-for-all` | Closed / closed |

The provider listings were rechecked on 8 October 2026. Career Mapping still
states a 13 October 2026 registration deadline and 17 October 2026 session; its
course-specific form displayed the sign-up questions. Budgeting's form also
displayed sign-up questions, but its source deadline still lacks a year and
timezone. Its internal registration state remains unconfirmed, with the public
button labelled **View registration form**, not an open/closed claim.

On 8 October, Conflict Resolution and Confidence & Resilience forms explicitly
reported that they were not accepting responses. Excel and Mental Health forms
still rendered, but their recorded deadlines/session dates were past; their
public registration links remained gated. On the final 11 October recheck, Excel's
form also explicitly reported that it was not accepting responses. The source
weekday/date discrepancy for Conflict Resolution is retained and disclosed.
No dates or timestamps were invented.

All six original Airtable destinations returned HTTP 200 without redirecting to
another course. No external form fields were filled and no forms were submitted.
The approved provider URLs remain stored even for closed courses.

## Publication-alert safety

Before publication, the live CRM delivery-settings endpoint reported:

```json
{"testReady": false, "liveEnabled": false, "trackingReady": false}
```

The owner-authorised temporary testing sign-in was used through the actual portal
sign-in screen. This workflow supplies the existing demo actor, whose publication
transitions do not enqueue alerts; the delivery worker is also disabled during
temporary testing. The live communications list was empty both before and after
all six publications. No alert batches were created, and no test-email or
activation actions were invoked. These observations are not a claim that the
temporary testing login is secure staff authentication.

## Verification completed

- Anonymous live API inventory and every course detail returned HTTP 200.
- Anonymous live `/training` and `/opportunities` pages contain all six courses.
- Both listings place Career Mapping first, Budgeting in a neutral group, and the
  four past courses in the closed group.
- Browser checks covered both listings and all six details at 1440 × 1000 and
  390 × 844, with no horizontal overflow or page exceptions.
- Approved content sections, titles, deadline wording, registration settings and
  provider URLs were checked against the source data. Internal “Original course
  listing” references were not added to public content.
- Programme/course presentation is text-only. No course images or unconfirmed
  status notices appear. Budgeting and Career Mapping expose their correct
  provider links; the four closed courses expose no registration link.
- Each new record has creation and lifecycle audit entries. Budgeting's
  automatically suggested URL was corrected while still a new draft, before
  publication. No duplicate draft remains.
- All fields and content sections of the original three live records were
  compared before and after provisioning and are unchanged. Inventory is now
  nine programmes: three existing plus six new courses.
- Desktop/mobile screenshots are saved as `screenshots/live-*.png`.

## Owner-run Publish and final verification

Before the owner published, the older live detail-page build rendered a numbered
**Pathway / N** eyebrow, for example **Pathway / 8** on Career Mapping.
The preview already omitted that element.

The owner confirmed normal **Publish** on 11 October 2026. Deployment metadata
reported a successful public build. The agent did not deploy the project or
recreate any course records.

Final checks against the actual live site passed:

- Anonymous Training Courses and Opportunities listings and all six detail pages
  at 1440 × 1000 and 390 × 844.
- Explicit absence of numbered `Pathway / N` labels, original-listing links,
  unconfirmed notices and course imagery.
- Approved content, open-first ordering, neutral Budgeting provider-form access,
  correct Career Mapping registration link and gating for the four closed courses.
- No horizontal overflow or browser page exceptions.
- Nine live portal records remain, with all six original provider URLs preserved.
- All six provider destinations returned HTTP 200 without course redirects.
  Career Mapping's form still displayed its sign-up questions and did not report
  that responses were closed. No external forms were filled or submitted.
- Live delivery settings still reported `testReady: false`, `liveEnabled: false`
  and `trackingReady: false`; the communications list remained empty.
- Current workspace typecheck, three training-import tests and all 51 public-site
  tests passed after the owner's Publish.

No further project Publish is required for this training-course work.
