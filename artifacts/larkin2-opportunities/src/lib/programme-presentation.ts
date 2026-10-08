/** Existing editorial pathways; the current programme API has no category field. */
export const DEVELOPMENT_SLUGS = ["director-pathway", "producer-pathway"];

/** Target only the approved development-detail notes, not the general FAQ or stored records. */
export function developmentDetailContent(slug: string, content: string): string {
  if (!DEVELOPMENT_SLUGS.includes(slug)) return content;
  return content
    .replace(/(?:Note:\s*)?As a reminder, due to the anticipated volume of applications, we[’']re unfortunately unable to provide individual feedback to unsuccessful applicants\.\s*/gi, "")
    .replace(/No individual feedback available for unsuccessful applicants\.?\s*/gi, "")
    .replace(/Due to high volume, individual feedback is not provided\.\s*/gi, "")
    .replace(/(?:We[’']re|We are|We will be|We are unfortunately|We[’']re unfortunately)\s+(?:unable to|not able to)\s+provide individual feedback(?: to unsuccessful applicants)?\.\s*/gi, "")
    .trim();
}

export function splitPublicProgrammes<T extends { status: string }>(programmes: T[]) {
  return {
    current: programmes.filter((programme) => programme.status === "published"),
    previous: programmes.filter((programme) => programme.status === "closed"),
  };
}
