/**
 * Explicit operator-only, bounded live delivery smoke check.
 * Never imported at startup. Does not create subscribers, staff accounts, or campaigns.
 */
import { createHash } from "node:crypto";
import { pool } from "@workspace/db";
import { createContactDelivery } from "../lib/contact-delivery";
import { sendSubscriptionCode } from "../lib/subscription-email-verification";
import { publicationMessage, publicationSampleMessage, sendPublicationEmail } from "../lib/publication-delivery";
import { emailAddress, resendApi, resendTransport, sendResendEmail, type ResendTransport } from "../lib/resend-transport";
import { emailQuotaService } from "../lib/email-quota";
import { logger } from "../lib/logger";

async function main() {
  if (process.env.APPROVE_EMAIL_SMOKE_TEST !== "true") throw new Error("Explicit email smoke approval is required");
  const to = emailAddress(process.env.PUBLICATION_TEST_EMAIL, "PUBLICATION_TEST_EMAIL");
  const admin = emailAddress(process.env.EMAIL_ADMIN_TO, "EMAIL_ADMIN_TO");
  const run = process.argv[2];
  if (!run || !/^[a-zA-Z0-9_-]{1,60}$/.test(run)) throw new Error("Supply a stable run label; reuse it to avoid duplicate sends");
  const settings = ["CONTACT_ENQUIRY_FROM", "SUBSCRIPTION_VERIFICATION_FROM", "PUBLICATION_EMAIL_FROM", "STAFF_AUTH_FROM", "EMAIL_ADMIN_FROM"] as const;
  const domains = await (await resendApi("/domains", { method: "GET" })).json() as { data?: { name?: string; status?: string }[] };
  for (const key of settings) {
    const sender = emailAddress(process.env[key], key);
    if (!domains.data?.some(d => d.name?.toLowerCase() === sender.split("@")[1].toLowerCase() && d.status === "verified")) {
      throw new Error("An approved sender domain is not verified");
    }
  }
  const health = await emailQuotaService.health();
  if (!["ready", "warning"].includes(health.status)) throw new Error("Provider quota is not ready");
  logger.info({ daily: health.daily, monthly: health.monthly }, "Live email smoke allowance preflight");
  const siteUrl = process.env.PUBLIC_OPPORTUNITIES_URL;
  if (!siteUrl || new URL(siteUrl).protocol !== "https:") throw new Error("An approved HTTPS public URL is required");
  let label = "", recipient = to;
  const results: { service: string; providerReference: string }[] = [];
  const transport: ResendTransport = async (path, init) => {
    if (path !== "/emails") return resendTransport(path, init);
    const message = JSON.parse(init.body!) as { to: string[]; subject: string; text: string };
    message.to = [recipient];
    message.subject = `[TEST ${run}] ${label}: ${message.subject}`;
    message.text = `CONTROLLED DELIVERY TEST: ${label}.\nOnly the approved test mailbox receives this message. Codes and staff links in these samples do not activate accounts or change data.\n\n${message.text}`;
    const key = createHash("sha256").update(`${run}:${label}:${recipient}`).digest("hex");
    const response = await resendTransport(path, { ...init, body: JSON.stringify(message),
      headers: { ...init.headers, "Idempotency-Key": `email-smoke-${key}` }, purpose: "test" });
    const body = await response.json() as { id?: unknown };
    if (typeof body.id !== "string") throw new Error("No provider acceptance reference");
    results.push({ service: label, providerReference: body.id });
    logger.info({ service: label, providerReference: body.id }, "Live email smoke accepted (not inbox confirmation)");
    // Avoid provider burst limits across the bounded sequence.
    await new Promise(resolve => setTimeout(resolve, 1100));
    return response;
  };
  const sample = async (service: string, from: string, subject: string, text: string) => {
    label = service;
    await sendResendEmail({ from, to: [recipient], subject, text }, undefined, transport, "test");
  };
  label = "Contact enquiry";
  await createContactDelivery({ proxy: transport, to: () => to }).send({
    requestId: `smoke-${run}`, name: "Controlled email test", email: to,
    subject: "Delivery configuration check", message: "Test enquiry only. No reply or action is required.",
  });
  label = "Subscription verification";
  // Actual rendering/transport, but no database challenge is issued.
  await sendSubscriptionCode(to, "000000", { transport });
  const config = { from: process.env.PUBLICATION_EMAIL_FROM!, siteUrl, testEmail: to };
  for (const kind of ["role", "programme"] as const) {
    label = kind === "role" ? "Role publication alert" : "Programme publication alert";
    await sendPublicationEmail(publicationMessage({
      id: `smoke-${kind}`, kind, title: `Sample ${kind} — delivery test only`,
      slug: `delivery-test-${kind}`, status: "published",
    }, config, to, `publication-sample-${run}-${kind}`, true), transport);
  }
  label = "CRM publication sample";
  await sendPublicationEmail(publicationSampleMessage(config), transport);
  await sample("Staff invitation", process.env.STAFF_AUTH_FROM!, "Your HETV staff invitation",
    "You have been invited to the HETV staff workspace.\n\nThis is an invitation delivery sample only. A live, single-use password setup link is deliberately omitted. No staff access has been granted.");
  await sample("Staff password reset", process.env.STAFF_AUTH_FROM!, "Reset your HETV staff password",
    "This is a password-reset delivery sample only. A live, single-use reset link is deliberately omitted. No password reset was requested and no password was changed.");
  await sample("Administrator quota warning", process.env.EMAIL_ADMIN_FROM!, "HETV email allowance: action may be required",
    "SIMULATED WARNING ONLY — the account is not being reported as exhausted.\n\nWhen usage approaches or reaches its daily or monthly allowance, subscriber alerts pause safely. Upgrade your Resend plan at https://resend.com/settings/billing if additional capacity is needed, or wait for the allowance to reset. This delivery sample does not alter quota or warning state.");
  recipient = admin;
  await sample("Administrator mailbox check", process.env.EMAIL_ADMIN_FROM!, "HETV administrator email delivery check",
    "One approved test message to the administrator mailbox. The separate service samples were directed only to the configured developer test mailbox. No subscribers were emailed by this smoke check.");
  logger.info({ results, webhookSecretConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET) },
    "Email smoke complete; receipt and actual signed callback checks remain separate");
}

try { await main(); }
catch (error) {
  logger.error({ code: (error as { code?: string }).code ?? "smoke_check_failed" },
    "Email smoke stopped safely. Check configuration and accepted references before retrying the same run label.");
  process.exitCode = 1;
} finally { await pool.end(); }
