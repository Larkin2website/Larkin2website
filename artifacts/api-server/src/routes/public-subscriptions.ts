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
  RequestSubscriptionCodeBody,
  RequestSubscriptionCodeResponse,
  VerifySubscriptionCodeBody,
  VerifySubscriptionCodeResponse,
  GetVerifiedSubscriptionPreferencesBody,
  GetVerifiedSubscriptionPreferencesResponse,
  UpdateVerifiedSubscriptionPreferencesBody,
  UpdateVerifiedSubscriptionPreferencesResponse,
  UnsubscribeVerifiedSubscriptionBody,
  UnsubscribeVerifiedSubscriptionResponse,
} from "@workspace/api-zod";
import {
  InvalidReferralPreferencesError,
  InvalidWebsitePurposesError,
  publicSubscriptionService,
  type PublicSubscriptionService,
} from "../lib/public-subscription-service";
import { createFixedWindowRateLimit } from "../middlewares/fixed-window-rate-limit";
import { subscriptionVerificationService, type SubscriptionVerificationService } from "../lib/subscription-email-verification";

type PublicSubscriptionRouteDependencies = {
  service: PublicSubscriptionService;
  signupRateLimit: RequestHandler;
  unsubscribeRateLimit: RequestHandler;
  preferencesRateLimit: RequestHandler;
  verificationRateLimit: RequestHandler;
  verification: SubscriptionVerificationService;
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
    acquisitionSource: typeof input.acquisitionSource === "string" ? input.acquisitionSource.trim() : input.acquisitionSource,
  };
}

function normalizeEmailBody(body: unknown): unknown {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return body;
  const input = body as Record<string, unknown>;
  return { ...input, email: typeof input.email === "string" ? input.email.trim() : input.email };
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
const verificationRateLimit = createFixedWindowRateLimit({ limit: 10, windowMs: 15 * 60 * 1000 });

export function createPublicSubscriptionsRouter(
  overrides: Partial<PublicSubscriptionRouteDependencies> = {},
) {
  const dependencies: PublicSubscriptionRouteDependencies = {
    service: publicSubscriptionService,
    signupRateLimit,
    unsubscribeRateLimit,
    preferencesRateLimit,
    verificationRateLimit,
    verification: subscriptionVerificationService,
    ...overrides,
  };
  const router = Router();

  router.post("/public/subscriptions", dependencies.signupRateLimit, async (req, res): Promise<void> => {
    const parsed = CreatePublicSubscriptionBody.safeParse(normalizeSignupBody(req.body));
    if (
      !hasOnlyKeys(req.body, [
        "email", "consent", "existingManagementToken", "name", "craft", "careerLevel",
        "location", "acquisitionSource", "acquisitionDetail", "acquisitionDetailDeclined", "interests", "contentTypes",
        "careerLevels", "crafts", "allOpportunities", "websitePurposes", "websitePurposeOther",
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
    } catch (error) {
      if (error instanceof InvalidReferralPreferencesError || error instanceof InvalidWebsitePurposesError) {
        res.status(400).json({ error: error.message }); return;
      }
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
      "acquisitionDetail", "acquisitionDetailDeclined", "interests", "contentTypes", "careerLevels", "crafts", "allOpportunities", "websitePurposes", "websitePurposeOther",
    ])) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    if (parsed.data.contentTypes?.some((type) => type === "content")) {
      res.status(400).json({ error: "Choose role, programme, or training content types" });
      return;
    }
    const { managementToken, ...requested } = parsed.data;
    let preferences;
    try {
      preferences = await dependencies.service.updatePreferences(managementToken, requested);
    } catch (error) {
      if (error instanceof InvalidReferralPreferencesError || error instanceof InvalidWebsitePurposesError) {
        res.status(400).json({ error: error.message }); return;
      }
      throw error;
    }
    if (!preferences) {
      res.status(401).json({ error: "Invalid management token" });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(UpdatePublicSubscriptionPreferencesResponse.parse(publicPreferences(preferences as Record<string, unknown>)));
  });

  router.post("/public/subscriptions/code", dependencies.verificationRateLimit, async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    const parsed = RequestSubscriptionCodeBody.safeParse(normalizeEmailBody(req.body));
    if (!parsed.success || !hasOnlyKeys(req.body, ["email"])) {
      res.status(400).json({ error: "Invalid request" }); return;
    }
    try {
      res.json(RequestSubscriptionCodeResponse.parse(await dependencies.verification.request(parsed.data.email)));
    } catch {
      req.log?.warn("Subscription verification delivery unavailable");
      res.status(503).json({ error: "Code delivery is unavailable. Please try again later or contact us." });
    }
  });

  router.post("/public/subscriptions/code/verify", dependencies.verificationRateLimit, async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    const parsed = VerifySubscriptionCodeBody.safeParse(normalizeEmailBody(req.body));
    if (!parsed.success || !hasOnlyKeys(req.body, ["email", "code"])) {
      res.status(400).json({ error: "Invalid request" }); return;
    }
    try {
      const result = await dependencies.verification.verify(parsed.data.email, parsed.data.code);
      if (!result) { res.status(401).json({ error: "Invalid or expired code" }); return; }
      res.json(VerifySubscriptionCodeResponse.parse(result));
    } catch {
      req.log?.warn("Subscription verification unavailable");
      res.status(503).json({ error: "Service temporarily unavailable" });
    }
  });

  router.post("/public/subscriptions/verified/preferences", dependencies.preferencesRateLimit, async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    const parsed = GetVerifiedSubscriptionPreferencesBody.safeParse(req.body);
    if (!parsed.success || !hasOnlyKeys(req.body, ["accessToken"])) {
      res.status(400).json({ error: "Invalid request" }); return;
    }
    try {
      const result = await dependencies.verification.getPreferences(parsed.data.accessToken);
      if (!result) { res.status(401).json({ error: "Verification expired" }); return; }
      res.json(GetVerifiedSubscriptionPreferencesResponse.parse(publicPreferences(result as Record<string, unknown>)));
    } catch {
      req.log?.warn("Subscription preference lookup unavailable");
      res.status(503).json({ error: "Service temporarily unavailable" });
    }
  });

  router.put("/public/subscriptions/verified/preferences", dependencies.preferencesRateLimit, async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    const parsed = UpdateVerifiedSubscriptionPreferencesBody.safeParse(req.body);
    if (!parsed.success || !hasOnlyKeys(req.body, [
      "accessToken", "name", "craft", "careerLevel", "location", "acquisitionSource",
       "acquisitionDetail", "acquisitionDetailDeclined", "interests", "contentTypes", "careerLevels", "crafts", "allOpportunities", "websitePurposes", "websitePurposeOther",
    ]) || parsed.data.contentTypes?.includes("content")) {
      res.status(400).json({ error: "Invalid request" }); return;
    }
    const { accessToken, ...preferences } = parsed.data;
    try {
      const result = await dependencies.verification.updatePreferences(accessToken, preferences);
      if (!result) { res.status(401).json({ error: "Verification expired" }); return; }
      res.json(UpdateVerifiedSubscriptionPreferencesResponse.parse(publicPreferences(result as Record<string, unknown>)));
    } catch (error) {
      if (error instanceof InvalidReferralPreferencesError || error instanceof InvalidWebsitePurposesError) {
        res.status(400).json({ error: error.message }); return;
      }
      req.log?.warn("Subscription preference update unavailable");
      res.status(503).json({ error: "Service temporarily unavailable" });
    }
  });

  router.post("/public/subscriptions/verified/unsubscribe", dependencies.unsubscribeRateLimit, async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    const parsed = UnsubscribeVerifiedSubscriptionBody.safeParse(req.body);
    if (!parsed.success || !hasOnlyKeys(req.body, ["accessToken"])) {
      res.status(400).json({ error: "Invalid request" }); return;
    }
    try {
      if (!await dependencies.verification.unsubscribe(parsed.data.accessToken)) {
        res.status(401).json({ error: "Verification expired" }); return;
      }
      res.json(UnsubscribeVerifiedSubscriptionResponse.parse({ message: "Your subscription has been stopped." }));
    } catch {
      req.log?.warn("Subscription unsubscribe unavailable");
      res.status(503).json({ error: "Service temporarily unavailable" });
    }
  });

  return router;
}

export default createPublicSubscriptionsRouter();