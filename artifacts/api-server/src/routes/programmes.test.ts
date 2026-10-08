import assert from "node:assert/strict";
import test from "node:test";
import express, { type RequestHandler } from "express";
import type { AddressInfo } from "node:net";
import type { Permission, PortalRole } from "../lib/permissions";
import { can, permissionsForRole } from "../lib/permissions";
import type { PortalActor } from "../lib/portal-auth";
import { createProgrammesRouter } from "./programmes";
import { CreatePortalProgrammeResponse, GetPublicProgrammeResponse } from "@workspace/api-zod";
import { programmeFieldsForWrite } from "../lib/programme-service";

const id = "11111111-1111-4111-8111-111111111111";
const input = {
  slug: "aa", num: "1", cardTitle: "AA", cardCopy: "A",
  cardCta: "A", image: "a", title: "AA",
  shortDescription: "A", applicationStatus: "Applications open soon",
  location: "A", applicationUrl: null, applicationDeadline: null,
  deadline: null, featured: false, displayOrder: 0, sections: [],
};

test("training authoring validates date-only strings and public responses gate unconfirmed registration", async () => {
  await withServer(async base => {
    const training = { ...input, category: "training", registrationState: "unconfirmed",
      registrationClosesOn: "2026-10-13", applicationUrl: "https://example.com/register",
      sections: [
        { section: "application_guidance", position: 0, content: "Signing up does not confirm your place." },
        { section: "application_guidance", position: 1, content: "Registration status is unconfirmed: No application link is available until these details are confirmed." },
      ] };
    const post = (data: unknown) => fetch(`${base}/portal/programmes`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data),
    });
    assert.equal((await post({ ...training, registrationClosesOn: "2026-02-31" })).status, 400);
    const created = await post(training);
    assert.equal(created.status, 201);
    const stored = CreatePortalProgrammeResponse.parse(await created.json());
    assert.equal(stored.registrationClosesOn, "2026-10-13");
    assert.equal(stored.category, "training");
    await fetch(`${base}/portal/programmes/${id}/transition`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "published" }),
    });
    const visible = GetPublicProgrammeResponse.parse(await (await fetch(`${base}/public/programmes/aa`)).json());
    assert.equal(visible.applicationStatus, "Course registration");
    assert.equal(visible.applicationUrl, null);
    assert.equal(visible.registrationClosesOn, "2026-10-13");
    assert.equal(visible.category, "training");
    await fetch(`${base}/portal/programmes/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...training, registrationClosesOn: null }),
    });
    const neutral = GetPublicProgrammeResponse.parse(await (await fetch(`${base}/public/programmes/aa`)).json());
    assert.equal(neutral.applicationStatus, "Course registration");
    assert.equal(neutral.applicationUrl, training.applicationUrl);
    assert.equal(neutral.registrationState, "unconfirmed");
    assert.deepEqual(neutral.applicationGuidance, ["Signing up does not confirm your place."]);
  }, { create: 0 });
});

function testAuth(permission?: Permission): RequestHandler {
  return (req, res, next) => {
    const role = (req.header("x-test-role") ?? "super_admin") as PortalRole;
    if (permission && !can(role, permission)) { res.status(403).json({ error: "Insufficient permission" }); return; }
    req.portalActor = { userId: `${role}-user`, displayName: role, email: `${role}@example.com`, role, permissions: permissionsForRole(role) } satisfies PortalActor;
    next();
  };
}

async function withServer(run: (base: string) => Promise<void>, calls: { create: number }) {
  const state = new Map<string, any>();
  const service: any = {
    listPublicProgrammes: async () => [...state.values()].filter((p) => p.status === "published" || p.status === "closed"),
    getPublicProgramme: async (slug: string) => [...state.values()].find((p) => p.slug === slug && (p.status === "published" || p.status === "closed")),
    listProgrammes: async () => ({ items: [...state.values()], page: 1, pageSize: 20, total: state.size, pageCount: 1 }),
    createProgramme: async (body: any, actor: PortalActor) => {
      calls.create += 1;
      const now = new Date();
      const row = { ...body, ...programmeFieldsForWrite(body),
        sections: body.sections.map((section: any, index: number) => ({ ...section, id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}` })),
        id, status: "draft", createdBy: actor.userId, updatedBy: actor.userId, createdAt: now, updatedAt: now, publishedAt: null, archivedAt: null };
      state.set(id, row); return row;
    },
    getProgramme: async (programmeId: string) => state.get(programmeId),
    updateProgramme: async (programmeId: string, body: any) => {
      const row = state.get(programmeId); if (!row) return undefined;
      const updated = { ...row, ...programmeFieldsForWrite(body, row),
        sections: body.sections.map((section: any, index: number) => ({ ...section, id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}` })),
        updatedAt: new Date() };
      state.set(programmeId, updated); return updated;
    },
    transitionProgramme: async (programmeId: string, status: string) => {
      const row = state.get(programmeId); if (!row) return undefined;
      row.status = status; row.updatedAt = new Date(); return row;
    },
    deleteProgramme: async () => "NOT_ARCHIVED",
    programmeAuditList: async () => [],
  };
  const app = express();
  app.use(express.json());
  app.use(createProgrammesRouter({ requirePortal: testAuth, programmes: service }));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); }
}

test("programme routes validate, publish, close, archive, and restore lifecycle visibility", async () => {
  const calls = { create: 0 };
  await withServer(async (base) => {
    const post = (body: unknown) => fetch(`${base}/portal/programmes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal((await post({ ...input, slug: "Not Valid" })).status, 400);
    assert.equal(calls.create, 0);
    const created = await post(input); assert.equal(created.status, 201);
    assert.equal((await (await fetch(`${base}/public/programmes`)).json() as unknown[]).length, 0);
    assert.equal((await fetch(`${base}/public/programmes/aa`)).status, 404);
    const transition = (status: string) => fetch(`${base}/portal/programmes/${id}/transition`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    assert.equal((await transition("published")).status, 200);
    assert.equal(((await (await fetch(`${base}/public/programmes`)).json() as Array<{ applicationStatus: string }>)[0]).applicationStatus, input.applicationStatus);
    assert.equal((await fetch(`${base}/public/programmes/aa`)).status, 200);
    assert.equal((await transition("closed")).status, 200);
    assert.equal((await fetch(`${base}/public/programmes/aa`)).status, 200);
    assert.equal((await transition("archived")).status, 200);
    assert.equal((await fetch(`${base}/public/programmes/aa`)).status, 404);
    assert.equal((await transition("draft")).status, 200);
    assert.equal((await fetch(`${base}/public/programmes/aa`)).status, 404);
  }, calls);
});

test("programme and training authoring accept missing or blank images and keep legacy edit values", async () => {
  await withServer(async base => {
    const { image: _, ...withoutImage } = input;
    for (const category of ["programme", "training"]) {
      for (const optionalImage of [{}, { image: "" }]) {
        const response = await fetch(`${base}/portal/programmes`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...withoutImage, category, ...optionalImage }),
        });
        assert.equal(response.status, 201);
        assert.equal(CreatePortalProgrammeResponse.parse(await response.json()).image, "");
        await fetch(`${base}/portal/programmes/${id}/transition`, {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "published" }),
        });
        const visible = GetPublicProgrammeResponse.parse(await (await fetch(`${base}/public/programmes/aa`)).json());
        assert.equal(visible.image, "");
      }
      await fetch(`${base}/portal/programmes`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, category }),
      });
      const updated = await fetch(`${base}/portal/programmes/${id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...withoutImage, category }),
      });
      assert.equal(updated.status, 200);
      assert.equal(CreatePortalProgrammeResponse.parse(await updated.json()).image, input.image);
    }
  }, { create: 0 });
});