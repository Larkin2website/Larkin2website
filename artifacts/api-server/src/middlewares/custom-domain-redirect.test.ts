import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import { customDomainRedirect, getCustomDomainDestination } from "./custom-domain-redirect";

describe("custom domain routing", () => {
  it("routes the CRM hostname to the CRM artifact", () => {
    assert.equal(
      getCustomDomainDestination("HETVCRM.GENTRAXTECH.COM:443", "/"),
      "/hetv-audience-crm/",
    );
  });

  it("routes the public hostname to the Opportunities artifact", () => {
    assert.equal(
      getCustomDomainDestination("larkin2opportunities.gentraxtech.com", "/"),
      "/larkin2-opportunities/",
    );
  });

  it("routes the portal hostname to the portal artifact", () => {
    assert.equal(
      getCustomDomainDestination("larkin2portal.gentraxtech.com:443", "/"),
      "/larkin2-opportunities-portal/",
    );
  });

  it("does not intercept artifact paths or unrelated hostnames", () => {
    assert.equal(
      getCustomDomainDestination("hetvcrm.gentraxtech.com", "/hetv-audience-crm/contacts"),
      undefined,
    );
    assert.equal(
      getCustomDomainDestination("hetvcrm.gentraxtech.com", "/api/healthz"),
      undefined,
    );
    assert.equal(
      getCustomDomainDestination(
        "larkin2portal.gentraxtech.com",
        "/larkin2-opportunities-portal/",
      ),
      undefined,
    );
    assert.equal(
      getCustomDomainDestination(
        "hetvcrm.gentraxtech.com",
        "/hetv-audience-crm/audience",
      ),
      undefined,
    );
    assert.equal(getCustomDomainDestination("larkin-gentrax.replit.app", "/"), undefined);
  });

  it("redirects only the CRM root and retains its query string", async () => {
    const app = express();
    app.use(customDomainRedirect);
    app.use((_req, res) => res.status(204).end());
    const server = app.listen(0, "127.0.0.1");
    try {
      await new Promise<void>((resolve) => server.once("listening", resolve));
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const headers = { "x-forwarded-host": "hetvcrm.gentraxtech.com" };
      const root = await fetch(`${base}/?source=invite&next=%2Fcontacts`, {
        headers,
        redirect: "manual",
      });
      assert.equal(root.status, 302);
      assert.equal(root.headers.get("location"), "/hetv-audience-crm/?source=invite&next=%2Fcontacts");

      for (const path of ["/hetv-audience-crm/contacts?tab=all", "/api/healthz"]) {
        const response = await fetch(`${base}${path}`, { headers, redirect: "manual" });
        assert.equal(response.status, 204);
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => error ? reject(error) : resolve()));
    }
  });
});