import assert from "node:assert/strict";
import test from "node:test";
import { can, canTransition, permissionsForRole } from "./permissions";

test("viewer permissions are read-only", () => {
  assert.deepEqual(permissionsForRole("viewer"), ["opportunities:read"]);
  assert.equal(can("viewer", "opportunities:write"), false);
  assert.equal(can("viewer", "opportunity-options:manage"), false);
  assert.equal(canTransition("viewer", "published"), false);
});

test("opportunity managers can create categories but cannot manage their lifecycles", () => {
  assert.equal(can("opportunity_manager", "opportunities:write"), true);
  assert.equal(can("opportunity_manager", "opportunities:publish"), true);
  assert.equal(can("opportunity_manager", "members:manage"), false);
  assert.equal(can("opportunity_manager", "opportunity-options:manage"), true);
  assert.equal(can("opportunity_manager", "opportunity-options:lifecycle"), false);
  assert.equal(canTransition("opportunity_manager", "archived"), true);
});

test("super admins have destructive and membership permissions", () => {
  assert.equal(can("super_admin", "opportunities:delete"), true);
  assert.equal(can("super_admin", "members:manage"), true);
  assert.equal(can("super_admin", "opportunity-options:manage"), true);
  assert.equal(can("super_admin", "opportunity-options:lifecycle"), true);
});