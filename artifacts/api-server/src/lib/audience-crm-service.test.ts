import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { getTableConfig } from "drizzle-orm/pg-core";
import { crmCommunicationOutboxTable } from "@workspace/db";
import { createAudienceCrmRouter } from "../routes/audience-crm";
import { isEligibleAudienceRecipient, matchingCriteriaFor, reconcilePendingDeliveries, summarizeAcquisitionDetails } from "./audience-crm-service";

const matching = {
  contentType: "role" as const,
  careerLevels: ["new_entrant"] as ("new_entrant" | "mid_level" | "senior")[],
  crafts: ["CAMERA"],
  tags: ["on-set"],
};

test("matching eligibility uses opt-in criteria, not the subscriber's own career level", () => {
  const eligible = {
    active: true,
    consent: true,
    allOpportunities: false,
    contentTypes: ["role"],
    craft: " camera ",
    careerLevels: ["new_entrant"],
    crafts: ["CAMERA"],
    interests: ["on-set"],
  };
  assert.equal(isEligibleAudienceRecipient(eligible, matching), true);
  assert.equal(isEligibleAudienceRecipient({ ...eligible, crafts: [] }, matching), true);
  assert.equal(isEligibleAudienceRecipient({ ...eligible, careerLevels: ["senior"] }, matching), false);
  assert.equal(isEligibleAudienceRecipient({ ...eligible, craft: null, crafts: ["SOUND"] }, matching), false);
  assert.equal(isEligibleAudienceRecipient({ ...eligible, contentTypes: ["programme"] }, matching), false);
  assert.equal(isEligibleAudienceRecipient({ ...eligible, active: false }, matching), false);
});

test("training notices match opted-in training broadly and all-opportunities is a broad opt-in", () => {
  const training = {
    ...matching,
    contentType: "training" as const,
    careerLevels: ["senior"] as ("new_entrant" | "mid_level" | "senior")[],
    crafts: ["SOUND"],
    tags: ["advanced"],
  };
  const subscribedToTraining = {
    active: true,
    consent: true,
    allOpportunities: false,
    contentTypes: ["training"],
    craft: null,
    careerLevels: [],
    crafts: [],
    interests: [],
  };
  assert.equal(isEligibleAudienceRecipient(subscribedToTraining, training), true);
  assert.equal(isEligibleAudienceRecipient({ ...subscribedToTraining, contentTypes: ["role"] }, training), false);
  assert.equal(isEligibleAudienceRecipient({ ...subscribedToTraining, allOpportunities: true }, matching), true);
});

test("outbox has unique publication-recipient indexes for retry-safe delivery creation", () => {
  const indexes = getTableConfig(crmCommunicationOutboxTable).indexes;
  assert.ok(indexes.some((index) => index.config.name === "crm_outbox_opportunity_subscriber_unique" && index.config.unique));
  assert.ok(indexes.some((index) => index.config.name === "crm_outbox_programme_subscriber_unique" && index.config.unique));
});

test("CRM audience HTTP filters distinguish active=true from active=false", async () => {
  const filters: Array<{ active?: boolean }> = [];
  const app = express();
  app.use(createAudienceCrmRouter({
    requireCrmAccess: (_req, _res, next) => next(),
    listAudience: async (query) => {
      filters.push(query);
      return [];
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    for (const value of ["true", "false"]) {
      const response = await fetch(`${base}/crm/audience?active=${value}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), []);
    }
    const invalid = await fetch(`${base}/crm/audience?active=anything`);
    assert.equal(invalid.status, 400);
    assert.deepEqual(filters.map((filter) => filter.active), [true, false]);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("preference reconciliation retains a pending recipient with default matching criteria", async () => {
  const subscriber = {
    id: "00000000-0000-0000-0000-000000000001",
    active: true, consent: true, allOpportunities: false,
    contentTypes: ["role"], careerLevels: [], crafts: [], interests: [], craft: null,
  } as unknown as Parameters<typeof reconcilePendingDeliveries>[1];
  assert.equal(isEligibleAudienceRecipient(subscriber, matchingCriteriaFor("role")), true);
  const pending = [{
    id: "00000000-0000-0000-0000-000000000002",
    opportunityId: "00000000-0000-0000-0000-000000000003",
    programmeId: null,
  }];
  let reads = 0;
  const tx = {
    select: () => ({ from: () => ({ where: () => {
      reads += 1;
      return reads === 1 ? Promise.resolve(pending) : { limit: async () => [] };
    } }) }),
    delete: () => { throw new Error("A still-eligible pending recipient must not be deleted"); },
  };
  await reconcilePendingDeliveries(tx, subscriber);
  assert.equal(reads, 2);
  assert.equal(isEligibleAudienceRecipient({ ...subscriber, active: false }, matchingCriteriaFor("role")), false);
});

test("dashboard attributes specific sources separately under their primary source", () => {
  assert.deepEqual(summarizeAcquisitionDetails([
    { acquisitionSource: "Instagram", acquisitionDetail: "Film Crew Group" },
    { acquisitionSource: "Instagram", acquisitionDetail: " film crew group " },
    { acquisitionSource: "Facebook", acquisitionDetail: "Film Crew Group" },
    { acquisitionSource: "Instagram", acquisitionDetail: null },
  ]), [
    { source: "Instagram", detail: "Film Crew Group", count: 2 },
    { source: "Facebook", detail: "Film Crew Group", count: 1 },
  ]);
});