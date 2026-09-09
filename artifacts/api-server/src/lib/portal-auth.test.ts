import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { createRequirePortal, verifiedPortalProfile } from "./portal-auth";
import type { PortalMembership } from "@workspace/db";

const timestamps = {
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function claimedMembership(overrides: Partial<PortalMembership> = {}): PortalMembership {
  return {
    userId: "clerk-verified-user",
    displayName: "Administrator Chosen Name",
    email: "verified@example.com",
    role: "super_admin",
    active: true,
    ...timestamps,
    ...overrides,
  };
}

async function withAuthServer(
  middleware: ReturnType<ReturnType<typeof createRequirePortal>>,
  assertion: (baseUrl: string) => Promise<void>,
) {
  const app = express();
  app.get("/protected", middleware, (req, res) => {
    res.status(200).json(req.portalActor);
  });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const { port } = server.address() as AddressInfo;
    await assertion(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("only a verified Clerk primary email becomes a portal claim profile", () => {
  assert.equal(verifiedPortalProfile({
    firstName: "Unverified",
    primaryEmailAddress: {
      emailAddress: "unverified@example.com",
      verification: { status: "unverified" },
    },
  }), undefined);
  assert.equal(verifiedPortalProfile({ firstName: "Missing" }), undefined);
  assert.deepEqual(verifiedPortalProfile({
    firstName: "Verified",
    lastName: "Person",
    primaryEmailAddress: {
      emailAddress: "verified@example.com",
      verification: { status: "verified" },
    },
  }), {
    displayName: "Verified Person",
    email: "verified@example.com",
  });
});

test("an unrecognized identity without verified email ownership cannot resolve a grant", async () => {
  let resolveCalled = false;
  const requirePortal = createRequirePortal({
    demoMode: () => false,
    userIdForRequest: () => "clerk-unverified-user",
    memberForUser: async () => undefined,
    profileForUser: async () => undefined,
    resolveUnrecognizedUser: async () => {
      resolveCalled = true;
      return claimedMembership();
    },
  });

  await withAuthServer(requirePortal("members:manage"), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/protected`);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: "A verified email address is required for portal access",
    });
    assert.equal(resolveCalled, false);
  });
});

test("verified email ownership may claim a pre-granted role and administrator-entered name", async () => {
  const profile = verifiedPortalProfile({
    firstName: "Clerk",
    lastName: "Profile",
    primaryEmailAddress: {
      emailAddress: "VERIFIED@example.com",
      verification: { status: "verified" },
    },
  })!;
  let receivedProfile: typeof profile | undefined;
  const requirePortal = createRequirePortal({
    demoMode: () => false,
    userIdForRequest: () => "clerk-verified-user",
    memberForUser: async () => undefined,
    profileForUser: async () => profile,
    resolveUnrecognizedUser: async (_userId, candidateProfile) => {
      receivedProfile = candidateProfile;
      return claimedMembership();
    },
  });

  await withAuthServer(requirePortal("members:manage"), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/protected`);
    assert.equal(response.status, 200);
    const actor = await response.json() as { displayName: string; role: string };
    assert.equal(actor.displayName, "Administrator Chosen Name");
    assert.equal(actor.role, "super_admin");
    assert.deepEqual(receivedProfile, profile);
  });
});