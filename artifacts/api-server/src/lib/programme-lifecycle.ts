export type ProgrammeStatus = "draft" | "published" | "closed" | "archived";

const allowedTransitions: Record<ProgrammeStatus, ProgrammeStatus[]> = {
  draft: ["published", "archived"],
  published: ["closed", "archived"],
  closed: ["published", "archived"],
  archived: ["draft"],
};

export function canProgrammeTransition(from: ProgrammeStatus, to: ProgrammeStatus): boolean {
  return allowedTransitions[from].includes(to);
}