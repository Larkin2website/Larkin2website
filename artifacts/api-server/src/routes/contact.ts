import { createHash } from "node:crypto";
import { Router, type RequestHandler } from "express";
import { SubmitContactEnquiryBody, SubmitContactEnquiryResponse } from "@workspace/api-zod";
import type { ContactEnquiryInput } from "@workspace/api-zod";
import { createContactDelivery, contactRecipient, CONTACT_RECIPIENT } from "../lib/contact-delivery";
import { createFixedWindowRateLimit } from "../middlewares/fixed-window-rate-limit";
import { logger } from "../lib/logger";

const accepted = SubmitContactEnquiryResponse.parse({
  status: "accepted",
  message: "Your message has been accepted for delivery to the HETV team.",
});
function unavailable(): string {
  let recipient = CONTACT_RECIPIENT;
  try { recipient = contactRecipient(); } catch { /* Keep the approved public contact if config is invalid. */ }
  return `We couldn’t send your message. Please try again or email ${recipient} directly.`;
}
type Delivery = { send(input: ContactEnquiryInput): Promise<void> };

export function createContactRouter(options: {
  delivery?: Delivery;
  rateLimit?: RequestHandler;
  now?: () => number;
} = {}) {
  const router = Router();
  const delivery = options.delivery ?? createContactDelivery();
  const now = options.now ?? Date.now;
  const rateLimit = options.rateLimit ?? createFixedWindowRateLimit({ limit: 20, windowMs: 15 * 60_000 });
  const emailWindows = new Map<string, { count: number; until: number }>();
  const requests = new Map<string, { fingerprint: string; until: number; promise: Promise<void> }>();
  let globalWindow = { count: 0, until: 0 };

  router.post("/public/contact", rateLimit, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.get("Sec-Fetch-Site") === "cross-site") {
      res.status(403).json({ error: "Please send your enquiry from the HETV contact page." });
      return;
    }
    if (!req.is("application/json")) {
      res.status(400).json({ error: "Please submit a valid contact form." });
      return;
    }
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? Object.fromEntries(Object.entries(req.body).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]))
      : req.body;
    const parsed = SubmitContactEnquiryBody.strict().safeParse(body);
    if (!parsed.success || parsed.data.website ||
        /[\r\n\u0000-\u001f\u007f]/.test(`${parsed.data.name}${parsed.data.email}${parsed.data.subject}`) ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(parsed.data.message)) {
      res.status(400).json({ error: "Please check your name, email, subject and message." });
      return;
    }
    const input = parsed.data;
    const at = now();
    for (const [key, value] of requests) if (value.until <= at) requests.delete(key);
    for (const [key, value] of emailWindows) if (value.until <= at) emailWindows.delete(key);
    const fingerprint = createHash("sha256").update(JSON.stringify({
      name: input.name, email: input.email, subject: input.subject, message: input.message,
    })).digest("hex");
    const existing = requests.get(input.requestId);
    if (existing && existing.fingerprint !== fingerprint) {
      res.status(400).json({ error: "Please use a new request identifier when changing your message." });
      return;
    }
    if (!existing) {
      if (globalWindow.until <= at) globalWindow = { count: 0, until: at + 60 * 60_000 };
      const emailKey = createHash("sha256").update(input.email.toLowerCase()).digest("hex");
      const window = emailWindows.get(emailKey) ?? { count: 0, until: at + 15 * 60_000 };
      if (window.count >= 3 || globalWindow.count >= 60 || requests.size >= 1_000 || emailWindows.size >= 5_000) {
        res.setHeader("Retry-After", Math.max(1, Math.ceil((Math.max(window.until, globalWindow.until) - at) / 1000)));
        res.status(429).json({ error: "Too many enquiries. Please try again later or email the team directly." });
        return;
      }
      window.count++;
      globalWindow.count++;
      emailWindows.set(emailKey, window);
    }
    const entry = existing ?? {
      fingerprint, until: at + 15 * 60_000,
      promise: Promise.resolve().then(() => delivery.send(input)),
    };
    if (!existing) requests.set(input.requestId, entry);
    try {
      await entry.promise;
      res.json(accepted);
    } catch {
      if (requests.get(input.requestId) === entry) requests.delete(input.requestId);
      // Do not log enquiry contents, addresses, provider payloads or credentials.
      logger.warn("Contact enquiry delivery unavailable");
      res.status(503).json({ error: unavailable() });
    }
  });
  return router;
}

export default createContactRouter();
