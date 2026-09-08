import { Router, type IRouter } from "express";
import {
  CreatePortalOpportunityBody, CreatePortalOpportunityResponse, DeletePortalOpportunityBody, DeletePortalOpportunityParams,
  GetPortalDashboardResponse, GetPortalOpportunityParams, GetPortalOpportunityResponse, GetPortalSessionResponse,
  GetPublicOpportunityParams, GetPublicOpportunityResponse, ListOpportunityAuditEventsParams, ListOpportunityAuditEventsResponse,
  ListPortalMembersResponse, ListPortalOpportunitiesQueryParams, ListPortalOpportunitiesResponse,
  ListPublicOpportunitiesQueryParams, ListPublicOpportunitiesResponse, TransitionPortalOpportunityBody,
  TransitionPortalOpportunityParams, TransitionPortalOpportunityResponse, UpdatePortalMemberBody, UpdatePortalMemberParams,
  UpdatePortalMemberResponse, UpdatePortalOpportunityBody, UpdatePortalOpportunityParams, UpdatePortalOpportunityResponse,
} from "@workspace/api-zod";
import { auditEventsTable, db, portalMembershipsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requirePortal } from "../lib/portal-auth";
import { canTransition } from "../lib/permissions";
import { toPublicStatus } from "../lib/opportunity-domain";
import * as opportunities from "../lib/opportunity-service";

const router: IRouter = Router();
const invalid = (res: any, error: unknown) => res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
const publicMap = (row: any) => ({
  id: row.id, slug: row.slug, title: row.title,
  status: toPublicStatus(row.status),
  publicationLabel: row.publicationLabel, department: row.department, roleType: row.roleType, summary: row.summary,
  responsibilities: row.contentItems.filter((x: any) => x.section === "responsibility").map((x: any) => x.content),
  essential: row.contentItems.filter((x: any) => x.section === "essential").map((x: any) => x.content),
  desired: row.contentItems.filter((x: any) => x.section === "desired").map((x: any) => x.content),
  details: row.details, applicationDeadline: row.applicationDeadline, responseDate: row.responseDate,
  applicationUrl: row.applicationUrl, deadline: row.deadline, deadlineExtended: row.deadlineExtended,
  featured: row.featured, urgent: row.urgent,
});

router.get("/public/opportunities", async (req, res): Promise<void> => {
  const parsed = ListPublicOpportunitiesQueryParams.safeParse(req.query);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  res.json(ListPublicOpportunitiesResponse.parse((await opportunities.listPublic(parsed.data.q)).map(publicMap)));
});
router.get("/public/opportunities/:slug", async (req, res): Promise<void> => {
  const parsed = GetPublicOpportunityParams.safeParse(req.params);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  const row = (await opportunities.listPublic()).find((item) => item.slug === parsed.data.slug);
  if (!row) { res.status(404).json({ error: "Opportunity not found" }); return; }
  res.json(GetPublicOpportunityResponse.parse(publicMap(row)));
});

router.get("/portal/session", requirePortal(), async (req, res): Promise<void> => {
  const actor = req.portalActor!;
  const [member] = await db.select().from(portalMembershipsTable).where(eq(portalMembershipsTable.userId, actor.userId));
  res.json(GetPortalSessionResponse.parse({ member, permissions: actor.permissions }));
});
router.get("/portal/dashboard", requirePortal("opportunities:read"), async (_req, res): Promise<void> => {
  res.json(GetPortalDashboardResponse.parse(await opportunities.dashboard()));
});
router.get("/portal/opportunities", requirePortal("opportunities:read"), async (req, res): Promise<void> => {
  const parsed = ListPortalOpportunitiesQueryParams.safeParse(req.query);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  res.json(ListPortalOpportunitiesResponse.parse(await opportunities.listOpportunities(parsed.data)));
});
router.post("/portal/opportunities", requirePortal("opportunities:write"), async (req, res): Promise<void> => {
  const parsed = CreatePortalOpportunityBody.safeParse(req.body);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  try { res.status(201).json(CreatePortalOpportunityResponse.parse(await opportunities.createOpportunity(parsed.data, req.portalActor!))); }
  catch (error) { if ((error as Error).message === "DUPLICATE") { res.status(409).json({ error: "Slug already exists" }); return; } throw error; }
});
router.get("/portal/opportunities/:id", requirePortal("opportunities:read"), async (req, res): Promise<void> => {
  const parsed = GetPortalOpportunityParams.safeParse(req.params);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  const row = await opportunities.getOpportunity(parsed.data.id);
  if (!row) { res.status(404).json({ error: "Opportunity not found" }); return; }
  res.json(GetPortalOpportunityResponse.parse(row));
});
router.patch("/portal/opportunities/:id", requirePortal("opportunities:write"), async (req, res): Promise<void> => {
  const params = UpdatePortalOpportunityParams.safeParse(req.params), body = UpdatePortalOpportunityBody.safeParse(req.body);
  if (!params.success) { invalid(res, params.error); return; } if (!body.success) { invalid(res, body.error); return; }
  try {
    const row = await opportunities.updateOpportunity(params.data.id, body.data, req.portalActor!);
    if (!row) { res.status(404).json({ error: "Opportunity not found" }); return; }
    res.json(UpdatePortalOpportunityResponse.parse(row));
  } catch (error) { if ((error as Error).message === "DUPLICATE") { res.status(409).json({ error: "Slug already exists" }); return; } throw error; }
});
router.post("/portal/opportunities/:id/transition", requirePortal("opportunities:write"), async (req, res): Promise<void> => {
  const params = TransitionPortalOpportunityParams.safeParse(req.params), body = TransitionPortalOpportunityBody.safeParse(req.body);
  if (!params.success) { invalid(res, params.error); return; } if (!body.success) { invalid(res, body.error); return; }
  if (!canTransition(req.portalActor!.role, body.data.status)) { res.status(403).json({ error: "Insufficient permission" }); return; }
  try {
    const row = await opportunities.transitionOpportunity(params.data.id, body.data.status, req.portalActor!);
    if (!row) { res.status(404).json({ error: "Opportunity not found" }); return; }
    res.json(TransitionPortalOpportunityResponse.parse(row));
  } catch (error) { if ((error as Error).message === "INVALID_TRANSITION") { res.status(409).json({ error: "Invalid lifecycle transition" }); return; } throw error; }
});
router.delete("/portal/opportunities/:id", requirePortal("opportunities:delete"), async (req, res): Promise<void> => {
  const params = DeletePortalOpportunityParams.safeParse(req.params), body = DeletePortalOpportunityBody.safeParse(req.body);
  if (!params.success) { invalid(res, params.error); return; } if (!body.success) { invalid(res, body.error); return; }
  const outcome = await opportunities.deleteOpportunity(params.data.id, req.portalActor!);
  if (outcome === "NOT_FOUND") { res.status(404).json({ error: "Opportunity not found" }); return; }
  if (outcome === "NOT_ARCHIVED") { res.status(400).json({ error: "Only archived opportunities can be deleted" }); return; }
  res.status(204).send();
});
router.get("/portal/opportunities/:id/audit", requirePortal("opportunities:read"), async (req, res): Promise<void> => {
  const parsed = ListOpportunityAuditEventsParams.safeParse(req.params);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  if (!await opportunities.getOpportunity(parsed.data.id)) { res.status(404).json({ error: "Opportunity not found" }); return; }
  res.json(ListOpportunityAuditEventsResponse.parse(await opportunities.auditList(parsed.data.id)));
});
router.get("/portal/members", requirePortal("members:manage"), async (_req, res): Promise<void> => {
  res.json(ListPortalMembersResponse.parse(await db.select().from(portalMembershipsTable).orderBy(desc(portalMembershipsTable.createdAt))));
});
router.patch("/portal/members/:userId", requirePortal("members:manage"), async (req, res): Promise<void> => {
  const params = UpdatePortalMemberParams.safeParse(req.params), body = UpdatePortalMemberBody.safeParse(req.body);
  if (!params.success) { invalid(res, params.error); return; } if (!body.success) { invalid(res, body.error); return; }
  const [before] = await db.select().from(portalMembershipsTable).where(eq(portalMembershipsTable.userId, params.data.userId));
  if (!before) { res.status(404).json({ error: "Portal member not found" }); return; }
  if (
    before.role === "super_admin" &&
    before.active &&
    (body.data.role !== "super_admin" || !body.data.active)
  ) {
    const activeAdmins = await db.select().from(portalMembershipsTable)
      .where(eq(portalMembershipsTable.role, "super_admin"));
    if (activeAdmins.filter((member) => member.active).length <= 1) {
      res.status(400).json({ error: "The last active Super Admin cannot be suspended or demoted" });
      return;
    }
  }
  const [member] = await db.update(portalMembershipsTable).set(body.data).where(eq(portalMembershipsTable.userId, params.data.userId)).returning();
  await db.insert(auditEventsTable).values({ action: "member.updated", actorUserId: req.portalActor!.userId, actorName: req.portalActor!.displayName, beforeState: before, afterState: member });
  res.json(UpdatePortalMemberResponse.parse(member));
});
export default router;