import "../lib/load-env";
import { writeFile } from "node:fs/promises";
import { createAuthFixture } from "../fixtures/staff-auth-fixture";

if (process.env.NODE_ENV === "production" || process.env.STAFF_AUTH_FIXTURE !== "1") throw new Error("Explicit isolated fixture mode required");
const fixture = await createAuthFixture("http://127.0.0.1:4322");
const file = "/tmp/hetv-staff-fixture-mail.json";
await writeFile(file, JSON.stringify(fixture.messages), { mode: 0o600 });
let working = false;
const timer = setInterval(async () => {
  if (working) return;
  working = true;
  try { await fixture.drain(); await writeFile(file, JSON.stringify(fixture.messages), { mode: 0o600 }); }
  finally { working = false; }
}, 500);
const server = fixture.app.listen(4322, "127.0.0.1", () => console.info("Isolated staff browser fixture listening on 4322; captured mail only"));
let closing = false;
const stop = async () => {
  if (closing) return; closing = true; clearInterval(timer);
  await new Promise<void>(resolve => server.close(() => resolve()));
  while (working) await new Promise(resolve => setTimeout(resolve, 50));
  await fixture.cleanup(); process.exit(0);
};
process.once("SIGTERM", stop); process.once("SIGINT", stop);
