import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

test("built Render server boots without auth/mail keys, serves three apps, rejects testing access, and shuts down", { timeout: 40_000 }, async () => {
  const probe = createServer().listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const env = { ...process.env, NODE_ENV: "production", PORT: String(port), RENDER: "true",
    AUTH_PROVIDER: "external", SERVE_STATIC_APPS: "true", EMAIL_WORKERS_ENABLED: "false",
    RENDER_EXTERNAL_HOSTNAME: "127.0.0.1", ALLOWED_HOSTS: "",
    // Deliberately unusable, non-secret fixture. No startup DDL/DB calls are allowed.
    DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:1/unused",
    PUBLIC_TEST_LOGIN_ENABLED: "true", DEV_DEMO_LOGIN_ENABLED: "true", PORTAL_DEMO_MODE: "true",
  };
  for (const key of ["CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET"]) delete env[key];
  const child = spawn(process.execPath, ["artifacts/api-server/dist/index.mjs"], { env, stdio: ["ignore", "pipe", "pipe"] });
  const exited = once(child, "exit");
  // Drain output, but do not emit environment values or application records.
  child.stdout.resume(); child.stderr.resume();
  const origin = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (child.exitCode !== null) throw new Error("Built production server exited before startup");
      try { ready = (await fetch(`${origin}/api/healthz`)).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, "production server did not start");
    for (const app of ["larkin2-opportunities", "larkin2-opportunities-portal", "hetv-audience-crm"]) {
      const response = await fetch(`${origin}/${app}/sign-in/callback`);
      assert.equal(response.status, 200);
      const html = await response.text();
      const asset = html.match(new RegExp(`/${app}/assets/[^\" ]+\\.js`))?.[0];
      assert(asset, `${app}: missing compiled script`);
      assert.equal((await fetch(`${origin}${asset}`)).status, 200);
    }
    for (const endpoint of ["/api/portal/session", "/api/crm/communications", "/api/crm/communications/email-health"]) {
      assert.equal((await fetch(`${origin}${endpoint}`)).status, 401, endpoint);
    }
    for (const scope of ["portal", "crm"]) {
      assert.equal((await fetch(`${origin}/api/${scope}/demo-session`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "fixture@example.com", password: "fixture-only" }),
      })).status, 404);
    }
    const missing = await fetch(`${origin}/api/not-a-real-route`);
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get("content-type"), /json/);
  } finally {
    if (child.exitCode === null) child.kill("SIGTERM");
    const [code] = await exited;
    assert.equal(code, 0, "production server did not shut down cleanly");
  }
});
