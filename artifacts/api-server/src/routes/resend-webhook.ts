import { Router } from "express";
import { parseResendEvent, recordProviderEvent, verifyResendSignature } from "../lib/provider-delivery-events";

export function createResendWebhookRouter(record = recordProviderEvent, secret = () => process.env.RESEND_WEBHOOK_SECRET) {
  const router = Router();
  router.post("/webhooks/resend", async (req, res): Promise<void> => {
    if (!secret()) {
      res.status(503).json({ error: "Webhook verification unavailable" });
      return;
    }
    const id = req.get("svix-id");
    if (!verifyResendSignature(req.body, {
      id, timestamp: req.get("svix-timestamp"), signature: req.get("svix-signature"),
    }, secret())) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }
    const event = parseResendEvent(req.body, id!);
    if (!event) {
      // Resend sends other event types; do not retry events we do not consume.
      let payload: unknown;
      try { payload = JSON.parse((req.body as Buffer).toString("utf8")); } catch { /* malformed */ }
      if (payload && typeof payload === "object" && "type" in payload
        && typeof payload.type === "string" && !["email.delivered", "email.bounced", "email.complained"].includes(payload.type)) {
        res.sendStatus(204);
      } else {
        res.status(400).json({ error: "Invalid webhook payload" });
      }
      return;
    }
    const matched = await record(event);
    if (!matched) req.log?.info({ eventId: event.id }, "Provider event pending outbox reference or already applied");
    res.sendStatus(204);
  });
  return router;
}

export default createResendWebhookRouter();