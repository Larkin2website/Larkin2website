import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { createRequirePortal, requireCrmAccess, type PortalActor } from "./portal-auth";
import { permissionsForRole } from "./permissions";
import { hashPassword, verifyPassword, staffConfig } from "./staff-security";

test("passwords are salted scrypt values and invalid credentials fail", async () => {
  const password = "This is only a test password!";
  const one = await hashPassword(password), two = await hashPassword(password);
  assert.notEqual(one, two);
  assert(await verifyPassword(password, one));
  assert.equal(await verifyPassword("incorrect", one), false);
  assert.equal(await verifyPassword(password), false);
  await assert.rejects(() => hashPassword("short"), /between 12 and 128/);
  await assert.rejects(() => hashPassword("x".repeat(129)), /between 12 and 128/);
});
test("auth requires explicit trusted origin and strong session signing secret", () => {
  assert.throws(() => staffConfig({ STAFF_AUTH_ORIGIN: "https://staff.example" }), /not configured/);
  assert.throws(() => staffConfig({ NODE_ENV: "production", STAFF_AUTH_ORIGIN: "http://staff.example", SESSION_SECRET: "x".repeat(48) }));
  assert.throws(() => staffConfig({ STAFF_AUTH_ORIGIN: "https://staff.example/unsafe", SESSION_SECRET: "x".repeat(48) }));
  assert.equal(staffConfig({ STAFF_AUTH_ORIGIN: "https://staff.example", SESSION_SECRET: "x".repeat(48) }).origin, "https://staff.example");
});
test("only server-resolved staff actors acquire permissions, with separate CRM super-admin boundary", async () => {
  const app = express();
  // This fixture supplies server-side actors, not a deployable HTTP backdoor.
  app.use((req, _res, next) => {
    if (req.path.startsWith("/viewer")) req.staffActor = {
      userId: "fixture-viewer", displayName: "Fixture", email: "viewer@example.invalid",
      role: "viewer", permissions: permissionsForRole("viewer"),
    } satisfies PortalActor;
    next();
  });
  const portal = createRequirePortal();
  app.get("/viewer/read", portal("opportunities:read"), (_req, res) => res.sendStatus(204));
  app.get("/viewer/write", portal("members:manage"), (_req, res) => res.sendStatus(204));
  app.get("/viewer/crm", requireCrmAccess, (_req, res) => res.sendStatus(204));
  app.get("/anonymous", portal(), (_req, res) => res.sendStatus(204));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await fetch(`${base}/anonymous`, { headers: { cookie: "__session=legacy; larkin2_demo_session=legacy; hetv_crm_demo_session=legacy" } })).status, 401);
    assert.equal((await fetch(`${base}/viewer/read`)).status, 204);
    assert.equal((await fetch(`${base}/viewer/write`)).status, 403);
    assert.equal((await fetch(`${base}/viewer/crm`)).status, 403);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
