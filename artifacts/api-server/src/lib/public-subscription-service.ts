import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, publicSubscriptionsTable } from "@workspace/db";

export type NewSubscriptionRecord = {
  email: string;
  managementTokenHash: string;
  consent: true;
  consentedAt: Date;
};

export interface PublicSubscriptionStore {
  create(record: NewSubscriptionRecord): Promise<boolean>;
  hasCapability(email: string, managementTokenHash: string): Promise<boolean>;
  deactivateByCapability(managementTokenHash: string, at: Date): Promise<void>;
}

export const drizzlePublicSubscriptionStore: PublicSubscriptionStore = {
  async create(record) {
    const rows = await db
      .insert(publicSubscriptionsTable)
      .values(record)
      .onConflictDoNothing({ target: publicSubscriptionsTable.email })
      .returning({ id: publicSubscriptionsTable.id });
    return rows.length === 1;
  },

  async hasCapability(email, managementTokenHash) {
    const rows = await db
      .select({ id: publicSubscriptionsTable.id })
      .from(publicSubscriptionsTable)
      .where(and(
        eq(publicSubscriptionsTable.email, email),
        eq(publicSubscriptionsTable.managementTokenHash, managementTokenHash),
      ))
      .limit(1);
    return rows.length === 1;
  },

  async deactivateByCapability(managementTokenHash, at) {
    await db
      .update(publicSubscriptionsTable)
      .set({ active: false, unsubscribedAt: at, updatedAt: at })
      .where(and(
        eq(publicSubscriptionsTable.managementTokenHash, managementTokenHash),
        eq(publicSubscriptionsTable.active, true),
      ));
  },
};

export function generateManagementToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashManagementToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function normalizeSubscriptionEmail(email: string): string {
  return email.trim().toLowerCase();
}

type PublicSubscriptionServiceOptions = {
  generateToken?: () => string;
  now?: () => Date;
};

export function createPublicSubscriptionService(
  store: PublicSubscriptionStore,
  options: PublicSubscriptionServiceOptions = {},
) {
  const createToken = options.generateToken ?? generateManagementToken;
  const now = options.now ?? (() => new Date());

  return {
    async subscribe(input: {
      email: string;
      consent: true;
      existingManagementToken?: string;
    }): Promise<{ managementToken: string }> {
      const email = normalizeSubscriptionEmail(input.email);
      const candidateToken = createToken();
      const existingCapability = await store.hasCapability(
        email,
        hashManagementToken(input.existingManagementToken ?? candidateToken),
      );
      const created = await store.create({
        email,
        consent: true,
        consentedAt: now(),
        managementTokenHash: hashManagementToken(candidateToken),
      });

      if (created) {
        return { managementToken: candidateToken };
      }

      if (
        input.existingManagementToken
        && existingCapability
      ) {
        return { managementToken: input.existingManagementToken };
      }

      return { managementToken: createToken() };
    },

    async unsubscribe(managementToken: string): Promise<{ message: string }> {
      await store.deactivateByCapability(hashManagementToken(managementToken), now());
      return { message: "If this link was active, updates have been stopped." };
    },
  };
}

export const publicSubscriptionService = createPublicSubscriptionService(
  drizzlePublicSubscriptionStore,
);

export type PublicSubscriptionService = typeof publicSubscriptionService;