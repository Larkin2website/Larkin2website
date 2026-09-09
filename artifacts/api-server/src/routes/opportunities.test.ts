import assert from "node:assert/strict";
import test from "node:test";
import express, { type RequestHandler } from "express";
import type { AddressInfo } from "node:net";
import type { Permission, PortalRole } from "../lib/permissions";
import { can, permissionsForRole } from "../lib/permissions";
import { cleanOptionLabel } from "../lib/opportunity-option-service";
import type { PortalActor } from "../lib/portal-auth";
import { createOpportunitiesRouter } from "./opportunities";

const optionId = "11111111-1111-4111-8111-111111111111";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

function testAuth(): (permission?: Permission) => RequestHandler {
  return (permission) => (req, res, next) => {
    const role = req.header("x-test-role") as PortalRole | undefined;
    if (!role) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (permission && !can(role, permission)) {
      res.status(403).json({ error: "Insufficient permission" });
      return;
    }
    req.portalActor = {
      userId: `${role}-user`,
      displayName: role,
      email: `${role}@example.com`,
      role,
      permissions: permissionsForRole(role),
    };
    next();
  };
}

async function withServer(
  createOption: (kind: "department" | "role_type", label: string, actor: PortalActor) => Promise<any>,
  run: (baseUrl: string) => Promise<void>,
  routeOverrides: Parameters<typeof createOpportunitiesRouter>[0] = {},
) {
  const app = express();
  app.use(express.json());
  app.use(createOpportunitiesRouter({
    requirePortal: testAuth(),
    opportunityOptions: {
      listOpportunityOptions: async () => ({ departments: [], roleTypes: [] }),
      createOpportunityOption: createOption,
    } as any,
    ...routeOverrides,
  }));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const { port } = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

const validOpportunityInput = {
  slug: "wardrobe-assistant",
  title: "Wardrobe Assistant",
  publicationLabel: "Opportunities",
  department: "Unknown department",
  roleType: "Full time",
  summary: "A sufficiently detailed summary for validation.",
  applicationDeadline: "Applications close Friday",
  responseDate: null,
  applicationUrl: null,
  deadline: null,
  deadlineExtended: false,
  featured: false,
  urgent: false,
  contentItems: [{ section: "responsibility" as const, position: 0, content: "Support the team" }],
  details: [{ position: 0, label: "Location", value: "London" }],
};

test("viewer requests cannot create categories", async () => {
  let calls = 0;
  await withServer(async () => {
    calls += 1;
    throw new Error("should not be called");
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/portal/opportunity-options`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-role": "viewer" },
      body: JSON.stringify({ kind: "department", label: "Wardrobe" }),
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Insufficient permission" });
    assert.equal(calls, 0);
  });
});

for (const role of ["opportunity_manager", "super_admin"] as const) {
  test(`${role} can create a cleaned category`, async () => {
    await withServer(async (kind, label, actor) => ({
      id: optionId,
      kind,
      label: label.trim().replace(/\s+/g, " "),
      active: true,
      retiredAt: null,
      createdAt,
      actor: actor.role,
    }), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/portal/opportunity-options`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-role": role },
        body: JSON.stringify({ kind: "department", label: "  Hair   and Makeup  " }),
      });
      assert.equal(response.status, 201);
      assert.equal((await response.json() as { label: string }).label, "Hair and Makeup");
    });
  });
}

test("category creation returns clear whitespace-only and duplicate errors", async () => {
  await withServer(async (_kind, label) => {
    cleanOptionLabel(label);
    throw new Error("DUPLICATE_OPTION");
  }, async (baseUrl) => {
    const whitespace = await fetch(`${baseUrl}/portal/opportunity-options`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-role": "opportunity_manager" },
      body: JSON.stringify({ kind: "department", label: "   " }),
    });
    assert.equal(whitespace.status, 400);
    assert.equal(
      (await whitespace.json() as { error: string }).error,
      "Option names must be between 2 and 100 characters",
    );

    const duplicate = await fetch(`${baseUrl}/portal/opportunity-options`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-role": "opportunity_manager" },
      body: JSON.stringify({ kind: "department", label: "Wardrobe" }),
    });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(await duplicate.json(), { error: "This option already exists" });
  });
});

test("unknown selector values return a clear opportunity error", async () => {
  await withServer(async () => {
    throw new Error("should not be called");
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/portal/opportunities`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-role": "opportunity_manager" },
      body: JSON.stringify(validOpportunityInput),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Choose a valid department and role type" });
  }, {
    opportunities: {
      createOpportunity: async () => {
        throw new Error("UNKNOWN_OPTION");
      },
    } as any,
  });
});