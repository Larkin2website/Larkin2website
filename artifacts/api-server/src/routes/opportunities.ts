import { Router, type IRouter } from "express";
import {
  CreatePortalOpportunityBody, CreatePortalOpportunityResponse, CreatePortalOpportunityOptionBody, CreatePortalOpportunityOptionResponse,
  DeletePortalOpportunityBody, DeletePortalOpportunityParams,
  GetPortalDashboardResponse, GetPortalOpportunityParams, GetPortalOpportunityResponse, GetPortalSessionResponse,
  GetPublicOpportunityParams, GetPublicOpportunityResponse, ListOpportunityAuditEventsParams, ListOpportunityAuditEventsResponse,
  ListPortalMembersResponse, ListPortalOpportunitiesQueryParams, ListPortalOpportunitiesResponse, ListPortalOpportunityOptionsResponse,
  ListPublicOpportunitiesQueryParams, ListPublicOpportunitiesResponse, MergePortalOpportunityOptionBody, MergePortalOpportunityOptionParams,
  MergePortalOpportunityOptionResponse, RenamePortalOpportunityOptionBody, RenamePortalOpportunityOptionParams,
  RenamePortalOpportunityOptionResponse, RetirePortalOpportunityOptionParams, RetirePortalOpportunityOptionResponse, TransitionPortalOpportunityBody,
  TransitionPortalOpportunityParams, TransitionPortalOpportunityResponse, UpdatePortalMemberBody, UpdatePortalMemberParams,
  UpdatePortalMemberResponse, UpdatePortalOpportunityBody, UpdatePortalOpportunityParams, UpdatePortalOpportunityResponse,
} from "@workspace/api-zod";
import { auditEventsTable, db, portalMembershipsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requirePortal } from "../lib/portal-auth";
import { demoPortalMember } from "../lib/portal-demo";
import { canTransition } from "../lib/permissions";
import { toPublicStatus } from "../lib/opportunity-domain";
import * as opportunities from "../lib/opportunity-service";
import * as opportunityOptions from "../lib/opportunity-option-service";

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

type OpportunityRouteDependencies = {
  requirePortal: typeof requirePortal;
  opportunities: typeof opportunities;
  opportunityOptions: typeof opportunityOptions;
};

export function createOpportunitiesRouter(overrides: Partial<OpportunityRouteDependencies> = {}): IRouter {
const dependencies: OpportunityRouteDependencies = {
  requirePortal,
  opportunities,
  opportunityOptions,
  ...overrides,
};
const router: IRouter = Router();

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

router.get("/portal/session", dependencies.requirePortal(), async (req, res): Promise<void> => {
  const actor = req.portalActor!;
  if (actor.demo) {
    res.json(GetPortalSessionResponse.parse({
      member: demoPortalMember(),
      permissions: actor.permissions,
    }));
    return;
  }
  const [member] = await db.select().from(portalMembershipsTable).where(eq(portalMembershipsTable.userId, actor.userId));
  res.json(GetPortalSessionResponse.parse({ member, permissions: actor.permissions }));
});
router.get("/portal/dashboard", dependencies.requirePortal("opportunities:read"), async (_req, res): Promise<void> => {
  res.json(GetPortalDashboardResponse.parse(await dependencies.opportunities.dashboard()));
});
router.get("/portal/opportunity-options", dependencies.requirePortal("opportunities:read"), async (req, res): Promise<void> => {
  const includeRetired = req.query.includeRetired === "true" && req.portalActor!.role === "super_admin";
  res.json(ListPortalOpportunityOptionsResponse.parse(await dependencies.opportunityOptions.listOpportunityOptions(includeRetired)));
});
router.post("/portal/opportunity-options", dependencies.requirePortal("opportunity-options:manage"), async (req, res): Promise<void> => {
  const parsed = CreatePortalOpportunityOptionBody.safeParse(req.body);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  try {
    const created = await dependencies.opportunityOptions.createOpportunityOption(parsed.data.kind, parsed.data.label, req.portalActor!);
    res.status(201).json(CreatePortalOpportunityOptionResponse.parse(created));
  } catch (error) {
    if ((error as Error).message === "INVALID_OPTION") {
      res.status(400).json({ error: "Option names must be between 2 and 100 characters" });
      return;
    }
    if ((error as Error).message === "DUPLICATE_OPTION") {
      res.status(409).json({ error: "This option already exists" });
      return;
    }
    throw error;
  }
});
router.patch("/portal/opportunity-options/:id", dependencies.requirePortal("opportunity-options:lifecycle"), async (req, res): Promise<void> => {
  const params = RenamePortalOpportunityOptionParams.safeParse(req.params);
  const body = RenamePortalOpportunityOptionBody.safeParse(req.body);
  if (!params.success) { invalid(res, params.error); return; }
  if (!body.success) { invalid(res, body.error); return; }
  try {
    res.json(RenamePortalOpportunityOptionResponse.parse(
      await opportunityOptions.renameOpportunityOption(params.data.id, body.data.label, req.portalActor!),
    ));
  } catch (error) {
    if ((error as Error).message === "OPTION_NOT_FOUND") { res.status(404).json({ error: "Opportunity option not found" }); return; }
    if ((error as Error).message === "OPTION_RETIRED") { res.status(400).json({ error: "Retired options cannot be renamed" }); return; }
    if ((error as Error).message === "INVALID_OPTION") { res.status(400).json({ error: "Option names must be between 2 and 100 characters" }); return; }
    if ((error as Error).message === "DUPLICATE_OPTION") { res.status(409).json({ error: "This option already exists" }); return; }
    throw error;
  }
});
router.post("/portal/opportunity-options/:id/retire", dependencies.requirePortal("opportunity-options:lifecycle"), async (req, res): Promise<void> => {
  const params = RetirePortalOpportunityOptionParams.safeParse(req.params);
  if (!params.success) { invalid(res, params.error); return; }
  try {
    res.json(RetirePortalOpportunityOptionResponse.parse(
      await opportunityOptions.retireOpportunityOption(params.data.id, req.portalActor!),
    ));
  } catch (error) {
    if ((error as Error).message === "OPTION_NOT_FOUND") { res.status(404).json({ error: "Opportunity option not found" }); return; }
    if ((error as Error).message === "OPTION_RETIRED") { res.status(400).json({ error: "This option is already retired" }); return; }
    throw error;
  }
});
router.post("/portal/opportunity-options/:id/merge", dependencies.requirePortal("opportunity-options:lifecycle"), async (req, res): Promise<void> => {
  const params = MergePortalOpportunityOptionParams.safeParse(req.params);
  const body = MergePortalOpportunityOptionBody.safeParse(req.body);
  if (!params.success) { invalid(res, params.error); return; }
  if (!body.success) { invalid(res, body.error); return; }
  try {
    res.json(MergePortalOpportunityOptionResponse.parse(
      await opportunityOptions.mergeOpportunityOption(params.data.id, body.data.targetId, req.portalActor!),
    ));
  } catch (error) {
    if ((error as Error).message === "OPTION_NOT_FOUND") { res.status(404).json({ error: "Opportunity option not found" }); return; }
    if ((error as Error).message === "INVALID_MERGE") { res.status(400).json({ error: "Choose a different active option of the same kind" }); return; }
    throw error;
  }
});
router.get("/portal/opportunities", dependencies.requirePortal("opportunities:read"), async (req, res): Promise<void> => {
  const parsed = ListPortalOpportunitiesQueryParams.safeParse(req.query);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  res.json(ListPortalOpportunitiesResponse.parse(await opportunities.listOpportunities(parsed.data)));
});
router.post("/portal/opportunities", dependencies.requirePortal("opportunities:write"), async (req, res): Promise<void> => {
  const parsed = CreatePortalOpportunityBody.safeParse(req.body);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  try { res.status(201).json(CreatePortalOpportunityResponse.parse(await dependencies.opportunities.createOpportunity(parsed.data, req.portalActor!))); }
  catch (error) {
    if ((error as Error).message === "DUPLICATE") { res.status(409).json({ error: "Slug already exists" }); return; }
    if ((error as Error).message === "UNKNOWN_OPTION") { res.status(400).json({ error: "Choose a valid department and role type" }); return; }
    throw error;
  }
});
router.get("/portal/opportunities/:id", dependencies.requirePortal("opportunities:read"), async (req, res): Promise<void> => {
  const parsed = GetPortalOpportunityParams.safeParse(req.params);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  const row = await opportunities.getOpportunity(parsed.data.id);
  if (!row) { res.status(404).json({ error: "Opportunity not found" }); return; }
  res.json(GetPortalOpportunityResponse.parse(row));
});
router.patch("/portal/opportunities/:id", dependencies.requirePortal("opportunities:write"), async (req, res): Promise<void> => {
  const params = UpdatePortalOpportunityParams.safeParse(req.params), body = UpdatePortalOpportunityBody.safeParse(req.body);
  if (!params.success) { invalid(res, params.error); return; } if (!body.success) { invalid(res, body.error); return; }
  try {
    const row = await opportunities.updateOpportunity(params.data.id, body.data, req.portalActor!);
    if (!row) { res.status(404).json({ error: "Opportunity not found" }); return; }
    res.json(UpdatePortalOpportunityResponse.parse(row));
  } catch (error) {
    if ((error as Error).message === "DUPLICATE") { res.status(409).json({ error: "Slug already exists" }); return; }
    if ((error as Error).message === "UNKNOWN_OPTION") { res.status(400).json({ error: "Choose a valid department and role type" }); return; }
    throw error;
  }
});
router.post("/portal/opportunities/:id/transition", dependencies.requirePortal("opportunities:write"), async (req, res): Promise<void> => {
  const params = TransitionPortalOpportunityParams.safeParse(req.params), body = TransitionPortalOpportunityBody.safeParse(req.body);
  if (!params.success) { invalid(res, params.error); return; } if (!body.success) { invalid(res, body.error); return; }
  if (!canTransition(req.portalActor!.role, body.data.status)) { res.status(403).json({ error: "Insufficient permission" }); return; }
  try {
    const row = await opportunities.transitionOpportunity(params.data.id, body.data.status, req.portalActor!);
    if (!row) { res.status(404).json({ error: "Opportunity not found" }); return; }
    res.json(TransitionPortalOpportunityResponse.parse(row));
  } catch (error) { if ((error as Error).message === "INVALID_TRANSITION") { res.status(409).json({ error: "Invalid lifecycle transition" }); return; } throw error; }
});
router.delete("/portal/opportunities/:id", dependencies.requirePortal("opportunities:delete"), async (req, res): Promise<void> => {
  const params = DeletePortalOpportunityParams.safeParse(req.params), body = DeletePortalOpportunityBody.safeParse(req.body);
  if (!params.success) { invalid(res, params.error); return; } if (!body.success) { invalid(res, body.error); return; }
  const outcome = await opportunities.deleteOpportunity(params.data.id, req.portalActor!);
  if (outcome === "NOT_FOUND") { res.status(404).json({ error: "Opportunity not found" }); return; }
  if (outcome === "NOT_ARCHIVED") { res.status(400).json({ error: "Only archived opportunities can be deleted" }); return; }
  res.status(204).send();
});
router.get("/portal/opportunities/:id/audit", dependencies.requirePortal("opportunities:read"), async (req, res): Promise<void> => {
  const parsed = ListOpportunityAuditEventsParams.safeParse(req.params);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  if (!await opportunities.getOpportunity(parsed.data.id)) { res.status(404).json({ error: "Opportunity not found" }); return; }
  res.json(ListOpportunityAuditEventsResponse.parse(await opportunities.auditList(parsed.data.id)));
});
router.get("/portal/members", dependencies.requirePortal("members:manage"), async (_req, res): Promise<void> => {
  res.json(ListPortalMembersResponse.parse(await db.select().from(portalMembershipsTable).orderBy(desc(portalMembershipsTable.createdAt))));
});
router.patch("/portal/members/:userId", dependencies.requirePortal("members:manage"), async (req, res): Promise<void> => {
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
return router;
}

export default createOpportunitiesRouter();