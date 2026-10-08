import { prepareTrainingCourses, TRAINING_IMPORT_SQL } from "./training-import";

// Deliberately no database access or credentials. Execution requires an explicit
// development-targeted database call, not an ambiguous DATABASE_URL connection.
if (process.argv[2] !== "--development-only") {
  throw new Error("Use --development-only to prepare the approved import; this command does not execute SQL");
}
process.stdout.write(JSON.stringify({
  environment: "development", sqlQuery: TRAINING_IMPORT_SQL,
  params: [JSON.stringify(prepareTrainingCourses())],
}, null, 2) + "\n");
