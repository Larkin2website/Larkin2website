import { readFileSync } from "node:fs";
import { programmeRegistration } from "@workspace/programme-content/registration";

export interface CourseImport {
  slug: string; num: string; title: string; cardTitle: string; cardCopy: string;
  shortDescription: string; cardCta: string; image: string; location: string;
  category: "training"; status: "published" | "closed";
  registrationState: "open" | "closed" | "unconfirmed";
  registrationClosesOn: string | null; applicationDeadline: string | null;
  applicationUrl: string | null; sourceUrl: string; sourceCheckedOn: string;
  sections: { section: string; position: number; content: string }[];
}
export const APPROVED_COURSE_SLUGS = [
  "departmental-budgeting", "conflict-resolution-training", "confidence-resilience-training",
  "excel-foundations-training", "career-mapping-session", "mental-health-awareness-for-all",
];
export function prepareTrainingCourses(now = new Date(), source?: CourseImport[]): CourseImport[] {
  const courses: CourseImport[] = source ?? JSON.parse(readFileSync(new URL("../data/training-courses.json", import.meta.url), "utf8"));
  if (courses.length !== 6 || new Set(courses.map(c => c.slug)).size !== 6
    || courses.some(c => !APPROVED_COURSE_SLUGS.includes(c.slug) || c.category !== "training" || !c.sections.length)) {
    throw new Error("Import must contain exactly the six approved, unique training courses");
  }
  return courses.map(course => {
    const registration = programmeRegistration(course, now);
    return { ...course, registrationState: registration.state,
      status: registration.state === "closed" ? "closed" : "published" };
  });
}

// One parameterized statement, atomic even when concurrent imports race.
// Sections are inserted ONLY for newly created records: existing editor content is untouched.
export const TRAINING_IMPORT_SQL = `
WITH source AS (
  SELECT value AS course FROM jsonb_array_elements($1::jsonb)
), inserted AS (
  INSERT INTO programmes (slug,num,category,title,card_title,card_copy,short_description,
    card_cta,image,location,status,registration_state,registration_closes_on,
    application_status,application_deadline,application_url,display_order,
    featured,created_by,updated_by,published_at)
  SELECT course->>'slug',course->>'num','training',course->>'title',
    course->>'cardTitle',course->>'cardCopy',course->>'shortDescription',
    course->>'cardCta',course->>'image',course->>'location',
    (course->>'status')::programme_status,course->>'registrationState',course->>'registrationClosesOn',
    CASE course->>'registrationState' WHEN 'open' THEN 'Registration open'
      WHEN 'closed' THEN 'Registration closed' ELSE 'Registration status unconfirmed' END,
    course->>'applicationDeadline',course->>'applicationUrl',(course->>'num')::integer,
    false,'approved-training-import','approved-training-import',now()
  FROM source
  ON CONFLICT (slug) DO NOTHING RETURNING id,slug
), inserted_sections AS (
  INSERT INTO programme_sections (programme_id,section,position,content)
  SELECT inserted.id,(section->>'section')::programme_section,
    (section->>'position')::integer,section->>'content'
  FROM inserted JOIN source ON inserted.slug=source.course->>'slug'
    CROSS JOIN LATERAL jsonb_array_elements(source.course->'sections') AS section
  RETURNING id
)
SELECT source.course->>'slug' AS slug,
  CASE WHEN inserted.id IS NULL THEN 'preserved existing record' ELSE 'created' END AS outcome
FROM source LEFT JOIN inserted ON inserted.slug=source.course->>'slug'
ORDER BY slug`;
