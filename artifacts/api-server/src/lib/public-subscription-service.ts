import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, publicSubscriptionsTable } from "@workspace/db";
import { reconcilePendingDeliveries } from "./audience-crm-service";

export type NewSubscriptionRecord = {
  email: string;
  managementTokenHash: string;
  consent: true;
  consentedAt: Date;
  name?: string | null;
  craft?: string | null;
  careerLevel?: string | null;
  location?: string | null;
  acquisitionSource?: string | null;
  acquisitionDetail?: string | null;
  acquisitionDetailDeclined?: boolean;
  interests?: string[];
  contentTypes?: string[];
  careerLevels?: string[];
  crafts?: string[];
  allOpportunities?: boolean;
};

export type SubscriptionPreferences = Omit<NewSubscriptionRecord, "email" | "managementTokenHash" | "consent" | "consentedAt">;
export interface PublicSubscriptionStore {
  create(record: NewSubscriptionRecord): Promise<boolean>;
  hasCapability(email: string, managementTokenHash: string): Promise<boolean>;
  deactivateByCapability(managementTokenHash: string, at: Date): Promise<void>;
  updatePreferencesByCapability?(managementTokenHash: string, preferences: SubscriptionPreferences, at: Date): Promise<void>;
  getPreferencesByCapability?(managementTokenHash: string): Promise<SubscriptionPreferences | undefined>;
}

export const drizzlePublicSubscriptionStore: PublicSubscriptionStore = {
  async create(record) {
    return db.transaction(async (tx) => {
      const [subscriber] = await tx
        .insert(publicSubscriptionsTable)
        .values(record)
        .onConflictDoNothing({ target: publicSubscriptionsTable.email })
        .returning();
      if (!subscriber) return false;
      await reconcilePendingDeliveries(tx, subscriber);
      return true;
    });
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
    await db.transaction(async (tx) => {
      const [subscriber] = await tx.update(publicSubscriptionsTable)
        .set({ active: false, unsubscribedAt: at, updatedAt: at })
        .where(and(
          eq(publicSubscriptionsTable.managementTokenHash, managementTokenHash),
          eq(publicSubscriptionsTable.active, true),
        )).returning();
      if (subscriber) await reconcilePendingDeliveries(tx, subscriber);
    });
  },

  async updatePreferencesByCapability(managementTokenHash, preferences, at) {
    await db.transaction(async (tx) => {
      const [subscriber] = await tx.update(publicSubscriptionsTable)
        .set({ ...preferences, updatedAt: at })
        .where(eq(publicSubscriptionsTable.managementTokenHash, managementTokenHash)).returning();
      if (subscriber) await reconcilePendingDeliveries(tx, subscriber);
    });
  },

  async getPreferencesByCapability(managementTokenHash) {
    const [row] = await db.select({
      name: publicSubscriptionsTable.name,
      craft: publicSubscriptionsTable.craft,
      careerLevel: publicSubscriptionsTable.careerLevel,
      location: publicSubscriptionsTable.location,
      acquisitionSource: publicSubscriptionsTable.acquisitionSource,
      acquisitionDetail: publicSubscriptionsTable.acquisitionDetail,
      acquisitionDetailDeclined: publicSubscriptionsTable.acquisitionDetailDeclined,
      interests: publicSubscriptionsTable.interests,
      contentTypes: publicSubscriptionsTable.contentTypes,
      careerLevels: publicSubscriptionsTable.careerLevels,
      crafts: publicSubscriptionsTable.crafts,
      allOpportunities: publicSubscriptionsTable.allOpportunities,
    }).from(publicSubscriptionsTable)
      .where(eq(publicSubscriptionsTable.managementTokenHash, managementTokenHash))
      .limit(1);
    return row;
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

const referralRoutes = new Set([
  "instagram", "linkedin", "whatsapp_group", "facebook_group",
  "industry_network", "recommendation", "other",
]);

export class InvalidReferralPreferencesError extends Error {}

export function normalizeReferralPreferences(
  input: SubscriptionPreferences,
  previous?: SubscriptionPreferences,
): Pick<SubscriptionPreferences, "acquisitionSource" | "acquisitionDetail" | "acquisitionDetailDeclined"> {
  if (!["acquisitionSource", "acquisitionDetail", "acquisitionDetailDeclined"]
    .some(key => Object.hasOwn(input, key))) return {};

  const source = input.acquisitionSource === undefined
    ? previous?.acquisitionSource ?? null
    : input.acquisitionSource?.trim() || null;
  const sourceChanged = input.acquisitionSource !== undefined && source !== (previous?.acquisitionSource ?? null);
  const detail = input.acquisitionDetail === undefined && !sourceChanged
    ? previous?.acquisitionDetail ?? null
    : input.acquisitionDetail?.trim() || null;
  const declined = input.acquisitionDetailDeclined === undefined && !sourceChanged
    ? previous?.acquisitionDetailDeclined ?? false
    : input.acquisitionDetailDeclined ?? false;

  if ((source && !referralRoutes.has(source) && source !== previous?.acquisitionSource)
    || (detail && (detail.length > 500 || /[\u0000-\u001f\u007f]/.test(detail)))
    || (!source && (detail || declined))
    || (declined && detail)) {
    throw new InvalidReferralPreferencesError("Invalid referral preferences");
  }
  return {
    acquisitionSource: source,
    acquisitionDetail: detail,
    acquisitionDetailDeclined: declined,
  };
}

export function preferencesFromInput(input: SubscriptionPreferences): SubscriptionPreferences {
  const result: SubscriptionPreferences = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if ((key === "craft" || key === "acquisitionSource" || key === "acquisitionDetail") && typeof value === "string") {
      (result as Record<string, unknown>)[key] = value.trim() || null;
    } else if ((key === "crafts" || key === "interests") && Array.isArray(value)) {
      const normalized = new Map<string, string>();
      for (const item of value) {
        if (typeof item !== "string" || !item.trim()) continue;
        const trimmed = item.trim();
        if (!normalized.has(trimmed.toLocaleLowerCase())) normalized.set(trimmed.toLocaleLowerCase(), trimmed);
      }
      (result as Record<string, unknown>)[key] = [...normalized.values()];
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
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
      name: string;
      existingManagementToken?: string;
      craft?: string;
      careerLevel?: string;
      location?: string;
      acquisitionSource?: string;
      acquisitionDetail?: string;
      acquisitionDetailDeclined?: boolean;
      interests?: string[];
      contentTypes?: string[];
      careerLevels?: string[];
      crafts?: string[];
      allOpportunities?: boolean;
    }): Promise<{ message: string }> {
      const email = normalizeSubscriptionEmail(input.email);
      const candidateToken = createToken();
      const {
        email: _email,
        consent: _consent,
        existingManagementToken: _existingToken,
        ...preferences
      } = input;
      await store.create({
        email,
        consent: true,
        consentedAt: now(),
        managementTokenHash: hashManagementToken(candidateToken),
        ...preferencesFromInput({
          ...preferences,
          ...normalizeReferralPreferences(preferences),
          name: input.name.trim(),
        }),
      });

      return { message: "Thanks for your interest. Your request has been processed. No email has been sent." };
    },

    async getPreferences(managementToken: string): Promise<SubscriptionPreferences | undefined> {
      return store.getPreferencesByCapability?.(hashManagementToken(managementToken));
    },

    async updatePreferences(managementToken: string, preferences: SubscriptionPreferences): Promise<SubscriptionPreferences | undefined> {
      const tokenHash = hashManagementToken(managementToken);
      if (!store.getPreferencesByCapability || !store.updatePreferencesByCapability) return undefined;
      const existing = await store.getPreferencesByCapability(tokenHash);
      if (!existing) return undefined;
      await store.updatePreferencesByCapability(tokenHash, preferencesFromInput({
        ...preferences,
        ...normalizeReferralPreferences(preferences, existing),
      }), now());
      return await store.getPreferencesByCapability(tokenHash);
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