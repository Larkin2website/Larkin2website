import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import {
  demoPortalActor,
  demoPortalMember,
  isPortalDemoMode,
  validatePortalDemoMode,
} from "./portal-demo";
import { permissionsForRole } from "./permissions";
import { createRequirePortal } from "./portal-auth";

test("demo mode defaults on outside production and off in production", () => {
  assert.equal(isPortalDemoMode({ NODE_ENV: "development" }), true);
  assert.equal(isPortalDemoMode({ NODE_ENV: "test" }), true);
  assert.equal(isPortalDemoMode({ NODE_ENV: "production" }), false);
});

test("demo mode accepts explicit on and off values", () => {
  assert.equal(isPortalDemoMode({ NODE_ENV: "production", PORTAL_DEMO_MODE: "true" }), true);
  assert.equal(isPortalDemoMode({ NODE_ENV: "development", PORTAL_DEMO_MODE: "false" }), false);
});

test("demo actor is an active super admin with every permission", () => {
  const actor = demoPortalActor();
  const member = demoPortalMember();
  assert.equal(actor.role, "super_admin");
  assert.deepEqual(actor.permissions, permissionsForRole("super_admin"));
  assert.equal(actor.demo, true);
  assert.equal(member.active, true);
  assert.equal(member.userId, actor.userId);
});

test("production requires an explicit insecure demo deployment acknowledgement", () => {
  assert.throws(
    () => validatePortalDemoMode({
      NODE_ENV: "production",
      PORTAL_DEMO_MODE: "true",
    }),
    /ALLOW_INSECURE_DEMO_DEPLOYMENT=true/,
  );
  assert.doesNotThrow(() => validatePortalDemoMode({
    NODE_ENV: "production",
    PORTAL_DEMO_MODE: "true",
    ALLOW_INSECURE_DEMO_DEPLOYMENT: "true",
  }));
  assert.doesNotThrow(() => validatePortalDemoMode({
    NODE_ENV: "production",
    PORTAL_DEMO_MODE: "false",
  }));
});

test("anonymous requests receive full super admin access only in demo mode", async () => {
  const app = express();
  const demoAuth = createRequirePortal({
    demoMode: () => true,
    userIdForRequest: () => undefined,
  });
  const normalAuth = createRequirePortal({
    demoMode: () => false,
    userIdForRequest: () => undefined,
  });
  app.get("/demo", demoAuth("members:manage"), (req, res) => {
    res.json(req.portalActor);
  });
  app.get("/normal", normalAuth("members:manage"), (_req, res) => {
    res.status(204).end();
  });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  try {
    const { port } = server.address() as AddressInfo;
    const demoResponse = await fetch(`http://127.0.0.1:${port}/demo`);
    assert.equal(demoResponse.status, 200);
    const actor = await demoResponse.json() as ReturnType<typeof demoPortalActor>;
    assert.equal(actor.role, "super_admin");
    assert.equal(actor.demo, true);
    assert.deepEqual(actor.permissions, permissionsForRole("super_admin"));

    const normalResponse = await fetch(`http://127.0.0.1:${port}/normal`);
    assert.equal(normalResponse.status, 401);
    assert.deepEqual(await normalResponse.json(), { error: "Authentication required" });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});