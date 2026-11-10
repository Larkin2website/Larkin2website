import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { customDomainRedirect } from "./middlewares/custom-domain-redirect";
import { mountProductionFrontends } from "./lib/production-frontends";
import { allowedProductionHosts } from "./lib/production-hosts";
import { loadStaffSession, staffMutationProtection } from "./lib/staff-session";
import { productionSecurity } from "./middlewares/production-security";
import { createFixedWindowRateLimit } from "./middlewares/fixed-window-rate-limit";

const app: Express = express();

if (process.env.RENDER === "true") app.set("trust proxy", 1);
app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.use(allowedProductionHosts());
app.use(productionSecurity);
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
// Webhook verification requires the exact bytes Resend signed, before JSON parsing.
app.use("/api/webhooks/resend", express.raw({ type: "application/json", limit: "64kb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api", createFixedWindowRateLimit({ limit: 600, windowMs: 60_000 }));
app.use(loadStaffSession);
app.use(staffMutationProtection);

app.use("/api", router);
app.use("/api", (_req, res) => { res.status(404).json({ error: "API endpoint not found" }); });
if (process.env.SERVE_STATIC_APPS === "true") mountProductionFrontends(app);

export default app;
