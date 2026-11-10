import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { staffMailConfig } from "../lib/staff-mail";

const router: IRouter = Router();
router.get("/readyz", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    staffMailConfig();
    if (process.env.EMAIL_WORKERS_ENABLED !== "true" || !process.env.RESEND_API_KEY
      || !process.env.RESEND_ACCOUNT_ID || !process.env.RESEND_WEBHOOK_SECRET) throw new Error("Missing email configuration");
    const query = { text: `SELECT c.user_id,s.token_hash,j.sending_account
      FROM staff_credentials c,staff_sessions s,staff_auth_mail j LIMIT 0`, query_timeout: 2000 };
    await pool.query(query);
    res.json({ message: "Ready" });
  } catch { res.status(503).json({ message: "Not ready" }); }
});

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
