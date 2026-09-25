import { Router, type RequestHandler } from "express";
import {
  CreatePublicSubscriptionBody,
  CreatePublicSubscriptionResponse,
  UnsubscribePublicSubscriptionBody,
  UnsubscribePublicSubscriptionResponse,
  GetPublicSubscriptionPreferencesBody,
  GetPublicSubscriptionPreferencesResponse,
  UpdatePublicSubscriptionPreferencesBody,
  UpdatePublicSubscriptionPreferencesResponse,
} from "@workspace/api-zod";
import {
  publicSubscriptionService,
  type PublicSubscriptionService,
} from "../lib/public-subscription-service";
import { createFixedWindowRateLimit } from "../middlewares/fixed-window-rate-limit";

type PublicSubscriptionRouteDependencies = {
  service: PublicSubscriptionService;
  signupRateLimit: RequestHandler;
  unsubscribeRateLimit: RequestHandler;
  preferencesRateLimit: RequestHandler;
};

function hasOnlyKeys(body: unknown, allowedKeys: readonly string[]): boolean {
  return typeof body === "object"
    && body !== null
    && !Array.isArray(body)
    && Object.keys(body).every((key) => allowedKeys.includes(key));
}

function normalizeSignupBody(body: unknown): unknown {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return body;
  const input = body as Record<string, unknown>;
  return {
    ...input,
    email: typeof input.email === "string" ? input.email.trim() : input.email,
    name: typeof input.name === "string" ? input.name.trim() : input.name,
  };
}

function publicPreferences(preferences: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(preferences).filter(([, value]) => value !== null && value !== undefined));
}

const signupRateLimit = createFixedWindowRateLimit({
  limit: 8,
  windowMs: 15 * 60 * 1000,
});
const unsubscribeRateLimit = createFixedWindowRateLimit({
  limit: 30,
  windowMs: 15 * 60 * 1000,
});
const preferencesRateLimit = createFixedWindowRateLimit({
  limit: 20,
  windowMs: 15 * 60 * 1000,
});

export function createPublicSubscriptionsRouter(
  overrides: Partial<PublicSubscriptionRouteDependencies> = {},
) {
  const dependencies: PublicSubscriptionRouteDependencies = {
    service: publicSubscriptionService,
    signupRateLimit,
    unsubscribeRateLimit,
    preferencesRateLimit,
    ...overrides,
  };
  const router = Router();

  router.post("/public/subscriptions", dependencies.signupRateLimit, async (req, res): Promise<void> => {
    const parsed = CreatePublicSubscriptionBody.safeParse(normalizeSignupBody(req.body));
    if (
      !hasOnlyKeys(req.body, [
        "email", "consent", "existingManagementToken", "name", "craft", "careerLevel",
        "location", "acquisitionSource", "acquisitionDetail", "interests", "contentTypes",
        "careerLevels", "crafts", "allOpportunities",
      ])
      || !parsed.success
    ) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    if (parsed.data.contentTypes?.some((type) => type === "content")) {
      res.status(400).json({ error: "Choose role, programme, or training content types" });
      return;
    }

    try {
      const result = await dependencies.service.subscribe(parsed.data);
      res.setHeader("Cache-Control", "no-store");
      res.json(CreatePublicSubscriptionResponse.parse(result));
    } catch {
      req.log?.warn("Subscription storage unavailable");
      res.status(503).json({ error: "Service temporarily unavailable" });
    }
  });

  router.post(
    "/public/subscriptions/unsubscribe",
    dependencies.unsubscribeRateLimit,
    async (req, res): Promise<void> => {
      const parsed = UnsubscribePublicSubscriptionBody.safeParse(req.body);
      if (!hasOnlyKeys(req.body, ["managementToken"]) || !parsed.success) {
        res.status(400).json({ error: "Invalid request" });
        return;
      }

      try {
        const result = await dependencies.service.unsubscribe(parsed.data.managementToken);
        res.setHeader("Cache-Control", "no-store");
        res.json(UnsubscribePublicSubscriptionResponse.parse(result));
      } catch {
        req.log?.warn("Subscription storage unavailable");
        res.status(503).json({ error: "Service temporarily unavailable" });
      }
    },
  );

  router.post("/public/subscriptions/preferences", dependencies.preferencesRateLimit, async (req, res): Promise<void> => {
    const parsed = GetPublicSubscriptionPreferencesBody.safeParse(req.body);
    if (!hasOnlyKeys(req.body, ["managementToken"]) || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const preferences = await dependencies.service.getPreferences(parsed.data.managementToken);
    if (!preferences) {
      res.status(401).json({ error: "Invalid management token" });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(GetPublicSubscriptionPreferencesResponse.parse(publicPreferences(preferences as Record<string, unknown>)));
  });

  router.put("/public/subscriptions/preferences", dependencies.preferencesRateLimit, async (req, res): Promise<void> => {
    const parsed = UpdatePublicSubscriptionPreferencesBody.safeParse(req.body);
    if (!parsed.success || !hasOnlyKeys(req.body, [
      "managementToken", "name", "craft", "careerLevel", "location", "acquisitionSource",
      "acquisitionDetail", "interests", "contentTypes", "careerLevels", "crafts", "allOpportunities",
    ])) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    if (parsed.data.contentTypes?.some((type) => type === "content")) {
      res.status(400).json({ error: "Choose role, programme, or training content types" });
      return;
    }
    const { managementToken, ...requested } = parsed.data;
    const preferences = await dependencies.service.updatePreferences(managementToken, requested);
    if (!preferences) {
      res.status(401).json({ error: "Invalid management token" });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(UpdatePublicSubscriptionPreferencesResponse.parse(publicPreferences(preferences as Record<string, unknown>)));
  });

  return router;
}

export default createPublicSubscriptionsRouter();