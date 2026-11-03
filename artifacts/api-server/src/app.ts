import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { validatePortalDemoMode } from "./lib/portal-demo";
import { customDomainRedirect } from "./middlewares/custom-domain-redirect";
import { clerkConfigured, externalClerk } from "./lib/clerk-config";
import { mountProductionFrontends } from "./lib/production-frontends";
import { allowedProductionHosts } from "./lib/production-hosts";

validatePortalDemoMode();

const app: Express = express();

if (process.env.RENDER === "true") app.set("trust proxy", 1);
if (externalClerk()) app.use(allowedProductionHosts());
app.use(customDomainRedirect);
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
if (!externalClerk()) app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
// Webhook verification requires the exact bytes Resend signed, before JSON parsing.
app.use("/api/webhooks/resend", express.raw({ type: "application/json", limit: "64kb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (!externalClerk() || clerkConfigured()) app.use(
  clerkMiddleware((req) => ({
    publishableKey: externalClerk() ? process.env.CLERK_PUBLISHABLE_KEY : publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);
app.use("/api", (_req, res) => { res.status(404).json({ error: "API endpoint not found" }); });
if (process.env.SERVE_STATIC_APPS === "true") mountProductionFrontends(app);

export default app;
