import type { PublicOpportunity } from "@workspace/api-client-react";
import type { Role } from "./roles";

export function publicOpportunityToRole(opportunity: PublicOpportunity): Role {
  return {
    id: opportunity.slug,
    title: opportunity.title,
    deadlineExtended: opportunity.deadlineExtended,
    featured: opportunity.featured,
    urgent: opportunity.urgent,
    status: opportunity.status,
    date: opportunity.publicationLabel,
    department: opportunity.department,
    roleType: opportunity.roleType,
    summary: opportunity.summary,
    responsibilities: opportunity.responsibilities,
    essential: opportunity.essential,
    desired: opportunity.desired,
    details: opportunity.details.map(({ label, value }) => ({ label, value })),
    applicationDeadline: opportunity.applicationDeadline,
    responseDate: opportunity.responseDate ?? undefined,
    applicationUrl: opportunity.applicationUrl,
  };
}