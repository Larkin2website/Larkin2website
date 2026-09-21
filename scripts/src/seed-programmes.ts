import { db, pool, programmeSectionsTable, programmesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { OPPORTUNITIES } from "../../artifacts/larkin2-opportunities/src/data/opportunities";
import { programmeSections } from "./programme-seed-data";

async function seed(): Promise<void> {
  for (const programme of Object.values(OPPORTUNITIES)) {
    await db.transaction(async (tx) => {
      const [row] = await tx.insert(programmesTable).values({
        slug: programme.id, num: programme.num, cardTitle: programme.cardTitle, cardCopy: programme.cardCopy,
        cardCta: programme.cardCta, image: programme.image, title: programme.title, shortDescription: programme.shortDescription,
        status: programme.applicationStatus === "Closed" ? "closed" : "published",
        applicationStatus: programme.applicationStatus, applicationUrl: programme.applicationLink || null,
        location: programme.location, featured: false, displayOrder: Number(programme.num),
        createdBy: "seed", updatedBy: "seed", publishedAt: new Date(),
      }).onConflictDoUpdate({
        target: programmesTable.slug,
        set: {
          num: programme.num, cardTitle: programme.cardTitle, cardCopy: programme.cardCopy,
          cardCta: programme.cardCta, image: programme.image, title: programme.title,
          shortDescription: programme.shortDescription,
          status: programme.applicationStatus === "Closed" ? "closed" : "published",
          applicationStatus: programme.applicationStatus, applicationUrl: programme.applicationLink || null,
          location: programme.location, displayOrder: Number(programme.num),
          updatedBy: "seed", archivedAt: null,
        },
      }).returning();
      await tx.delete(programmeSectionsTable).where(eq(programmeSectionsTable.programmeId, row.id));
      const sections = programmeSections(programme).map((section) => ({ programmeId: row.id, ...section }));
      if (sections.length) {
        await tx.insert(programmeSectionsTable).values(sections);
      }
    });
  }
}
await seed();
await pool.end();