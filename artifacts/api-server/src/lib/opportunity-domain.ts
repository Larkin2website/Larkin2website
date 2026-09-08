export type OpportunityStatus =
  | "draft"
  | "published"
  | "closed"
  | "filled"
  | "archived";

export type PublicOpportunityStatus = "Open" | "Closed" | "Filled";

const transitions: Record<OpportunityStatus, OpportunityStatus[]> = {
  draft: ["published", "archived"],
  published: ["draft", "closed", "filled", "archived"],
  closed: ["published", "filled", "archived"],
  filled: ["archived"],
  archived: ["draft"],
};

export function canTransitionStatus(
  current: OpportunityStatus,
  next: OpportunityStatus,
): boolean {
  return transitions[current].includes(next);
}

export function isPublicStatus(
  status: OpportunityStatus,
): status is "published" | "closed" | "filled" {
  return status === "published" || status === "closed" || status === "filled";
}

export function toPublicStatus(
  status: "published" | "closed" | "filled",
): PublicOpportunityStatus {
  if (status === "published") return "Open";
  if (status === "closed") return "Closed";
  return "Filled";
}