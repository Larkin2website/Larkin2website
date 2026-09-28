import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import type { AddressInfo } from "node:net";
import { createOpportunitiesRouter } from "../routes/opportunities";
import { createAudienceCrmRouter } from "../routes/audience-crm";
import { hasDevelopmentSession, isDevelopmentDemoEnabled } from "./development-session";

test("both sign-in forms require credentials and create separate revocable sessions", async () => {
  const previous = process.env.DEV_DEMO_LOGIN_ENABLED;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  process.env.DEV_DEMO_LOGIN_ENABLED = "true";
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.get("/api/portal/protected-test", (req, res) =>
    res.status(hasDevelopmentSession(req, "portal") ? 204 : 401).end());
  app.get("/api/crm/protected-test", (req, res) =>
    res.status(hasDevelopmentSession(req, "crm") ? 204 : 401).end());
  app.use("/api", createOpportunitiesRouter());
  app.use("/api", createAudienceCrmRouter());
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const json = (value: object) => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  try {
    assert.equal((await fetch(`${base}/portal/protected-test`)).status, 401);
    assert.equal((await fetch(`${base}/crm/protected-test`)).status, 401);
    for (const scope of ["portal", "crm"] as const) {
      assert.equal((await fetch(`${base}/${scope}/demo-session`, json({}))).status, 400);
      assert.equal((await fetch(`${base}/${scope}/demo-session`, json({ email: "invalid", password: "anything" }))).status, 400);
      assert.equal((await fetch(`${base}/${scope}/demo-session`, json({ email: "tester@example.com", password: "" }))).status, 400);
    }
    const portal = await fetch(`${base}/portal/demo-session`, json({ email: "tester@example.com", password: "anything" }));
    const portalCookie = portal.headers.get("set-cookie")!.split(";", 1)[0];
    assert.equal(portal.status, 204);
    assert.equal((await fetch(`${base}/portal/protected-test`, { headers: { cookie: portalCookie } })).status, 204);
    assert.equal((await fetch(`${base}/crm/protected-test`, { headers: { cookie: portalCookie } })).status, 401);
    const crm = await fetch(`${base}/crm/demo-session`, json({ email: "other@example.com", password: "anything" }));
    const crmCookie = crm.headers.get("set-cookie")!.split(";", 1)[0];
    assert.equal(crm.status, 204);
    assert.equal((await fetch(`${base}/crm/protected-test`, { headers: { cookie: crmCookie } })).status, 204);
    assert.equal((await fetch(`${base}/portal/protected-test`, { headers: { cookie: crmCookie } })).status, 401);
    assert.equal((await fetch(`${base}/crm/demo-session`, { method: "DELETE", headers: { cookie: crmCookie } })).status, 204);
    assert.equal((await fetch(`${base}/crm/protected-test`, { headers: { cookie: crmCookie } })).status, 401);
    assert.equal((await fetch(`${base}/portal/demo-session`, { method: "DELETE", headers: { cookie: portalCookie } })).status, 204);
    assert.equal((await fetch(`${base}/portal/protected-test`, { headers: { cookie: portalCookie } })).status, 401);
    process.env.NODE_ENV = "production";
    assert.equal(isDevelopmentDemoEnabled(), false);
    assert.equal((await fetch(`${base}/crm/demo-session`, json({ email: "tester@example.com", password: "anything" }))).status, 404);
    assert.equal((await fetch(`${base}/portal/demo-session`, json({ email: "tester@example.com", password: "anything" }))).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previous === undefined) delete process.env.DEV_DEMO_LOGIN_ENABLED;
    else process.env.DEV_DEMO_LOGIN_ENABLED = previous;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});