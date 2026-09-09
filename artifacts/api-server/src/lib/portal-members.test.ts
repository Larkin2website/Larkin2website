import assert from "node:assert/strict";
import test from "node:test";
import {
  isPortalEmailConflict,
  normalizePortalEmail,
  resolvePortalMembership,
  updatePortalPersonRecord,
  type PortalMembershipStore,
  type PortalPersonUpdateStore,
} from "./portal-members";
import type { PortalAccessGrant, PortalMembership } from "@workspace/db";

test("portal emails are normalized for matching and duplicate validation", () => {
  assert.equal(normalizePortalEmail("  Alex.Morgan@Example.COM "), "alex.morgan@example.com");
});

test("wrapped database uniqueness errors become duplicate-email conflicts", () => {
  assert.equal(isPortalEmailConflict({ cause: { code: "23505" } }), true);
  assert.equal(isPortalEmailConflict({ cause: { cause: { code: "23505" } } }), true);
  assert.equal(isPortalEmailConflict({ code: "23503" }), false);
});

function membership(overrides: Partial<PortalMembership> = {}): PortalMembership {
  return {
    userId: "user-existing",
    displayName: "Existing Person",
    email: "existing@example.com",
    role: "viewer",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function grant(overrides: Partial<PortalAccessGrant> = {}): PortalAccessGrant {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    displayName: "Administrator Chosen Name",
    email: "Granted@Example.com",
    normalizedEmail: "granted@example.com",
    claimedUserId: null,
    claimedAt: null,
    role: "opportunity_manager",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function fakeStore(options: {
  emailOwner?: PortalMembership;
  accessGrant?: PortalAccessGrant;
  count?: number;
}) {
  const created: Array<Omit<PortalMembership, "createdAt" | "updatedAt">> = [];
  const deleted: string[] = [];
  const store: PortalMembershipStore = {
    async findMembershipByUserId() { return undefined; },
    async findMembershipByNormalizedEmail() { return options.emailOwner; },
    async findGrantByNormalizedEmail() { return options.accessGrant; },
    async createMembership(values) {
      created.push(values);
      return membership(values);
    },
    async claimGrant(id) { deleted.push(id); },
    async countMemberships() { return options.count ?? 1; },
  };
  return { store, created, deleted };
}

test("first Clerk sign-in claims a case-insensitive grant without losing its name, role, or status", async () => {
  const pendingGrant = grant({ active: false });
  const { store, created, deleted } = fakeStore({ accessGrant: pendingGrant });
  const claimed = await resolvePortalMembership(
    "clerk-user-1",
    { displayName: "Clerk Profile Name", email: "GRANTED@example.COM" },
    store,
  );

  assert.equal(claimed?.userId, "clerk-user-1");
  assert.equal(claimed?.displayName, "Administrator Chosen Name");
  assert.equal(claimed?.role, "opportunity_manager");
  assert.equal(claimed?.active, false);
  assert.equal(created[0].email, "Granted@Example.com");
  assert.deepEqual(deleted, [pendingGrant.id]);
});

test("a Clerk identity cannot claim an email already attached to another member", async () => {
  const { store, created, deleted } = fakeStore({
    emailOwner: membership({ userId: "different-clerk-user", email: "claimed@example.com" }),
    accessGrant: grant({ normalizedEmail: "claimed@example.com" }),
  });
  const claimed = await resolvePortalMembership(
    "new-clerk-user",
    { displayName: "New User", email: "CLAIMED@example.com" },
    store,
  );

  assert.equal(claimed, undefined);
  assert.equal(created.length, 0);
  assert.equal(deleted.length, 0);
});

function serialRunner() {
  let tail = Promise.resolve();
  return function run<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation);
    tail = result.then(() => undefined, () => undefined);
    return result;
  };
}

function coordinatedStores() {
  let pendingGrant = grant();
  let claimedMember: PortalMembership | undefined;

  const claimStore: PortalMembershipStore = {
    async findMembershipByUserId(userId) {
      return claimedMember?.userId === userId ? claimedMember : undefined;
    },
    async findMembershipByNormalizedEmail(email) {
      return claimedMember && normalizePortalEmail(claimedMember.email) === email
        ? claimedMember
        : undefined;
    },
    async findGrantByNormalizedEmail(email) {
      return pendingGrant.normalizedEmail === email ? { ...pendingGrant } : undefined;
    },
    async createMembership(values) {
      claimedMember = membership(values);
      return claimedMember;
    },
    async claimGrant(_id, userId) {
      pendingGrant = { ...pendingGrant, claimedUserId: userId, claimedAt: new Date() };
    },
    async countMemberships() { return claimedMember ? 1 : 0; },
  };

  const updateStore: PortalPersonUpdateStore = {
    async findMembershipByUserId(userId) {
      return claimedMember?.userId === userId ? claimedMember : undefined;
    },
    async findGrantById(id) {
      return pendingGrant.id === id ? { ...pendingGrant } : undefined;
    },
    async countActiveSuperAdmins() { return 1; },
    async updateMembership(_userId, values) {
      claimedMember = { ...claimedMember!, ...values };
      return claimedMember;
    },
    async updateGrant(_id, values) {
      pendingGrant = { ...pendingGrant, ...values };
      return pendingGrant;
    },
  };

  return {
    claimStore,
    updateStore,
    getClaimedMember: () => claimedMember,
  };
}

test("a grant suspension serialized before claim is preserved by the new membership", async () => {
  const state = coordinatedStores();
  const run = serialRunner();
  const update = run(() => updatePortalPersonRecord(
    grant().id,
    { role: "viewer", active: false },
    state.updateStore,
  ));
  const claim = run(() => resolvePortalMembership(
    "clerk-user-serialized",
    { displayName: "Clerk Name", email: "granted@example.com" },
    state.claimStore,
  ));

  await Promise.all([update, claim]);
  assert.equal(state.getClaimedMember()?.role, "viewer");
  assert.equal(state.getClaimedMember()?.active, false);
});

test("an update serialized after claim is rejected instead of reporting a lost suspension", async () => {
  const state = coordinatedStores();
  const run = serialRunner();
  const claim = run(() => resolvePortalMembership(
    "clerk-user-first",
    { displayName: "Clerk Name", email: "granted@example.com" },
    state.claimStore,
  ));
  const update = run(() => updatePortalPersonRecord(
    grant().id,
    { role: "viewer", active: false },
    state.updateStore,
  ));

  await claim;
  await assert.rejects(update, /GRANT_ALREADY_CLAIMED/);
  assert.equal(state.getClaimedMember()?.role, "opportunity_manager");
  assert.equal(state.getClaimedMember()?.active, true);
});