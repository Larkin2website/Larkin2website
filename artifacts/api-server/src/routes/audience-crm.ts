import { Router, type RequestHandler } from "express";
import {
  CreateCrmEnquiryBody,
  CreateCrmEnquiryResponse,
  GetCrmAudienceMemberParams,
  GetCrmAudienceMemberResponse,
  GetCrmDashboardResponse,
  GetCrmTaxonomyResponse,
  GetPortalOpportunityMatchingParams,
  GetPortalOpportunityMatchingResponse,
  GetPortalProgrammeMatchingParams,
  GetPortalProgrammeMatchingResponse,
  ListCrmAudienceQueryParams,
  ListCrmAudienceResponse,
  ListCrmCommunicationsResponse,
  ListCrmEnquiriesResponse,
  RecordPublicEngagementBody,
  RecordPublicEngagementResponse,
  UpdateCrmEnquiryBody,
  UpdateCrmEnquiryParams,
  UpdateCrmEnquiryResponse,
  UpdatePortalOpportunityMatchingBody,
  UpdatePortalOpportunityMatchingParams,
  UpdatePortalOpportunityMatchingResponse,
  UpdatePortalProgrammeMatchingBody,
  UpdatePortalProgrammeMatchingParams,
  UpdatePortalProgrammeMatchingResponse,
} from "@workspace/api-zod";
import { requireCrmAccess, requirePortal } from "../lib/portal-auth";
import * as audience from "../lib/audience-crm-service";
import { createFixedWindowRateLimit } from "../middlewares/fixed-window-rate-limit";

const publicEngagementLimit = createFixedWindowRateLimit({ limit: 60, windowMs: 15 * 60 * 1000 });
const invalid = (res: any, error: unknown) =>
  res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
const matchingResult = (row: any) => ({
  id: row.id,
  contentType: row.contentType,
  careerLevels: row.careerLevels,
  crafts: row.crafts,
  tags: row.tags,
});

export function createAudienceCrmRouter(overrides: {
  listAudience?: typeof audience.listAudience;
  requireCrmAccess?: RequestHandler;
} = {}) {
const router = Router();

router.post("/public/engagement", publicEngagementLimit, async (req, res): Promise<void> => {
  const parsed = RecordPublicEngagementBody.safeParse(req.body);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  const recorded = await audience.recordEngagement(parsed.data.kind, parsed.data.id, parsed.data.event);
  if (!recorded) { res.status(400).json({ error: "Engagement target is not publicly available" }); return; }
  res.setHeader("Cache-Control", "no-store");
  res.json(RecordPublicEngagementResponse.parse({ recorded: true }));
});

router.get("/crm/dashboard", requireCrmAccess, async (_req, res): Promise<void> => {
  res.json(GetCrmDashboardResponse.parse(await audience.crmDashboard()));
});
router.get("/crm/audience", overrides.requireCrmAccess ?? requireCrmAccess, async (req, res): Promise<void> => {
  const rawActive = req.query.active;
  if (rawActive !== undefined && rawActive !== "true" && rawActive !== "false") {
    res.status(400).json({ error: "active must be true or false" });
    return;
  }
  const parsed = ListCrmAudienceQueryParams.safeParse({
    ...req.query,
    active: rawActive === undefined ? undefined : rawActive === "true",
  });
  if (!parsed.success) { invalid(res, parsed.error); return; }
  res.json(ListCrmAudienceResponse.parse(await (overrides.listAudience ?? audience.listAudience)(parsed.data)));
});
router.get("/crm/audience/:id", requireCrmAccess, async (req, res): Promise<void> => {
  const parsed = GetCrmAudienceMemberParams.safeParse(req.params);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  const member = await audience.getAudienceMember(parsed.data.id);
  if (!member) { res.status(404).json({ error: "Audience subscriber not found" }); return; }
  res.json(GetCrmAudienceMemberResponse.parse(member));
});
router.get("/crm/communications", requireCrmAccess, async (_req, res): Promise<void> => {
  res.json(ListCrmCommunicationsResponse.parse(await audience.listCommunications()));
});
router.get("/crm/enquiries", requireCrmAccess, async (_req, res): Promise<void> => {
  res.json(ListCrmEnquiriesResponse.parse(await audience.listEnquiries()));
});
router.post("/crm/enquiries", requireCrmAccess, async (req, res): Promise<void> => {
  const parsed = CreateCrmEnquiryBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.message.trim()) {
    invalid(res, parsed.success ? new Error("Message is required") : parsed.error);
    return;
  }
  res.status(201).json(CreateCrmEnquiryResponse.parse(await audience.createEnquiry(parsed.data)));
});
router.patch("/crm/enquiries/:id", requireCrmAccess, async (req, res): Promise<void> => {
  const params = UpdateCrmEnquiryParams.safeParse(req.params);
  const body = UpdateCrmEnquiryBody.safeParse(req.body);
  if (!params.success || !body.success) { invalid(res, params.success ? body.error : params.error); return; }
  const enquiry = await audience.updateEnquiry(params.data.id, body.data.status);
  if (!enquiry) { res.status(404).json({ error: "Enquiry not found" }); return; }
  res.json(UpdateCrmEnquiryResponse.parse(enquiry));
});
router.get("/crm/taxonomy", requireCrmAccess, async (_req, res): Promise<void> => {
  res.json(GetCrmTaxonomyResponse.parse(await audience.crmTaxonomy()));
});

router.get("/portal/opportunities/:id/matching", requirePortal("opportunities:read"), async (req, res): Promise<void> => {
  const params = GetPortalOpportunityMatchingParams.safeParse(req.params);
  if (!params.success) { invalid(res, params.error); return; }
  const result = await audience.getMatching("role", params.data.id);
  if (!result) { res.status(404).json({ error: "Opportunity not found" }); return; }
  res.json(GetPortalOpportunityMatchingResponse.parse(matchingResult(result)));
});
router.put("/portal/opportunities/:id/matching", requirePortal("opportunities:write"), async (req, res): Promise<void> => {
  const params = UpdatePortalOpportunityMatchingParams.safeParse(req.params);
  const body = UpdatePortalOpportunityMatchingBody.safeParse(req.body);
  if (!params.success || !body.success) { invalid(res, params.success ? body.error : params.error); return; }
  try {
    if (body.data.contentType !== "role") {
      res.status(400).json({ error: "Role matching contentType must be role" });
      return;
    }
    const result = await audience.putMatching("role", params.data.id, {
      ...body.data,
      contentType: body.data.contentType as "role",
    });
    if (!result) { res.status(404).json({ error: "Opportunity not found" }); return; }
    res.json(UpdatePortalOpportunityMatchingResponse.parse(matchingResult(result)));
  } catch (error) {
    if (["INVALID_CONTENT_TYPE", "INVALID_MATCHING_VALUE"].includes((error as Error).message)) {
      res.status(400).json({ error: "Invalid matching criteria" });
      return;
    }
    throw error;
  }
});
router.get("/portal/programmes/:id/matching", requirePortal("programmes:read"), async (req, res): Promise<void> => {
  const params = GetPortalProgrammeMatchingParams.safeParse(req.params);
  if (!params.success) { invalid(res, params.error); return; }
  const result = await audience.getMatching("programme", params.data.id);
  if (!result) { res.status(404).json({ error: "Programme not found" }); return; }
  res.json(GetPortalProgrammeMatchingResponse.parse(matchingResult(result)));
});
router.put("/portal/programmes/:id/matching", requirePortal("programmes:write"), async (req, res): Promise<void> => {
  const params = UpdatePortalProgrammeMatchingParams.safeParse(req.params);
  const body = UpdatePortalProgrammeMatchingBody.safeParse(req.body);
  if (!params.success || !body.success) { invalid(res, params.success ? body.error : params.error); return; }
  try {
    if (body.data.contentType !== "programme" && body.data.contentType !== "training") {
      res.status(400).json({ error: "Programme matching contentType must be programme or training" });
      return;
    }
    const result = await audience.putMatching("programme", params.data.id, {
      ...body.data,
      contentType: body.data.contentType as "programme" | "training",
    });
    if (!result) { res.status(404).json({ error: "Programme not found" }); return; }
    res.json(UpdatePortalProgrammeMatchingResponse.parse(matchingResult(result)));
  } catch (error) {
    if (["INVALID_CONTENT_TYPE", "INVALID_MATCHING_VALUE"].includes((error as Error).message)) {
      res.status(400).json({ error: "Invalid matching criteria" });
      return;
    }
    throw error;
  }
});

return router;
}

export default createAudienceCrmRouter();