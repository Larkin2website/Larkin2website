import { Router, type RequestHandler } from "express";
import {
  CreatePublicSubscriptionBody,
  CreatePublicSubscriptionResponse,
  UnsubscribePublicSubscriptionBody,
  UnsubscribePublicSubscriptionResponse,
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
  };
}

const signupRateLimit = createFixedWindowRateLimit({
  limit: 8,
  windowMs: 15 * 60 * 1000,
});
const unsubscribeRateLimit = createFixedWindowRateLimit({
  limit: 30,
  windowMs: 15 * 60 * 1000,
});

export function createPublicSubscriptionsRouter(
  overrides: Partial<PublicSubscriptionRouteDependencies> = {},
) {
  const dependencies: PublicSubscriptionRouteDependencies = {
    service: publicSubscriptionService,
    signupRateLimit,
    unsubscribeRateLimit,
    ...overrides,
  };
  const router = Router();

  router.post("/public/subscriptions", dependencies.signupRateLimit, async (req, res): Promise<void> => {
    const parsed = CreatePublicSubscriptionBody.safeParse(normalizeSignupBody(req.body));
    if (
      !hasOnlyKeys(req.body, ["email", "consent", "existingManagementToken"])
      || !parsed.success
    ) {
      res.status(400).json({ error: "Invalid request" });
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

  return router;
}

export default createPublicSubscriptionsRouter();