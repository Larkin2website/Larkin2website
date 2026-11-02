import { and, eq, gte, inArray, or } from "drizzle-orm";
import { db, emailQuotaAccountsTable, emailReservationsTable } from "@workspace/db";
import type { EmailReservation, QuotaState, QuotaStore } from "./email-quota-core";

export const drizzleQuotaStore: QuotaStore = {
  async lock(account, key, run) {
    return db.transaction(async tx => {
      await tx.insert(emailQuotaAccountsTable).values({ id: account }).onConflictDoNothing();
      const [accountRow] = await tx.select().from(emailQuotaAccountsTable)
        .where(eq(emailQuotaAccountsTable.id, account)).for("update");
      if (!accountRow) throw new Error("Email quota state unavailable");
      // Keep deduplication records indefinitely, but only scan current/recent quota windows.
      const rows = await tx.select().from(emailReservationsTable).where(and(
        eq(emailReservationsTable.account, account),
        or(gte(emailReservationsTable.createdAt, new Date(Date.now() - 62 * 86_400_000)),
          inArray(emailReservationsTable.status, ["pending", "ambiguous"]),
          key ? eq(emailReservationsTable.id, key) : undefined),
      ));
      const context = {
        state: accountRow.state as QuotaState,
        reservations: rows as EmailReservation[],
        async get(id: string) { return context.reservations.find(row => row.id === id); },
        async put(row: EmailReservation) {
          await tx.insert(emailReservationsTable).values({ account, ...row })
            .onConflictDoUpdate({
              target: [emailReservationsTable.account, emailReservationsTable.id], set: row,
            });
          const index = context.reservations.findIndex(item => item.id === row.id);
          if (index >= 0) context.reservations[index] = row;
          else context.reservations.push(row);
        },
      };
      const result = await run(context);
      await tx.update(emailQuotaAccountsTable).set({ state: context.state as Record<string, unknown> })
        .where(eq(emailQuotaAccountsTable.id, account));
      return result;
    });
  },
};
