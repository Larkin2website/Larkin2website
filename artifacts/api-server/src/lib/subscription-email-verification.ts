import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { emailAddress, sendResendEmail, type ResendTransport } from "./resend-transport";
import { db, publicSubscriptionsTable, subscriptionChallengesTable, subscriptionSessionsTable } from "@workspace/db";
import { reconcilePendingDeliveries } from "./audience-crm-service";
import { normalizeReferralPreferences, normalizeSubscriptionEmail, normalizeWebsitePurposes, preferencesFromInput, type SubscriptionPreferences } from "./public-subscription-service";
import { logger } from "./logger";

const CODE_LIFETIME = 10 * 60_000;
const ACCESS_LIFETIME = 30 * 60_000;
const neutralMessage = "If that address has an active subscription and delivery is available, a verification code should arrive shortly.";
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export interface SubscriptionVerificationStore {
  subscriberId(email: string): Promise<string | undefined>;
  reserve(email: string, hash: string, at: Date): Promise<boolean>;
  discard(email: string, hash: string): Promise<void>;
  consumeAndCreate(email: string, codeHash: string, tokenHash: string, at: Date, expiresAt: Date): Promise<boolean>;
  resolveSession(hash: string, at: Date): Promise<string | undefined>;
  getPreferences(id: string): Promise<SubscriptionPreferences | undefined>;
  updatePreferences(id: string, preferences: SubscriptionPreferences, at: Date): Promise<SubscriptionPreferences | undefined>;
  unsubscribe(id: string, at: Date): Promise<void>;
}

export const drizzleVerificationStore: SubscriptionVerificationStore = {
  async subscriberId(email) {
    const [row] = await db.select({ id: publicSubscriptionsTable.id }).from(publicSubscriptionsTable)
      .where(and(eq(publicSubscriptionsTable.email, email), eq(publicSubscriptionsTable.active, true))).limit(1);
    return row?.id;
  },
  async reserve(email, hash, at) {
    const rows = await db.insert(subscriptionChallengesTable).values({
      email, codeHash: hash, attempts: 0, requestCount: 1,
      windowStartedAt: at, nextRequestAt: new Date(at.getTime() + 60_000),
      expiresAt: new Date(at.getTime() + CODE_LIFETIME),
    }).onConflictDoUpdate({
      target: subscriptionChallengesTable.email,
      set: {
        codeHash: hash, attempts: 0,
        requestCount: sql`case when ${subscriptionChallengesTable.windowStartedAt} < ${new Date(at.getTime() - 3_600_000)} then 1 else ${subscriptionChallengesTable.requestCount} + 1 end`,
        windowStartedAt: sql`case when ${subscriptionChallengesTable.windowStartedAt} < ${new Date(at.getTime() - 3_600_000)} then ${at} else ${subscriptionChallengesTable.windowStartedAt} end`,
        nextRequestAt: new Date(at.getTime() + 60_000),
        expiresAt: new Date(at.getTime() + CODE_LIFETIME),
      },
      setWhere: and(
        sql`${subscriptionChallengesTable.nextRequestAt} <= ${at}`,
        sql`(${subscriptionChallengesTable.windowStartedAt} < ${new Date(at.getTime() - 3_600_000)} or ${subscriptionChallengesTable.requestCount} < 5)`,
      ),
    }).returning({ email: subscriptionChallengesTable.email });
    return rows.length === 1;
  },
  async discard(email, hash) {
    await db.delete(subscriptionChallengesTable).where(and(eq(subscriptionChallengesTable.email, email), eq(subscriptionChallengesTable.codeHash, hash)));
  },
  async consumeAndCreate(email, hash, tokenHash, at, expiresAt) {
    return db.transaction(async tx => {
      const [row] = await tx.select().from(subscriptionChallengesTable)
        .where(eq(subscriptionChallengesTable.email, email)).for("update").limit(1);
      if (!row || row.attempts >= 5 || row.expiresAt <= at) return false;
      if (!timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(hash))) {
        await tx.update(subscriptionChallengesTable).set({ attempts: row.attempts + 1 })
          .where(eq(subscriptionChallengesTable.email, email));
        return false;
      }
      const [subscriber] = await tx.select({ id: publicSubscriptionsTable.id }).from(publicSubscriptionsTable)
        .where(and(eq(publicSubscriptionsTable.email, email), eq(publicSubscriptionsTable.active, true))).limit(1);
      if (!subscriber) return false;
      await tx.insert(subscriptionSessionsTable).values({ subscriberId: subscriber.id, tokenHash, expiresAt });
      await tx.delete(subscriptionChallengesTable).where(eq(subscriptionChallengesTable.email, email));
      return true;
    });
  },
  async resolveSession(hash, at) {
    const [row] = await db.select({ id: publicSubscriptionsTable.id }).from(subscriptionSessionsTable)
      .innerJoin(publicSubscriptionsTable, eq(subscriptionSessionsTable.subscriberId, publicSubscriptionsTable.id))
      .where(and(eq(subscriptionSessionsTable.tokenHash, hash), gt(subscriptionSessionsTable.expiresAt, at),
        eq(publicSubscriptionsTable.active, true))).limit(1);
    return row?.id;
  },
  async getPreferences(id) {
    const [row] = await db.select({
      name: publicSubscriptionsTable.name, craft: publicSubscriptionsTable.craft,
      careerLevel: publicSubscriptionsTable.careerLevel, location: publicSubscriptionsTable.location,
      acquisitionSource: publicSubscriptionsTable.acquisitionSource, acquisitionDetail: publicSubscriptionsTable.acquisitionDetail,
      acquisitionDetailDeclined: publicSubscriptionsTable.acquisitionDetailDeclined,
      websitePurposes: publicSubscriptionsTable.websitePurposes,
      websitePurposeOther: publicSubscriptionsTable.websitePurposeOther,
      interests: publicSubscriptionsTable.interests, contentTypes: publicSubscriptionsTable.contentTypes,
      careerLevels: publicSubscriptionsTable.careerLevels, crafts: publicSubscriptionsTable.crafts,
      allOpportunities: publicSubscriptionsTable.allOpportunities,
    }).from(publicSubscriptionsTable).where(and(eq(publicSubscriptionsTable.id, id), eq(publicSubscriptionsTable.active, true))).limit(1);
    return row;
  },
  async updatePreferences(id, preferences, at) {
    await db.transaction(async tx => {
      const [row] = await tx.update(publicSubscriptionsTable).set({ ...preferencesFromInput(preferences), updatedAt: at })
        .where(and(eq(publicSubscriptionsTable.id, id), eq(publicSubscriptionsTable.active, true))).returning();
      if (row) await reconcilePendingDeliveries(tx, row);
    });
    return this.getPreferences(id);
  },
  async unsubscribe(id, at) {
    await db.transaction(async tx => {
      const [row] = await tx.update(publicSubscriptionsTable).set({ active: false, unsubscribedAt: at, updatedAt: at })
        .where(and(eq(publicSubscriptionsTable.id, id), eq(publicSubscriptionsTable.active, true))).returning();
      await tx.delete(subscriptionSessionsTable).where(eq(subscriptionSessionsTable.subscriberId, id));
      if (row) await reconcilePendingDeliveries(tx, row);
    });
  },
};

export async function sendSubscriptionCode(email: string, code: string, options: {
  env?: NodeJS.ProcessEnv; transport?: ResendTransport;
} = {}): Promise<void> {
  await sendResendEmail({
      from: emailAddress((options.env ?? process.env).SUBSCRIPTION_VERIFICATION_FROM, "SUBSCRIPTION_VERIFICATION_FROM", true),
      to: [email], subject: "Your HETV subscription verification code",
      text: `Your HETV Opportunities Hub verification code is ${code}. It expires in 10 minutes. Use it only to manage your preferences or unsubscribe. If you did not request it, ignore this email. We are not sending opportunity alerts.`,
  }, undefined, options.transport);
}

export function createSubscriptionVerificationService(
  store: SubscriptionVerificationStore,
  send: (email: string, code: string) => Promise<void>,
  options: { now?: () => Date; secret?: string; makeCode?: () => string; makeToken?: () => string; requestDelayMs?: number } = {},
) {
  const now = options.now ?? (() => new Date());
  const secret = options.secret ?? process.env["SESSION_SECRET"];
  const codeHash = (email: string, code: string) => {
    if (!secret) throw new Error("SESSION_SECRET is required for subscription verification");
    return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
  };
  return {
    async request(emailInput: string): Promise<{ message: string }> {
      const email = normalizeSubscriptionEmail(emailInput);
      // Process delivery independently of the HTTP response. A provider request (or
      // a storage/secret failure) must not reveal whether this address is active.
      void (async () => {
        if (!await store.subscriberId(email)) return;
        const code = options.makeCode?.() ?? randomInt(0, 1_000_000).toString().padStart(6, "0");
        const hash = codeHash(email, code);
        if (!await store.reserve(email, hash, now())) return;
        try {
          await send(email, code);
        } catch {
          await store.discard(email, hash);
          logger.warn("Subscription verification delivery unavailable");
        }
      })().catch(() => logger.warn("Subscription verification request unavailable"));
      await new Promise(resolve => setTimeout(resolve, options.requestDelayMs ?? 350));
      return { message: neutralMessage };
    },
    async verify(emailInput: string, code: string): Promise<{ accessToken: string; expiresAt: string } | undefined> {
      const email = normalizeSubscriptionEmail(emailInput);
      const token = options.makeToken?.() ?? randomBytes(32).toString("base64url");
      const expiresAt = new Date(now().getTime() + ACCESS_LIFETIME);
      if (!await store.consumeAndCreate(email, codeHash(email, code), hashToken(token), now(), expiresAt)) return undefined;
      return { accessToken: token, expiresAt: expiresAt.toISOString() };
    },
    async getPreferences(token: string) {
      const id = await store.resolveSession(hashToken(token), now());
      return id ? store.getPreferences(id) : undefined;
    },
    async updatePreferences(token: string, preferences: SubscriptionPreferences) {
      const id = await store.resolveSession(hashToken(token), now());
      if (!id) return undefined;
      const existing = await store.getPreferences(id);
      if (!existing) return undefined;
      return store.updatePreferences(id, {
        ...preferences,
        ...normalizeReferralPreferences(preferences, existing),
        ...normalizeWebsitePurposes(preferences, existing),
      }, now());
    },
    async unsubscribe(token: string) {
      const id = await store.resolveSession(hashToken(token), now());
      if (!id) return false;
      await store.unsubscribe(id, now());
      return true;
    },
  };
}

export const subscriptionVerificationService = createSubscriptionVerificationService(drizzleVerificationStore, sendSubscriptionCode);
export type SubscriptionVerificationService = typeof subscriptionVerificationService;