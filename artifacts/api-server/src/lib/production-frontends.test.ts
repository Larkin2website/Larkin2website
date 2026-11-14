import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { request } from "node:http";
import express from "express";
import { mountProductionFrontends, frontendNames } from "./production-frontends";
import { allowedProductionHosts } from "./production-hosts";
import { staffConfig } from "./staff-security";
import { customDomainRedirect } from "../middlewares/custom-domain-redirect";

// fetch follows the URL's Host in this Node version; use HTTP for host-routing cases.
function requestHost(origin: string, host: string, extra: Record<string, string> = {}, method = "GET") {
  return new Promise<{ status: number | undefined; location: string | undefined }>((resolve, reject) => {
    const req = request(origin, { method, headers: { host, ...extra } }, res => {
      res.resume();
      res.once("end", () => resolve({ status: res.statusCode, location: res.headers.location }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("production serving isolates three SPAs, assets, deep links, APIs, redirects and cache policy", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hetv-static-"));
  for (const name of frontendNames) {
    const dir = path.join(directory, name, "dist/public");
    await mkdir(path.join(dir, "assets"), { recursive: true });
    await writeFile(path.join(dir, "index.html"), `<html>${name}</html>`);
    await writeFile(path.join(dir, "assets/app-hash.js"), "window.app = true;");
  }
  const app = express();
  app.use(customDomainRedirect);
  app.get("/api/healthz", (_req, res) => { res.json({ status: "ok" }); });
  app.use("/api", (_req, res) => { res.status(404).json({ error: "API endpoint not found" }); });
  mountProductionFrontends(app, directory);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (const name of frontendNames) {
      for (const suffix of ["/", "/roles/example?token=keep", "/sign-in/callback"]) {
        const response = await fetch(`${origin}/${name}${suffix}`);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.match(await response.text(), new RegExp(name));
      }
      const redirect = await fetch(`${origin}/${name}?token=keep`, { redirect: "manual" });
      assert.equal(redirect.headers.get("location"), `/${name}/?token=keep`);
      const asset = await fetch(`${origin}/${name}/assets/app-hash.js`);
      assert.match(asset.headers.get("cache-control") ?? "", /immutable/);
      assert.match(asset.headers.get("content-type") ?? "", /javascript/);
      assert.equal((await fetch(`${origin}/${name}/assets/missing.js`)).status, 404);
      assert.equal((await fetch(`${origin}/${name}/.env`)).status, 404);
      assert.equal((await fetch(`${origin}/${name}/missing.css`)).status, 404);
      assert.equal((await fetch(`${origin}/${name}/route`, { method: "POST" })).status, 404);
    }
    const missingApi = await fetch(`${origin}/api/unknown`, { headers: { accept: "text/html" } });
    assert.equal(missingApi.status, 404);
    assert.match(missingApi.headers.get("content-type") ?? "", /json/);
    assert.deepEqual(await (await fetch(`${origin}/api/healthz`)).json(), { status: "ok" });
    const root = await fetch(`${origin}/?token=keep`, { redirect: "manual" });
    assert.equal(root.headers.get("location"), "/larkin2-opportunities/?token=keep");
    const legacy = await requestHost(origin, "hetvcrm.gentraxtech.com");
    assert.equal(legacy.location, "/hetv-audience-crm/");
    const post = await requestHost(origin, "hetvcrm.gentraxtech.com", {}, "POST");
    assert.equal(post.status, 404);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

test("missing builds fail explicitly instead of a production blank page", () => {
  assert.throws(() => mountProductionFrontends(express(), "/nonexistent/hetv-build"), /Missing production frontend/);
});

test("legacy test flags cannot provide staff authentication configuration", () => {
  for (const NODE_ENV of ["development", "production"]) {
    for (const mode of [{ AUTH_PROVIDER: "external" }, { RENDER: "true" }]) {
      const env = { ...mode, NODE_ENV, PUBLIC_TEST_LOGIN_ENABLED: "true", DEV_DEMO_LOGIN_ENABLED: "true", PORTAL_DEMO_MODE: "true" };
      assert.throws(() => staffConfig(env), /not configured/);
    }
  }
  assert.throws(() => staffConfig({}), /not configured/);
});

test("production allowlist ignores a spoofed forwarded hostname", async () => {
  const app = express();
  app.use(allowedProductionHosts({ RENDER_EXTERNAL_HOSTNAME: "hetv.onrender.com", ALLOWED_HOSTS: "client.example" }));
  app.get("/", (_req, res) => { res.sendStatus(204); });
  app.get("/api/healthz", (_req, res) => { res.sendStatus(200); });
  app.get("/api/readyz", (_req, res) => { res.sendStatus(200); });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    // Render's internal health checker uses a private address as Host.
    assert.equal((await requestHost(`${origin}/api/healthz`, "10.0.0.5:10000")).status, 200);
    assert.equal((await requestHost(`${origin}/api/healthz`, "10.0.0.5:10000", {}, "POST")).status, 400);
    assert.equal((await requestHost(`${origin}/api/readyz`, "10.0.0.5:10000")).status, 400);
    assert.equal((await requestHost(origin, "10.0.0.5:10000")).status, 400);
    assert.equal((await requestHost(origin, "hetv.onrender.com")).status, 204);
    assert.equal((await requestHost(origin, "client.example")).status, 204);
    assert.equal((await requestHost(origin, "evil.example", { "x-forwarded-host": "client.example" })).status, 400);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
