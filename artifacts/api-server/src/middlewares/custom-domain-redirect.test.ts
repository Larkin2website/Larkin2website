import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCustomDomainDestination } from "./custom-domain-redirect";

describe("custom domain routing", () => {
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

  it("routes the CRM hostname to the CRM artifact", () => {
    assert.equal(
      getCustomDomainDestination("HETVCRM.GENTRAXTECH.COM:443", "/"),
      "/hetv-audience-crm/",
    );
  });

  it("does not intercept artifact paths or unrelated hostnames", () => {
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
});