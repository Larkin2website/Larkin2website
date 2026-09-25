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

test("signup persists consent while duplicates cannot rotate or alter the existing record", async () => {
  const store = new MemorySubscriptionStore();
  let originalToken = "";
  const generated = await withServer(store, async (base) => {
    const first = await post(base, "/public/subscriptions", {
      email: " Person@Example.COM ",
      consent: true,
    });
    assert.equal(first.status, 200);
    originalToken = (await first.json() as { managementToken: string }).managementToken;
    assert.equal(originalToken.length, 43);

    const original = store.records.get("person@example.com");
    assert.ok(original);
    assert.equal(original.consent, true);
    assert.equal(original.active, true);
    assert.equal(original.managementTokenHash, hashManagementToken(originalToken));
    assert.equal(original.managementTokenHash.includes(originalToken), false);
    assert.deepEqual(original.contentTypes ?? [], []);
    assert.equal(original.allOpportunities ?? false, false);
    assert.equal(original.name ?? null, null);

    const selected = await fetch(`${base}/public/subscriptions/preferences`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ managementToken: originalToken, contentTypes: ["role"] }),
    });
    assert.equal(selected.status, 200);

    const duplicate = await post(base, "/public/subscriptions", {
      email: "person@example.com",
      consent: true,
    });
    assert.equal(duplicate.status, 200);
    const inertToken = (await duplicate.json() as { managementToken: string }).managementToken;
    assert.equal(inertToken.length, 43);
    assert.notEqual(inertToken, originalToken);
    assert.equal(store.records.get("person@example.com"), original);
    assert.equal(original.managementTokenHash, hashManagementToken(originalToken));

    const capableDuplicate = await post(base, "/public/subscriptions", {
      email: "PERSON@example.com",
      consent: true,
      existingManagementToken: originalToken,
    });
    assert.equal(capableDuplicate.status, 200);
    assert.deepEqual(await capableDuplicate.json(), { managementToken: originalToken });
    assert.equal(store.records.get("person@example.com"), original);
    assert.deepEqual(original.contentTypes, ["role"], "minimal repeat signup must not clear existing opportunity choices");
  });

  assert.equal(generated.length, 4);
  assert.equal(store.records.size, 1);
});

test("only the corresponding token unsubscribes, repeated requests are safe, and GET never mutates", async () => {
  const store = new MemorySubscriptionStore();
  await withServer(store, async (base) => {
    const aliceToken = (await (await post(base, "/public/subscriptions", {
      email: "alice@example.com",
      consent: true,
    })).json() as { managementToken: string }).managementToken;
    const bobToken = (await (await post(base, "/public/subscriptions", {
      email: "bob@example.com",
      consent: true,
    })).json() as { managementToken: string }).managementToken;

    const unknownToken = "z".repeat(43);
    const unknown = await post(base, "/public/subscriptions/unsubscribe", {
      managementToken: unknownToken,
    });
    assert.equal(unknown.status, 200);
    assert.equal(store.records.get("alice@example.com")?.active, true);
    assert.equal(store.records.get("bob@example.com")?.active, true);

    assert.equal((await fetch(`${base}/public/subscriptions/unsubscribe`)).status, 404);
    assert.equal(store.records.get("alice@example.com")?.active, true);

    const first = await post(base, "/public/subscriptions/unsubscribe", {
      managementToken: aliceToken,
    });
    const repeated = await post(base, "/public/subscriptions/unsubscribe", {
      managementToken: aliceToken,
    });
    assert.equal(first.status, 200);
    assert.equal(repeated.status, 200);
    assert.deepEqual(await first.json(), await repeated.json());
    assert.equal(store.records.get("alice@example.com")?.active, false);
    assert.equal(store.records.get("bob@example.com")?.active, true);

    const inactiveDuplicate = await post(base, "/public/subscriptions", {
      email: "alice@example.com",
      consent: true,
      existingManagementToken: aliceToken,
    });
    assert.deepEqual(await inactiveDuplicate.json(), { managementToken: aliceToken });
    assert.equal(store.records.get("alice@example.com")?.active, false);

    await post(base, "/public/subscriptions/unsubscribe", { managementToken: bobToken });
    assert.equal(store.records.get("bob@example.com")?.active, false);
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
    });
    const limited = await post(base, "/public/subscriptions", {
      email: "two@example.com",
      consent: true,
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

test("management token protects preference lookup and updates without changing consent or active state", async () => {
  const store = new MemorySubscriptionStore();
  await withServer(store, async (base) => {
    const signup = await post(base, "/public/subscriptions", {
      email: "audience@example.com",
      consent: true,
    });
    const token = (await signup.json() as { managementToken: string }).managementToken;

    const lookup = await post(base, "/public/subscriptions/preferences", { managementToken: token });
    assert.equal(lookup.status, 200);
    assert.deepEqual((await lookup.json() as { interests: string[] }).interests, []);

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
  });
});

test("storage failures are sanitized and token responses are never cached", async () => {
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
    });
    assert.equal(success.headers.get("cache-control"), "no-store");

    fail = true;
    const unavailable = await post(base, "/public/subscriptions", {
      email: "private@example.com",
      consent: true,
    });
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { error: "Service temporarily unavailable" });
    assert.equal(store.records.has("private@example.com"), false);
  });
});