import assert from "node:assert/strict";
import test from "node:test";
import express, { type RequestHandler } from "express";
import type { AddressInfo } from "node:net";
import {
  createPublicSubscriptionService,
  hashManagementToken,
  type NewSubscriptionRecord,
  type PublicSubscriptionStore,
} from "../lib/public-subscription-service";
import { createFixedWindowRateLimit } from "../middlewares/fixed-window-rate-limit";
import { createPublicSubscriptionsRouter } from "./public-subscriptions";

type StoredSubscription = NewSubscriptionRecord & {
  active: boolean;
  unsubscribedAt: Date | null;
};

class MemorySubscriptionStore implements PublicSubscriptionStore {
  readonly records = new Map<string, StoredSubscription>();

  async create(record: NewSubscriptionRecord): Promise<boolean> {
    if (this.records.has(record.email)) return false;
    this.records.set(record.email, {
      ...record,
      active: true,
      unsubscribedAt: null,
    });
    return true;
  }

  async hasCapability(email: string, managementTokenHash: string): Promise<boolean> {
    const record = this.records.get(email);
    return record?.managementTokenHash === managementTokenHash;
  }

  async deactivateByCapability(managementTokenHash: string, at: Date): Promise<void> {
    for (const record of this.records.values()) {
      if (record.managementTokenHash === managementTokenHash && record.active) {
        record.active = false;
        record.unsubscribedAt = at;
      }
    }
  }

  async updatePreferencesByCapability(managementTokenHash: string, preferences: any): Promise<void> {
    for (const record of this.records.values()) {
      if (record.managementTokenHash === managementTokenHash) Object.assign(record, preferences);
    }
  }

  async getPreferencesByCapability(managementTokenHash: string) {
    const record = [...this.records.values()].find((item) => item.managementTokenHash === managementTokenHash);
    if (!record) return undefined;
    return {
      name: record.name ?? null,
      craft: record.craft ?? null,
      careerLevel: record.careerLevel ?? null,
      location: record.location ?? null,
      acquisitionSource: record.acquisitionSource ?? null,
      acquisitionDetail: record.acquisitionDetail ?? null,
      acquisitionDetailDeclined: record.acquisitionDetailDeclined ?? false,
      websitePurposes: record.websitePurposes ?? [],
      websitePurposeOther: record.websitePurposeOther ?? null,
      interests: record.interests ?? [],
      contentTypes: record.contentTypes ?? [],
      careerLevels: record.careerLevels ?? [],
      crafts: record.crafts ?? [],
      allOpportunities: record.allOpportunities ?? false,
    };
  }
}

const noRateLimit: RequestHandler = (_req, _res, next) => next();

async function withServer(
  store: MemorySubscriptionStore,
  run: (base: string) => Promise<void>,
  rateLimits: {
    signupRateLimit?: RequestHandler;
    unsubscribeRateLimit?: RequestHandler;
  } = {},
) {
  let tokenNumber = 0;
  const tokens: string[] = [];
  const service = createPublicSubscriptionService(store, {
    generateToken: () => {
      tokenNumber += 1;
      const token = tokenNumber.toString(36).padStart(43, "a");
      tokens.push(token);
      return token;
    },
    now: () => new Date("2026-01-02T03:04:05.000Z"),
  });
  const app = express();
  app.use(express.json());
  app.use(createPublicSubscriptionsRouter({
    service,
    signupRateLimit: rateLimits.signupRateLimit ?? noRateLimit,
    unsubscribeRateLimit: rateLimits.unsubscribeRateLimit ?? noRateLimit,
  }));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  return tokens;
}

function post(base: string, path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const genericSignupResponse = {
  message: "Thanks for your interest. Your request has been processed. No email has been sent.",
};

async function createLegacyRecord(
  store: MemorySubscriptionStore,
  email: string,
  token: string,
  overrides: Partial<NewSubscriptionRecord> = {},
) {
  await store.create({
    email,
    managementTokenHash: hashManagementToken(token),
    consent: true,
    consentedAt: new Date("2025-12-01T00:00:00.000Z"),
    name: "Legacy subscriber",
    interests: ["camera"],
    contentTypes: ["role"],
    ...overrides,
  });
}

test("signup atomically persists name and optional preferences with a generic response", async () => {
  const store = new MemorySubscriptionStore();
  await withServer(store, async (base) => {
    const first = await post(base, "/public/subscriptions", {
      email: " Person@Example.COM ",
      consent: true,
      name: "  Alex Example  ",
      interests: ["camera"],
      contentTypes: ["role"],
      allOpportunities: true,
    });
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), genericSignupResponse);
    assert.equal(first.headers.get("cache-control"), "no-store");

    const original = store.records.get("person@example.com");
    assert.ok(original);
    assert.equal(original.consent, true);
    assert.equal(original.active, true);
    assert.equal(original.managementTokenHash.length, 64);
    assert.equal(original.name, "Alex Example");
    assert.deepEqual(original.interests, ["camera"]);
    assert.deepEqual(original.contentTypes, ["role"]);
    assert.equal(original.allOpportunities, true);

    const defaults = await post(base, "/public/subscriptions", {
      email: "defaults@example.com",
      consent: true,
      name: "Defaults",
    });
    assert.equal(defaults.status, 200);
    assert.deepEqual(await defaults.json(), genericSignupResponse);
    const defaultRecord = store.records.get("defaults@example.com");
    assert.ok(defaultRecord);
    assert.equal(defaultRecord.name, "Defaults");
    assert.deepEqual(defaultRecord.interests ?? [], []);
    assert.deepEqual(defaultRecord.contentTypes ?? [], []);
    assert.deepEqual(defaultRecord.careerLevels ?? [], []);
    assert.deepEqual(defaultRecord.crafts ?? [], []);
    assert.equal(defaultRecord.allOpportunities ?? false, false);

    const duplicate = await post(base, "/public/subscriptions", {
      email: "person@example.com",
      consent: true,
      name: "Duplicate",
    });
    assert.equal(duplicate.status, 200);
    assert.deepEqual(await duplicate.json(), genericSignupResponse);
    assert.equal(store.records.get("person@example.com"), original);
    assert.equal(original.name, "Alex Example");
    assert.deepEqual(original.contentTypes, ["role"]);
    assert.equal(original.active, true);
  });

  assert.equal(store.records.size, 2);
});

test("signup stores canonical referral details or an explicit decline without changing duplicates", async () => {
  const store = new MemorySubscriptionStore();
  await withServer(store, async base => {
    const routes = ["instagram", "linkedin", "whatsapp_group", "facebook_group", "industry_network", "recommendation", "other"];
    for (const [index, route] of routes.entries()) {
      const response = await post(base, "/public/subscriptions", {
        email: `source${index}@example.com`, consent: true, name: "Tester",
        acquisitionSource: route, acquisitionDetail: "  Specific source  ",
      });
      assert.equal(response.status, 200, route);
      assert.equal(store.records.get(`source${index}@example.com`)?.acquisitionDetail, "Specific source");
    }
    const declined = await post(base, "/public/subscriptions", {
      email: "declined@example.com", consent: true, name: "Tester",
      acquisitionSource: "instagram", acquisitionDetailDeclined: true,
    });
    assert.equal(declined.status, 200);
    const original = structuredClone(store.records.get("declined@example.com"));
    assert.equal(original?.acquisitionDetailDeclined, true);
    assert.equal(original?.acquisitionDetail, null);
    const duplicate = await post(base, "/public/subscriptions", {
      email: "declined@example.com", consent: true, name: "Changed",
      acquisitionSource: "other", acquisitionDetail: "Different",
    });
    assert.equal(duplicate.status, 200);
    assert.deepEqual(store.records.get("declined@example.com"), original);
  });
});

test("signup records optional website purposes and keeps duplicates unchanged", async () => {
  const store = new MemorySubscriptionStore();
  await withServer(store, async base => {
    assert.equal((await post(base, "/public/subscriptions", {
      email: "visitor@example.com", consent: true, name: "Visitor",
      websitePurposes: ["roles_self", "share_network", "other"],
      websitePurposeOther: "  Something else  ",
    })).status, 200);
    const original = structuredClone(store.records.get("visitor@example.com"));
    assert.deepEqual(original?.websitePurposes, ["roles_self", "share_network", "other"]);
    assert.equal(original?.websitePurposeOther, "Something else");
    assert.equal((await post(base, "/public/subscriptions", {
      email: "visitor@example.com", consent: true, name: "Different",
      websitePurposes: ["training_self"],
    })).status, 200);
    assert.deepEqual(store.records.get("visitor@example.com"), original);
    assert.equal((await post(base, "/public/subscriptions", {
      email: "skipped@example.com", consent: true, name: "Skipped",
    })).status, 200);
    assert.equal(store.records.get("skipped@example.com")?.websitePurposes, undefined);
  });
});

test("website purpose validation rejects unknown, duplicate, unsafe and orphan answers", async () => {
  const store = new MemorySubscriptionStore();
  await withServer(store, async base => {
    const invalid = [
      { websitePurposes: ["invented"] },
      { websitePurposes: ["roles_self", "roles_self"] },
      { websitePurposes: ["industry_interest"], websitePurposeOther: "Orphan" },
      { websitePurposeOther: "Orphan" },
      { websitePurposes: ["other"], websitePurposeOther: "Unsafe\nvalue" },
      { websitePurposes: ["other"], websitePurposeOther: "x".repeat(161) },
    ];
    for (const fields of invalid) {
      assert.equal((await post(base, "/public/subscriptions", {
        email: "invalid-purpose@example.com", consent: true, name: "Visitor", ...fields,
      })).status, 400, JSON.stringify(fields).slice(0, 100));
    }
    assert.equal(store.records.size, 0);
  });
});

test("legacy-link preferences allow purpose edits and clear Other when deselected", async () => {
  const store = new MemorySubscriptionStore();
  const token = "p".repeat(43);
  await createLegacyRecord(store, "purpose@example.com", token);
  await withServer(store, async base => {
    const put = (fields: object) => fetch(`${base}/public/subscriptions/preferences`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ managementToken: token, ...fields }),
    });
    const loaded = await post(base, "/public/subscriptions/preferences", { managementToken: token });
    assert.deepEqual((await loaded.json() as { websitePurposes: string[] }).websitePurposes, []);
    assert.equal((await put({ websitePurposes: ["other", "on_behalf"], websitePurposeOther: "Support" })).status, 200);
    assert.equal((await put({ websitePurposeOther: "Changed" })).status, 200);
    assert.equal((await put({ websitePurposes: ["on_behalf"] })).status, 200);
    assert.equal(store.records.get("purpose@example.com")?.websitePurposeOther, null);
    assert.equal((await put({ websitePurposeOther: "Orphan" })).status, 400);
  });
});

test("signup rejects unknown routes and contradictory or unsafe referral details", async () => {
  const store = new MemorySubscriptionStore();
  await withServer(store, async base => {
    const cases = [
      { acquisitionSource: "unapproved" },
      { acquisitionDetail: "Orphan detail" },
      { acquisitionDetailDeclined: true },
      { acquisitionSource: "linkedin", acquisitionDetail: "Name", acquisitionDetailDeclined: true },
      { acquisitionSource: "linkedin", acquisitionDetail: "Unsafe\nname" },
      { acquisitionSource: "linkedin", acquisitionDetail: "x".repeat(501) },
    ];
    for (const fields of cases) {
      const response = await post(base, "/public/subscriptions", {
        email: "invalid@example.com", consent: true, name: "Tester", ...fields,
      });
      assert.equal(response.status, 400, JSON.stringify(fields).slice(0, 100));
    }
    assert.equal(store.records.size, 0);
  });
});

test("legacy-token preference updates preserve old free text and clear stale detail on a route change", async () => {
  const store = new MemorySubscriptionStore();
  const token = "m".repeat(43);
  await createLegacyRecord(store, "legacy-referral@example.com", token, {
    acquisitionSource: "At a screening", acquisitionDetail: "An old free-text answer",
  });
  await withServer(store, async base => {
    const put = (body: unknown) => fetch(`${base}/public/subscriptions/preferences`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ managementToken: token, ...body as object }),
    });
    const loaded = await post(base, "/public/subscriptions/preferences", { managementToken: token });
    assert.equal((await loaded.json() as { acquisitionSource: string }).acquisitionSource, "At a screening");
    assert.equal((await put({ interests: ["lighting"] })).status, 200);
    assert.equal(store.records.get("legacy-referral@example.com")?.acquisitionSource, "At a screening");
    assert.equal((await put({ acquisitionSource: "At a screening" })).status, 200);
    assert.equal((await put({ acquisitionSource: "New unapproved source" })).status, 400);
    assert.equal((await put({ acquisitionSource: "instagram" })).status, 200);
    assert.equal(store.records.get("legacy-referral@example.com")?.acquisitionDetail, null);
    assert.equal((await put({ acquisitionDetail: "A person", acquisitionDetailDeclined: true })).status, 400);
    assert.equal((await put({ acquisitionDetailDeclined: true })).status, 200);
    assert.equal(store.records.get("legacy-referral@example.com")?.acquisitionDetailDeclined, true);
    assert.equal((await put({ acquisitionSource: "linkedin" })).status, 200);
    assert.equal(store.records.get("legacy-referral@example.com")?.acquisitionDetailDeclined, false);
    assert.equal((await put({ acquisitionSource: null })).status, 200);
    assert.equal(store.records.get("legacy-referral@example.com")?.acquisitionSource, null);
  });
});

test("duplicates with a legacy token get the same response and never change active state or preferences", async () => {
  const store = new MemorySubscriptionStore();
  const activeToken = "a".repeat(43);
  const inactiveToken = "b".repeat(43);
  await createLegacyRecord(store, "active@example.com", activeToken);
  await createLegacyRecord(store, "inactive@example.com", inactiveToken);
  await store.deactivateByCapability(hashManagementToken(inactiveToken), new Date("2026-01-01T00:00:00Z"));

  await withServer(store, async (base) => {
    const newSignup = await post(base, "/public/subscriptions", {
      email: "new@example.com",
      consent: true,
      name: "New subscriber",
    });
    assert.deepEqual(await newSignup.json(), genericSignupResponse);
    const snapshot = structuredClone(store.records.get("active@example.com"));
    const duplicate = await post(base, "/public/subscriptions", {
      email: "active@example.com",
      consent: true,
      name: "Attempted overwrite",
      existingManagementToken: activeToken,
      interests: ["changed"],
      contentTypes: ["training"],
    });
    assert.equal(duplicate.status, 200);
    assert.deepEqual(await duplicate.json(), genericSignupResponse);
    assert.deepEqual(store.records.get("active@example.com"), snapshot);
    assert.equal(store.records.get("active@example.com")?.active, true);

    const inactiveSnapshot = structuredClone(store.records.get("inactive@example.com"));
    const inactiveDuplicate = await post(base, "/public/subscriptions", {
      email: "inactive@example.com",
      consent: true,
      name: "Attempted overwrite",
      existingManagementToken: inactiveToken,
      interests: ["changed"],
      contentTypes: ["training"],
    });
    assert.deepEqual(await inactiveDuplicate.json(), genericSignupResponse);
    assert.deepEqual(store.records.get("inactive@example.com"), inactiveSnapshot);
    assert.equal(store.records.get("inactive@example.com")?.active, false);
  });
});

test("routes require explicit consent and validate email, tokens, and extra fields", async () => {
  const store = new MemorySubscriptionStore();
  await withServer(store, async (base) => {
    const invalidSignups = [
      { email: "person@example.com" },
      { email: "person@example.com", consent: false },
      { email: "not-an-email", consent: true },
      { email: "person@example.com", consent: true, extra: "field" },
      { email: "person@example.com", consent: true, name: "" },
      { email: "person@example.com", consent: true, name: "   " },
    ];
    for (const body of invalidSignups) {
      const response = await post(base, "/public/subscriptions", body);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "Invalid request" });
    }
    assert.equal(store.records.size, 0);

    const invalidUnsubscribe = await post(base, "/public/subscriptions/unsubscribe", {
      managementToken: "too-short",
    });
    assert.equal(invalidUnsubscribe.status, 400);
    assert.deepEqual(await invalidUnsubscribe.json(), { error: "Invalid request" });
  });
});

test("signup rate limiting returns the contracted generic 429 response", async () => {
  const store = new MemorySubscriptionStore();
  await withServer(store, async (base) => {
    const first = await post(base, "/public/subscriptions", {
      email: "one@example.com",
      consent: true,
      name: "One",
    });
    const limited = await post(base, "/public/subscriptions", {
      email: "two@example.com",
      consent: true,
      name: "Two",
    });
    assert.equal(first.status, 200);
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), { error: "Too many requests" });
    assert.ok(limited.headers.get("retry-after"));
    assert.equal(store.records.size, 1);
  }, {
    signupRateLimit: createFixedWindowRateLimit({ limit: 1, windowMs: 60_000, maxKeys: 1 }),
  });
});

test("previously issued management tokens still protect preference lookup, updates, and unsubscribe", async () => {
  const store = new MemorySubscriptionStore();
  const token = "c".repeat(43);
  await createLegacyRecord(store, "audience@example.com", token);
  await withServer(store, async (base) => {
    const lookup = await post(base, "/public/subscriptions/preferences", { managementToken: token });
    assert.equal(lookup.status, 200);
    assert.deepEqual((await lookup.json() as { interests: string[] }).interests, ["camera"]);

    const updated = await fetch(`${base}/public/subscriptions/preferences`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        managementToken: token,
        name: "Alex",
        careerLevel: "mid_level",
        interests: ["camera"],
        contentTypes: ["role"],
        allOpportunities: false,
      }),
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json() as { name: string }).name, "Alex");
    const stored = store.records.get("audience@example.com");
    assert.equal(stored?.name, "Alex");
    assert.equal(stored?.consent, true);
    assert.equal(stored?.active, true);

    const cleared = await fetch(`${base}/public/subscriptions/preferences`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ managementToken: token, name: null, careerLevel: null, interests: [] }),
    });
    assert.equal(cleared.status, 200);
    assert.deepEqual(await cleared.json(), {
      acquisitionDetailDeclined: false,
      websitePurposes: [],
      interests: [],
      contentTypes: ["role"],
      careerLevels: [],
      crafts: [],
      allOpportunities: false,
    });
    assert.equal(store.records.get("audience@example.com")?.name, null);
    assert.equal(store.records.get("audience@example.com")?.careerLevel, null);

    const unauthorized = await post(base, "/public/subscriptions/preferences", { managementToken: "z".repeat(43) });
    assert.equal(unauthorized.status, 401);
    assert.equal(store.records.get("audience@example.com")?.name, null);

    const stopped = await post(base, "/public/subscriptions/unsubscribe", { managementToken: token });
    assert.equal(stopped.status, 200);
    assert.equal(store.records.get("audience@example.com")?.active, false);
  });
});

test("storage failures are sanitized and signup responses are never cached", async () => {
  const store = new MemorySubscriptionStore();
  const originalCreate = store.create.bind(store);
  let fail = false;
  store.create = async (record) => {
    if (fail) throw new Error(`sensitive database detail ${record.email} ${record.managementTokenHash}`);
    return originalCreate(record);
  };

  await withServer(store, async (base) => {
    const success = await post(base, "/public/subscriptions", {
      email: "safe@example.com",
      consent: true,
      name: "Safe",
    });
    assert.equal(success.headers.get("cache-control"), "no-store");

    fail = true;
    const unavailable = await post(base, "/public/subscriptions", {
      email: "private@example.com",
      consent: true,
      name: "Private",
    });
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { error: "Service temporarily unavailable" });
    assert.equal(store.records.has("private@example.com"), false);
  });
});