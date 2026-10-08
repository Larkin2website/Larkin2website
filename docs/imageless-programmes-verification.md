# Text-only programme and course verification

Programme/course cards and detail heroes no longer render image elements or
reserve media columns. Training/Development overviews stay text-only. Role and
homepage brand imagery and all existing media files remain untouched.

## Authoring and compatibility

- The staff form has no image control or required image validation.
- New programme/training inputs can omit `image` or use an empty string.
- Storage writes provide an empty string for new imageless records.
- Updates which omit the legacy field preserve its existing stored value.
- Existing editor defaults retain historical values even though there is no
  image control. Response contracts still return `image` as a string, which may
  be empty. No column, record or media asset was deleted.

## Checks completed on 8 October 2026

- `pnpm run typecheck`: full workspace passed.
- Public Vitest suite: 35 tests passed.
- Programme API/service targeted suite: 7 tests passed, including programme and
  training creation without an image, blank strings, validated public responses,
  and preservation of legacy image values during edits.
- Public, portal and API builds passed. Public/portal builds used their own
  managed artifact `PORT` and `BASE_PATH`; the API build requires neither override.
- `training-browser-check.mjs`: real development API records at 1280, 1024, 820
  and 390 pixels. Training and Development overviews, all-opportunities groups,
  all six course details, three existing programme details, and sample details
  passed. No programme image elements or image requests, no empty media columns,
  no horizontal overflow and no accessibility violations. Original course text,
  semantic bullets, source links and open/closed/unconfirmed Apply gating remain.
- `programme-editor-browser-check.mjs`: **mocked session and in-memory API**, not
  a real signed-in database save. At the same four widths, the image field is
  absent, existing edits preserve historical values and metadata, and new
  programme/training records with empty images save and reopen successfully.
- Screenshot of the running public opportunities page confirmed the text-only
  card layout. Workflows are running after the completed change batch.

Nothing was published and no production mutation or data-clearing migration
was performed.
