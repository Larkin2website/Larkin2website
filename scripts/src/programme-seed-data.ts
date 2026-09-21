import type {
  Opportunity,
  OpportunityBlock,
  OpportunitySection,
} from "../../artifacts/larkin2-opportunities/src/data/opportunities";

export const programmeSectionNames = [
  "about",
  "placement",
  "training",
  "eligibility",
  "timeline",
  "application_guidance",
] as const;

export type ProgrammeSectionName = typeof programmeSectionNames[number];

const canonicalHeadings: Record<ProgrammeSectionName, string> = {
  about: "About the Programme",
  placement: "Work Experience Placement",
  training: "Training & Development",
  eligibility: "Who Can Apply?",
  timeline: "Programme Timeline & Structure",
  application_guidance: "How to Apply",
};

export function programmeSectionName(heading: string): ProgrammeSectionName {
  const normalized = heading.toLowerCase();
  if (normalized.includes("who can apply") || normalized.includes("eligib")) return "eligibility";
  if (normalized.includes("training")) return "training";
  if (normalized.includes("placement")) return "placement";
  if (normalized.includes("timeline")) return "timeline";
  if (normalized.includes("how to apply") || normalized.includes("application")) return "application_guidance";
  return "about";
}

function blockText(block: OpportunityBlock): string {
  if (block.type === "paragraph") return block.text;
  if (block.type === "list") return block.items.map((item) => `• ${item}`).join("\n");
  return block.items.map((item) => `${item.label}: ${item.href}`).join("\n");
}

export function programmeSections(programme: Opportunity) {
  const positions = new Map<ProgrammeSectionName, number>();

  return programme.sections.flatMap((section: OpportunitySection) => {
    const name = programmeSectionName(section.heading);
    return section.blocks.map((block, blockIndex) => {
      const position = positions.get(name) ?? 0;
      positions.set(name, position + 1);
      const body = blockText(block);
      const content = blockIndex === 0 && section.heading !== canonicalHeadings[name]
        ? `${section.heading}\n\n${body}`
        : body;
      return { section: name, position, content };
    });
  });
}
