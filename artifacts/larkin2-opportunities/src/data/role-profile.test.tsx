import { describe, expect, it } from "vitest";
import { roleApplicationTarget } from "@workspace/api-client-react";

describe("role application destinations", () => {
  it("supports agreed emails and existing platform URLs", () => {
    expect(roleApplicationTarget({ applicationEmail: "agreed@example.com" })).toBe("mailto:agreed@example.com");
    expect(roleApplicationTarget({ applicationUrl: "https://example.com/apply?role=camera" })).toBe("https://example.com/apply?role=camera");
    expect(roleApplicationTarget({ applicationUrl: "http://example.com/apply" })).toBe("http://example.com/apply");
  });
  it("never offers an unsafe or malformed destination", () => {
    for (const applicationUrl of ["javascript:alert(1)", "data:text/html,bad", "file:///tmp/test", "ftp://example.com", "not a URL"]) {
      expect(roleApplicationTarget({ applicationUrl })).toBeUndefined();
    }
    expect(roleApplicationTarget({ applicationEmail: "bad\naddress@example.com" })).toBeUndefined();
    expect(roleApplicationTarget({})).toBeUndefined();
  });
});
