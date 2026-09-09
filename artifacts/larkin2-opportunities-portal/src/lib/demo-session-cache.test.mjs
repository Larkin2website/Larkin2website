import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { clearDemoSessionCache } from "./demo-session-cache.ts";

test("sign-out replaces a cached demo identity even after an authentication error", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const queryKey = ["/portal/session"];
  const demoSession = { member: { email: "demo@larkin2.invalid" } };
  queryClient.setQueryData(queryKey, demoSession);

  await assert.rejects(queryClient.fetchQuery({
    queryKey,
    queryFn: async () => {
      throw new Error("401 Authentication required");
    },
  }));
  assert.deepEqual(queryClient.getQueryData(queryKey), demoSession);

  await clearDemoSessionCache(queryClient, queryKey);
  assert.equal(queryClient.getQueryData(queryKey), null);

  const newSession = { member: { email: "demo@larkin2.invalid" }, renewed: true };
  queryClient.setQueryData(queryKey, newSession);
  assert.deepEqual(queryClient.getQueryData(queryKey), newSession);
});