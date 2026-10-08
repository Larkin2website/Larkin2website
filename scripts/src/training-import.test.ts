import assert from "node:assert/strict";
import test from "node:test";
import { prepareTrainingCourses, TRAINING_IMPORT_SQL } from "./training-import";
import { programmeRegistration, validRegistrationDate } from "@workspace/programme-content/registration";

test("approved dataset contains all six complete courses, with original source and safe section content", () => {
  const courses = prepareTrainingCourses(new Date("2026-10-08T06:00:00Z"));
  assert.equal(courses.length, 6);
  for (const c of courses) {
    assert.equal(c.category, "training");
    assert.match(c.sourceUrl, /^https:\/\/larkin2opportunities.com\/trainings\//);
    assert.ok(c.sections.some(s => s.content.includes(c.sourceUrl)));
    assert.ok(c.sections.every((s,i) => s.position === i && s.content.length > 0 && s.content.length < 5000));
    assert.ok(c.sections.every(s => !s.content.includes("airtable.com") && !s.content.includes("**")));
  }
  assert.equal(courses.filter(c => c.status === "closed").length, 4);
  assert.equal(courses[0].registrationState, "unconfirmed");
  assert.equal(courses[4].registrationState, "open");
  assert.match(courses[1].sections.map(s => s.content).join("\n"), /weekday and numeric date do not agree/);
});
test("registration transitions respect explicit timestamps and unknown date-only timezone windows", () => {
  const course = prepareTrainingCourses(new Date("2026-10-08T06:00:00Z"))[4];
  assert.equal(programmeRegistration(course,new Date("2026-10-12T09:59:59Z")).state, "open");
  assert.equal(programmeRegistration(course,new Date("2026-10-12T10:00:00Z")).canApply, false);
  assert.equal(programmeRegistration(course,new Date("2026-10-13T12:00:00Z")).state, "unconfirmed");
  assert.equal(programmeRegistration(course,new Date("2026-10-14T12:00:00Z")).state, "closed");
  assert.equal(prepareTrainingCourses(new Date("2026-10-15T00:00:00Z"))[4].status, "closed");
  assert.equal(programmeRegistration({...course,deadline:"2026-10-13T12:00:00Z"},new Date("2026-10-13T12:00:00Z")).state,"closed");
  for(const status of ["draft","archived","closed"]) assert.equal(programmeRegistration({...course,status}).canApply,false);
  assert.equal(programmeRegistration({...course,registrationClosesOn:"2026-02-31"}).canApply,false);
  assert.equal(validRegistrationDate("2026-02-31"),false);
});
test("import rejects duplicate slugs and only creates missing rows and their sections", () => {
  const courses = prepareTrainingCourses(new Date("2026-10-08T06:00:00Z"));
  assert.throws(() => prepareTrainingCourses(new Date(),[...courses.slice(0,5),courses[0]]));
  assert.match(TRAINING_IMPORT_SQL,/ON CONFLICT \(slug\) DO NOTHING/);
  assert.match(TRAINING_IMPORT_SQL,/FROM inserted JOIN source/);
  assert.doesNotMatch(TRAINING_IMPORT_SQL,/\b(UPDATE|DELETE|TRUNCATE)\b/);
});
