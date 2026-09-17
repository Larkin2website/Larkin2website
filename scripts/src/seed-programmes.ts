import { db, pool, programmeSectionsTable, programmesTable } from "@workspace/db";
import { OPPORTUNITIES } from "../../artifacts/larkin2-opportunities/src/data/opportunities";

const sectionNames = ["about", "placement", "training", "eligibility", "timeline", "applicationGuidance"] as const;
const dbSection = (name: typeof sectionNames[number]) => name === "applicationGuidance" ? "application_guidance" as const : name;

async function seed(): Promise<void> {
  for (const programme of Object.values(OPPORTUNITIES)) {
    await db.transaction(async (tx) => {
      const [row] = await tx.insert(programmesTable).values({
        slug: programme.id, num: programme.num, cardTitle: programme.cardTitle, cardCopy: programme.cardCopy,
        cardCta: programme.cardCta, image: programme.image, title: programme.title, shortDescription: programme.shortDescription,
        status: programme.applicationStatus === "Closed" ? "closed" : "published",
        applicationStatus: programme.applicationStatus, location: programme.location, featured: false, displayOrder: Number(programme.num),
        createdBy: "seed", updatedBy: "seed", publishedAt: new Date(),
      }).onConflictDoNothing({ target: programmesTable.slug }).returning();
      if (!row) return;
      const sections = sectionNames.flatMap((name) =>
        programme[name].map((content, position) => ({ programmeId: row.id, section: dbSection(name), position, content })));
      if (sections.length) {
        await tx.insert(programmeSectionsTable).values(sections);
      }
    });
  }
}
await seed();
await pool.end();