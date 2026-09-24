import { Router } from "express";
import {
  CreatePortalProgrammeBody, CreatePortalProgrammeResponse, DeletePortalProgrammeParams,
  GetPortalProgrammeParams, GetPortalProgrammeResponse, ListPortalProgrammesQueryParams,
  ListPortalProgrammesResponse, ListPublicProgrammesQueryParams, ListPublicProgrammesResponse,
  GetPublicProgrammeParams, GetPublicProgrammeResponse, TransitionPortalProgrammeBody,
  TransitionPortalProgrammeParams, TransitionPortalProgrammeResponse, UpdatePortalProgrammeBody,
  UpdatePortalProgrammeParams, UpdatePortalProgrammeResponse, ListProgrammeAuditEventsResponse,
} from "@workspace/api-zod";
import { requirePortal } from "../lib/portal-auth";
import * as programmes from "../lib/programme-service";
import { canTransitionProgramme } from "../lib/permissions";

const input = CreatePortalProgrammeBody;
const query = ListPortalProgrammesQueryParams;
const id = GetPortalProgrammeParams;
const invalid = (res: any, error: unknown) => res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
const publicMap = (row: any) => ({
  id: row.id, slug: row.slug, num: row.num, cardTitle: row.cardTitle, cardCopy: row.cardCopy, cardCta: row.cardCta,
  image: row.image, title: row.title, shortDescription: row.shortDescription, status: row.status,
  applicationStatus: row.applicationStatus, location: row.location, applicationUrl: row.applicationUrl,
  applicationDeadline: row.applicationDeadline, deadline: row.deadline, featured: row.featured,
  displayOrder: row.displayOrder,
  about: row.sections.filter((x: any) => x.section === "about").map((x: any) => x.content),
  placement: row.sections.filter((x: any) => x.section === "placement").map((x: any) => x.content),
  training: row.sections.filter((x: any) => x.section === "training").map((x: any) => x.content),
  eligibility: row.sections.filter((x: any) => x.section === "eligibility").map((x: any) => x.content),
  timeline: row.sections.filter((x: any) => x.section === "timeline").map((x: any) => x.content),
  applicationGuidance: row.sections.filter((x: any) => x.section === "application_guidance").map((x: any) => x.content),
});

type ProgrammeRouteDependencies = {
  requirePortal: typeof requirePortal;
  programmes: typeof programmes;
};
export function createProgrammesRouter(overrides: Partial<ProgrammeRouteDependencies> = {}) {
  const dependencies: ProgrammeRouteDependencies = { requirePortal, programmes, ...overrides };
  const router = Router();
router.get("/public/programmes", async (req, res) => {
  const parsed = ListPublicProgrammesQueryParams.safeParse(req.query);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  res.json(ListPublicProgrammesResponse.parse((await dependencies.programmes.listPublicProgrammes(parsed.data.q)).map(publicMap)));
});
router.get("/public/programmes/:slug", async (req, res) => {
  const parsed = GetPublicProgrammeParams.safeParse(req.params);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  const row = await dependencies.programmes.getPublicProgramme(parsed.data.slug);
  if (!row) { res.status(404).json({ error: "Programme not found" }); return; }
  res.json(GetPublicProgrammeResponse.parse(publicMap(row)));
});
router.get("/portal/programmes", dependencies.requirePortal("programmes:read"), async (req, res) => {
  const parsed = query.safeParse(req.query); if (!parsed.success) { invalid(res, parsed.error); return; }
  res.json(ListPortalProgrammesResponse.parse(await dependencies.programmes.listProgrammes(parsed.data)));
});
router.post("/portal/programmes", dependencies.requirePortal("programmes:write"), async (req, res) => {
  const parsed = input.safeParse(req.body); if (!parsed.success) { invalid(res, parsed.error); return; }
  try { res.status(201).json(CreatePortalProgrammeResponse.parse(await dependencies.programmes.createProgramme(parsed.data, req.portalActor!))); }
  catch (error) { if ((error as Error).message === "DUPLICATE") { res.status(409).json({ error: "Slug already exists" }); return; } throw error; }
});
router.get("/portal/programmes/:id", dependencies.requirePortal("programmes:read"), async (req, res) => {
  const parsed = id.safeParse(req.params); if (!parsed.success) { invalid(res, parsed.error); return; }
  const row = await dependencies.programmes.getProgramme(parsed.data.id); if (!row) { res.status(404).json({ error: "Programme not found" }); return; } res.json(GetPortalProgrammeResponse.parse(row));
});
router.patch("/portal/programmes/:id", dependencies.requirePortal("programmes:write"), async (req, res) => {
  const params = id.safeParse(req.params), body = input.safeParse(req.body);
  if (!params.success || !body.success) { invalid(res, !params.success ? params.error : body.error); return; }
  try { const row = await dependencies.programmes.updateProgramme(params.data.id, body.data, req.portalActor!); if (!row) { res.status(404).json({ error: "Programme not found" }); return; } res.json(UpdatePortalProgrammeResponse.parse(row)); }
  catch (error) { if ((error as Error).message === "DUPLICATE") { res.status(409).json({ error: "Slug already exists" }); return; } throw error; }
});
router.post("/portal/programmes/:id/transition", dependencies.requirePortal("programmes:write"), async (req, res) => {
  const params = TransitionPortalProgrammeParams.safeParse(req.params), status = TransitionPortalProgrammeBody.safeParse(req.body);
  if (!params.success || !status.success) { invalid(res, !params.success ? params.error : status.error); return; }
  if (!canTransitionProgramme(req.portalActor!.role, status.data.status)) { res.status(403).json({ error: "Insufficient permission" }); return; }
  try { const row = await dependencies.programmes.transitionProgramme(params.data.id, status.data.status, req.portalActor!); if (!row) { res.status(404).json({ error: "Programme not found" }); return; } res.json(TransitionPortalProgrammeResponse.parse(row)); }
  catch (error) { res.status(409).json({ error: (error as Error).message }); }
});
router.delete("/portal/programmes/:id", dependencies.requirePortal("programmes:delete"), async (req, res) => {
  const parsed = DeletePortalProgrammeParams.safeParse(req.params); if (!parsed.success) { invalid(res, parsed.error); return; }
  const result = await dependencies.programmes.deleteProgramme(parsed.data.id, req.portalActor!);
  if (result === "NOT_FOUND") { res.status(404).json({ error: "Programme not found" }); return; }
  if (result === "NOT_ARCHIVED") { res.status(400).json({ error: "Only archived programmes can be deleted" }); return; }
  res.status(204).send();
});
router.get("/portal/programmes/:id/audit", dependencies.requirePortal("programmes:read"), async (req, res) => {
  const parsed = id.safeParse(req.params); if (!parsed.success) { invalid(res, parsed.error); return; }
  if (!await dependencies.programmes.getProgramme(parsed.data.id)) { res.status(404).json({ error: "Programme not found" }); return; }
  res.json(ListProgrammeAuditEventsResponse.parse(await dependencies.programmes.programmeAuditList(parsed.data.id)));
});
  return router;
}
export default createProgrammesRouter();