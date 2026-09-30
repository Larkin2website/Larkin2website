import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  audienceMatchingTable,
  crmCommunicationOutboxTable,
  crmCommunicationsTable,
  publicSubscriptionsTable,
} from "@workspace/db";
import { createAudienceCrmRouter } from "../routes/audience-crm";
import {
  isEligibleAudienceRecipient,
  matchingCriteriaFor,
  reconcilePendingDeliveries,
  reconcilePublicationRecipients,
  summarizeAcquisitionDetails,
  summarizeWebsitePurposes,
} from "./audience-crm-service";

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

test("general-only subscribers are distinct from opportunity opt-ins", () => {
  const generalOnly = {
    active: true,
    consent: true,
    allOpportunities: false,
    contentTypes: ["content"],
    careerLevels: [],
    craft: null,
    crafts: [],
    interests: [],
  };
  assert.equal(isEligibleAudienceRecipient(generalOnly, matching), false);
  assert.equal(isEligibleAudienceRecipient(generalOnly, { ...matching, contentType: "programme" }), false);
  assert.equal(isEligibleAudienceRecipient({ ...generalOnly, allOpportunities: true }, matching), true);
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

test("published criteria edits add newly eligible recipients and remove no-longer-eligible pending rows", async () => {
  const eligible = {
    id: "subscriber-eligible", active: true, consent: true, allOpportunities: false,
    contentTypes: ["role"], careerLevels: [], crafts: [], interests: [], craft: null,
  };
  const newlyEligible = { ...eligible, id: "subscriber-new" };
  const noLongerEligible = { ...eligible, id: "subscriber-stale", contentTypes: ["programme"] };
  const communication = { id: "communication-role", opportunityId: "publication-role", programmeId: null, status: "pending" };
  const outbox: Array<Record<string, unknown>> = [
    { id: "delivery-stale", communicationId: communication.id, subscriberId: noLongerEligible.id, opportunityId: communication.opportunityId, programmeId: null, status: "pending" },
    { id: "delivery-eligible", communicationId: communication.id, subscriberId: eligible.id, opportunityId: communication.opportunityId, programmeId: null, status: "pending" },
  ];
  const deleted: string[] = [];
  const inserted: Array<Record<string, unknown>> = [];
  const counts: number[] = [];
  const tx = {
    select: (selection?: { total?: unknown }) => ({
      from: (table: unknown) => table === publicSubscriptionsTable
        ? Promise.resolve([eligible, newlyEligible, noLongerEligible])
        : {
          where: () => selection?.total
            ? Promise.resolve([{ total: outbox.length }])
            : table === crmCommunicationsTable
              ? { limit: async () => [communication] }
              : Promise.resolve([...outbox]),
        },
    }),
    delete: () => ({ where: async () => {
      deleted.push("delivery-stale");
      const index = outbox.findIndex(row => row.id === "delivery-stale");
      if (index >= 0) outbox.splice(index, 1);
    } }),
    insert: () => ({
      values: (values: Array<Record<string, unknown>>) => ({
        onConflictDoNothing: async () => {
          inserted.push(...values);
          outbox.push(...values);
        },
      }),
    }),
    update: () => ({
      set: (values: { recipientCount: number }) => ({
        where: async () => { counts.push(values.recipientCount); },
      }),
    }),
  };
  await reconcilePublicationRecipients(tx, "role", "publication-role", matchingCriteriaFor("role"));
  assert.deepEqual(deleted, ["delivery-stale"]);
  assert.deepEqual(inserted.map(row => row.subscriberId), ["subscriber-new"]);
  assert.deepEqual(counts, [2]);
});

test("subscriber preference changes reconcile pending queue in both directions", async () => {
  const subscriber = {
    id: "subscriber", active: true, consent: true, allOpportunities: false,
    contentTypes: ["programme"], careerLevels: [], crafts: [], interests: [], craft: null,
  } as unknown as Parameters<typeof reconcilePendingDeliveries>[1];
  const roleCommunication = { id: "communication-role", opportunityId: "publication-role", programmeId: null, status: "pending" };
  const programmeCommunication = { id: "communication-programme", opportunityId: null, programmeId: "publication-programme", status: "pending" };
  const outbox: Array<Record<string, unknown>> = [
    { id: "role-delivery", communicationId: roleCommunication.id, subscriberId: subscriber.id, opportunityId: roleCommunication.opportunityId, programmeId: null, status: "pending" },
  ];
  const matchingRows = [
    { ...matchingCriteriaFor("role"), opportunityId: roleCommunication.opportunityId, programmeId: null },
    { ...matchingCriteriaFor("role"), opportunityId: roleCommunication.opportunityId, programmeId: null },
    { ...matchingCriteriaFor("programme"), contentType: "programme" as const, opportunityId: null, programmeId: programmeCommunication.programmeId },
  ];
  const deleted: string[] = [];
  const inserted: Array<Record<string, unknown>> = [];
  const updatedCounts: Array<{ communicationId: string; recipientCount: number }> = [];
  let matchingRead = 0;
  const tx = {
    select: (selection?: { total?: unknown }) => ({
      from: (table: unknown) => {
        if (table === crmCommunicationOutboxTable && selection?.total) {
          return { where: async () => [{ total: updatedCounts.length === 0 ? 0 : outbox.length }] };
        }
        if (table === crmCommunicationOutboxTable) return { where: async () => [...outbox] };
        if (table === crmCommunicationsTable) return { where: async () => [roleCommunication, programmeCommunication] };
        if (table === audienceMatchingTable) return { where: () => ({ limit: async () => [matchingRows[matchingRead++]] }) };
        throw new Error("Unexpected table read");
      },
    }),
    delete: () => ({ where: async () => {
      deleted.push("role-delivery");
      const index = outbox.findIndex(row => row.id === "role-delivery");
      if (index >= 0) outbox.splice(index, 1);
    } }),
    insert: () => ({
      values: (value: Record<string, unknown>) => ({
        onConflictDoNothing: async () => {
          inserted.push(value);
          outbox.push(value);
        },
      }),
    }),
    update: () => ({
      set: (values: { recipientCount: number }) => ({
        where: async (condition: unknown) => {
          updatedCounts.push({
            communicationId: updatedCounts.length === 0 ? roleCommunication.id : programmeCommunication.id,
            recipientCount: values.recipientCount,
          });
        },
      }),
    }),
  };
  await reconcilePendingDeliveries(tx, subscriber);
  assert.deepEqual(deleted, ["role-delivery"]);
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].programmeId, programmeCommunication.programmeId);
  assert.deepEqual(updatedCounts, [
    { communicationId: roleCommunication.id, recipientCount: 0 },
    { communicationId: programmeCommunication.id, recipientCount: 1 },
  ]);
});

test("criteria reconciliation leaves completed communications and historical deliveries unchanged", async () => {
  const pendingRows = <T extends { status: string }>(rows: T[]) => rows.filter(row => row.status === "pending");
  for (const status of ["sent", "delivered", "failed"] as const) {
    let outboxReads = 0;
    let subscriberReads = 0;
    let writes = 0;
    const tx = {
      select: () => ({
        from: (table: unknown) => ({
          where: () => table === crmCommunicationsTable
            ? { limit: async () => pendingRows([{ id: `communication-${status}`, opportunityId: "completed-publication", programmeId: null, status }]) }
            : (table === crmCommunicationOutboxTable ? outboxReads++ : subscriberReads++, Promise.resolve([])),
        }),
      }),
      delete: () => { writes++; throw new Error("Completed communication deliveries must not be deleted"); },
      insert: () => { writes++; throw new Error("Completed communications must not receive pending rows"); },
      update: () => { writes++; throw new Error("Historical recipient counts must not be changed"); },
    };
    await reconcilePublicationRecipients(tx, "role", "completed-publication", matchingCriteriaFor("role"));
    assert.equal(outboxReads, 0);
    assert.equal(subscriberReads, 0);
    assert.equal(writes, 0);
  }
});

test("subscriber preference reconciliation skips outbox rows for completed communications", async () => {
  const pendingRows = <T extends { status: string }>(rows: T[]) => rows.filter(row => row.status === "pending");
  const subscriber = {
    id: "subscriber", active: true, consent: true, allOpportunities: false,
    contentTypes: ["programme"], careerLevels: [], crafts: [], interests: [], craft: null,
  } as unknown as Parameters<typeof reconcilePendingDeliveries>[1];
  for (const status of ["sent", "delivered", "failed"] as const) {
    const completedCommunication = { id: `communication-${status}`, opportunityId: "published-role", programmeId: null, status };
    const historicalPendingRow = {
      id: "old-pending-row", communicationId: completedCommunication.id, subscriberId: subscriber.id,
      opportunityId: completedCommunication.opportunityId, programmeId: null, status: "pending",
    };
    let writes = 0;
    let pendingFilterWasApplied = false;
    const tx = {
      select: () => ({
        from: (table: unknown) => table === crmCommunicationOutboxTable
          ? { where: async () => [historicalPendingRow] }
          : {
            where: async () => {
              pendingFilterWasApplied = true;
              return pendingRows([completedCommunication]);
            },
          },
      }),
      delete: () => { writes++; throw new Error("Completed communication deliveries must not be deleted"); },
      insert: () => { writes++; throw new Error("Completed communications must not receive pending rows"); },
      update: () => { writes++; throw new Error("Historical recipient counts must not be changed"); },
    };
    await reconcilePendingDeliveries(tx, subscriber);
    assert.equal(pendingFilterWasApplied, true);
    assert.equal(writes, 0);
  }
});

test("dashboard attributes specific sources separately for canonical and legacy source values", () => {
  assert.deepEqual(summarizeAcquisitionDetails([
    { acquisitionSource: "instagram", acquisitionDetail: "Film Crew Group" },
    { acquisitionSource: "instagram", acquisitionDetail: " film crew group " },
    { acquisitionSource: "Facebook film network", acquisitionDetail: "Film Crew Group" },
    { acquisitionSource: "instagram", acquisitionDetail: null },
  ]), [
    { source: "instagram", detail: "Film Crew Group", count: 2 },
    { source: "Facebook film network", detail: "Film Crew Group", count: 1 },
  ]);
});

test("website purpose breakdown counts unique subscribers per option and retains zero-count choices", () => {
  assert.deepEqual(summarizeWebsitePurposes([
    { websitePurposes: ["roles_self", "other", "roles_self"] },
    { websitePurposes: ["roles_self", "training_self"] },
    { websitePurposes: [] },
  ]), [
    { purpose: "roles_self", count: 2 },
    { purpose: "training_self", count: 1 },
    { purpose: "share_network", count: 0 },
    { purpose: "on_behalf", count: 0 },
    { purpose: "industry_interest", count: 0 },
    { purpose: "other", count: 1 },
  ]);
});