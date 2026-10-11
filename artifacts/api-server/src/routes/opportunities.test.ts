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

test("public list and detail include profile fields but never internal recruitment planning", async () => {
  const row = {
    ...validOpportunityInput, id: optionId, status: "published", createdAt, updatedAt: createdAt,
    createdBy: "staff", updatedBy: "staff", accountableTo: "Head of department",
    contractDatesHours: "10-hour days, planned hiatus in December", workArrangement: "hybrid",
    worksCloselyWith: ["Camera", "Production"], additionalInformation: "Portfolio requested",
    applicationEmail: "agreed@example.com", applicationClosingDate: "2026-12-01",
    applicationClosingTime: "17:00", applicationInstructions: "Send your CV",
    trainingApplicationInstructions: "Alternative formats are welcome",
    recruitmentRoute: "production", shortlistSize: 8, interviewFormat: "virtual",
    interviewDates: "unknown", technicalQuestions: ["PRIVATE TECHNICAL DRAFT"],
    contentItems: [], details: [],
  };
  await withServer(async () => { throw new Error("unused"); }, async base => {
    for (const path of ["/public/opportunities", `/public/opportunities/${row.slug}`]) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200);
      const body = await response.json();
      const profile = Array.isArray(body) ? body[0] : body;
      assert.equal(profile.accountableTo, row.accountableTo);
      assert.deepEqual(profile.worksCloselyWith, row.worksCloselyWith);
      assert.equal(profile.applicationEmail, row.applicationEmail);
      assert.equal(profile.trainingApplicationInstructions, row.trainingApplicationInstructions);
      for (const field of ["recruitmentRoute", "shortlistSize", "interviewFormat", "interviewDates", "technicalQuestions", "createdBy", "updatedBy"]) {
        assert.equal(field in profile, false, field);
      }
      assert.equal(JSON.stringify(body).includes("PRIVATE TECHNICAL DRAFT"), false);
    }
    const privateResponse = await fetch(`${base}/portal/opportunities/${optionId}`, { headers: { "x-test-role": "viewer" } });
    assert.equal(privateResponse.status, 200);
    assert.deepEqual((await privateResponse.json() as { technicalQuestions: string[] }).technicalQuestions, row.technicalQuestions);
    assert.equal((await fetch(`${base}/portal/opportunities/${optionId}`)).status, 401);
    assert.equal((await fetch(`${base}/portal/opportunities`, {
      method: "POST", headers: { "content-type": "application/json", "x-test-role": "viewer" },
      body: JSON.stringify(row),
    })).status, 403);
  }, { opportunities: { listPublic: async () => [row], getOpportunity: async () => row } as any });
});

test("create and edit reject conflicting application destinations without calling persistence", async () => {
  await withServer(async () => { throw new Error("unused"); }, async base => {
    for (const [path, method] of [["/portal/opportunities", "POST"], [`/portal/opportunities/${optionId}`, "PATCH"]]) {
      const response = await fetch(`${base}${path}`, {
        method, headers: { "content-type": "application/json", "x-test-role": "opportunity_manager" },
        body: JSON.stringify({ ...validOpportunityInput, applicationEmail: "agreed@example.com", applicationUrl: "https://example.com" }),
      });
      assert.equal(response.status, 400);
    }
  });
});

test("public opportunity options need no authentication and expose active labels only", async () => {
  let includeRetiredValue: boolean | undefined;
  await withServer(async () => {
    throw new Error("should not be called");
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/public/opportunity-options`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      departments: ["Art", "Wardrobe"],
      roleTypes: ["Freelance"],
    });
    assert.equal(includeRetiredValue, false);
  }, {
    opportunityOptions: {
      listOpportunityOptions: async (includeRetired = false) => {
        includeRetiredValue = includeRetired;
        return {
          departments: [
            { id: optionId, kind: "department", label: "Art", active: true, retiredAt: null, createdAt },
            { id: optionId, kind: "department", label: "Wardrobe", active: true, retiredAt: null, createdAt },
          ],
          roleTypes: [
            { id: optionId, kind: "role_type", label: "Freelance", active: true, retiredAt: null, createdAt },
          ],
        };
      },
      createOpportunityOption: async () => undefined,
    } as any,
  });
});

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

test("only super admins can restore a retired category", async () => {
  let calls = 0;
  const restored = {
    id: optionId, kind: "department", label: "Wardrobe", active: true,
    retiredAt: null, createdAt,
  };
  await withServer(async () => restored, async (baseUrl) => {
    const forbidden = await fetch(`${baseUrl}/portal/opportunity-options/${optionId}/restore`, {
      method: "POST",
      headers: { "x-test-role": "opportunity_manager" },
    });
    assert.equal(forbidden.status, 403);

    const response = await fetch(`${baseUrl}/portal/opportunity-options/${optionId}/restore`, {
      method: "POST",
      headers: { "x-test-role": "super_admin" },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { active: boolean }).active, true);
    assert.equal(calls, 1);
  }, {
    opportunityOptions: {
      listOpportunityOptions: async () => ({ departments: [], roleTypes: [] }),
      createOpportunityOption: async () => restored,
      restoreOpportunityOption: async () => {
        calls += 1;
        return restored;
      },
    } as any,
  });
});

test("category restore returns safe lifecycle and duplicate errors", async () => {
  let errorCode = "OPTION_ACTIVE";
  await withServer(async () => {
    throw new Error("should not be called");
  }, async (baseUrl) => {
    const alreadyActive = await fetch(`${baseUrl}/portal/opportunity-options/${optionId}/restore`, {
      method: "POST",
      headers: { "x-test-role": "super_admin" },
    });
    assert.equal(alreadyActive.status, 400);
    assert.deepEqual(await alreadyActive.json(), { error: "This option is already active" });

    errorCode = "DUPLICATE_OPTION";
    const duplicate = await fetch(`${baseUrl}/portal/opportunity-options/${optionId}/restore`, {
      method: "POST",
      headers: { "x-test-role": "super_admin" },
    });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(await duplicate.json(), { error: "An active option with this name already exists" });
  }, {
    opportunityOptions: {
      listOpportunityOptions: async () => ({ departments: [], roleTypes: [] }),
      createOpportunityOption: async () => undefined,
      restoreOpportunityOption: async () => { throw new Error(errorCode); },
    } as any,
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

test("super admins can create a named pending access grant and duplicate email is clear", async () => {
  const member = {
    id: "22222222-2222-4222-8222-222222222222",
    userId: null,
    displayName: "Alex Morgan",
    email: "alex@example.com",
    normalizedEmail: "alex@example.com",
    role: "viewer" as const,
    active: true,
    status: "pending" as const,
    createdAt,
    updatedAt: createdAt,
  };
  let duplicate = false;
  await withServer(async () => {
    throw new Error("should not be called");
  }, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/portal/access-grants`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-role": "super_admin" },
      body: JSON.stringify({ displayName: "Alex Morgan", email: "Alex@Example.com", role: "viewer" }),
    });
    assert.equal(created.status, 201);
    const { normalizedEmail: _normalizedEmail, ...publicMember } = member;
    assert.deepEqual(await created.json(), {
      ...publicMember,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });

    duplicate = true;
    const conflict = await fetch(`${baseUrl}/portal/access-grants`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-role": "super_admin" },
      body: JSON.stringify({ displayName: "Another Alex", email: "alex@example.com", role: "viewer" }),
    });
    assert.equal(conflict.status, 409);
    assert.deepEqual(await conflict.json(), { error: "Access has already been granted to this email address" });
  }, {
    grantPortalAccess: async () => {
      if (duplicate) throw new Error("DUPLICATE_EMAIL");
      return member;
    },
  });
});

test("non-admins cannot create access grants", async () => {
  let called = false;
  await withServer(async () => {
    throw new Error("should not be called");
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/portal/access-grants`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-role": "opportunity_manager" },
      body: JSON.stringify({ displayName: "Alex Morgan", email: "alex@example.com", role: "viewer" }),
    });
    assert.equal(response.status, 403);
    assert.equal(called, false);
  }, {
    grantPortalAccess: async () => {
      called = true;
      throw new Error("should not be called");
    },
  });
});

test("an access grant claimed during an admin update returns a refresh conflict", async () => {
  await withServer(async () => {
    throw new Error("should not be called");
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/portal/members/11111111-1111-4111-8111-111111111111`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-test-role": "super_admin" },
      body: JSON.stringify({ role: "viewer", active: false }),
    });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: "This access grant was already claimed; refresh the member list",
    });
  }, {
    updatePortalPerson: async () => {
      throw new Error("GRANT_ALREADY_CLAIMED");
    },
  });
});

test("portal role lifecycle controls public role visibility through the same service boundary", async () => {
  const roleId = "22222222-2222-4222-8222-222222222222";
  const state = new Map<string, any>();
  const service: any = {
    listPublic: async () => [...state.values()].filter((row) => ["published", "closed", "filled"].includes(row.status)),
    createOpportunity: async (body: any, actor: PortalActor) => {
      const now = new Date();
      const row = {
        ...body,
        id: roleId,
        status: "draft",
        contentItems: body.contentItems.map((item: any, index: number) => ({
          ...item,
          id: `33333333-3333-4333-8333-${String(index).padStart(12, "0")}`,
        })),
        details: body.details.map((detail: any, index: number) => ({
          ...detail,
          id: `44444444-4444-4444-8444-${String(index).padStart(12, "0")}`,
        })),
        publishedAt: null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      };
      state.set(roleId, row);
      return row;
    },
    transitionOpportunity: async (id: string, status: string, actor: PortalActor) => {
      const row = state.get(id);
      if (!row) return undefined;
      row.status = status;
      row.updatedBy = actor.userId;
      row.updatedAt = new Date();
      return row;
    },
  };

  await withServer(async () => {
    throw new Error("option creation should not be called");
  }, async (baseUrl) => {
    const headers = { "content-type": "application/json", "x-test-role": "super_admin" };
    const create = await fetch(`${baseUrl}/portal/opportunities`, {
      method: "POST",
      headers,
      body: JSON.stringify(validOpportunityInput),
    });
    assert.equal(create.status, 201);
    assert.deepEqual(await (await fetch(`${baseUrl}/public/opportunities`)).json(), []);
    assert.equal((await fetch(`${baseUrl}/public/opportunities/wardrobe-assistant`)).status, 404);

    const transition = (status: string) => fetch(`${baseUrl}/portal/opportunities/${roleId}/transition`, {
      method: "POST",
      headers,
      body: JSON.stringify({ status }),
    });
    assert.equal((await transition("published")).status, 200);
    const published = await (await fetch(`${baseUrl}/public/opportunities`)).json() as Array<{ slug: string; title: string }>;
    assert.deepEqual(published.map(({ slug, title }) => ({ slug, title })), [{
      slug: validOpportunityInput.slug,
      title: validOpportunityInput.title,
    }]);
    assert.equal((await fetch(`${baseUrl}/public/opportunities/wardrobe-assistant`)).status, 200);

    assert.equal((await transition("archived")).status, 200);
    assert.deepEqual(await (await fetch(`${baseUrl}/public/opportunities`)).json(), []);
    assert.equal((await fetch(`${baseUrl}/public/opportunities/wardrobe-assistant`)).status, 404);
  }, {
    opportunities: service,
  });
});