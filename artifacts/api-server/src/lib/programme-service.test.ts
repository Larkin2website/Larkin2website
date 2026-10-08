import assert from "node:assert/strict";
import test from "node:test";
import { canProgrammeTransition } from "./programme-lifecycle";
import { programmeFieldsForWrite, type ProgrammeInput } from "./programme-service";

const input = (sections: ProgrammeInput["sections"]): ProgrammeInput => ({
  slug: "future-directors",
  num: "04",
  cardTitle: "Future Directors",
  cardCopy: "A development opportunity.",
  cardCta: "Learn more",
  image: "future-directors.webp",
  title: "Future Directors Programme",
  shortDescription: "A development opportunity for emerging directors.",
  applicationStatus: "Applications open soon",
  applicationDeadline: "Applications close at noon on 30 October",
  deadline: new Date("2026-10-30T12:00:00.000Z"),
  location: "London",
  applicationUrl: null,
  featured: false,
  displayOrder: 4,
  sections,
});

test("programme writes preserve authored applicant-facing status and allow no sections", () => {
  const fields = programmeFieldsForWrite(input([]));
  assert.equal(fields.applicationStatus, "Applications open soon");
  assert.equal(fields.applicationDeadline, "Applications close at noon on 30 October");
  assert.equal("sections" in fields, false);
});

test("programme writes preserve section content separately", () => {
  const programme = input([{ section: "about", position: 0, content: "About this opportunity." }]);
  const fields = programmeFieldsForWrite(programme);
  assert.equal(fields.applicationStatus, programme.applicationStatus);
  assert.deepEqual(programme.sections, [{ section: "about", position: 0, content: "About this opportunity." }]);
});

test("imageless authoring defaults new records safely and preserves omitted legacy images on edits", () => {
  const { image: _, ...withoutImage } = input([]);
  assert.equal(programmeFieldsForWrite(withoutImage).image, "");
  assert.equal(programmeFieldsForWrite(withoutImage, { image: "legacy.webp" }).image, "legacy.webp");
  assert.equal(programmeFieldsForWrite({ ...withoutImage, image: "" }).image, "");
});

test("programme lifecycle supports archive restore without invalid shortcuts", () => {
  assert.equal(canProgrammeTransition("draft", "published"), true);
  assert.equal(canProgrammeTransition("published", "closed"), true);
  assert.equal(canProgrammeTransition("closed", "archived"), true);
  assert.equal(canProgrammeTransition("archived", "draft"), true);
  assert.equal(canProgrammeTransition("archived", "published"), false);
  assert.equal(canProgrammeTransition("draft", "closed"), false);
});