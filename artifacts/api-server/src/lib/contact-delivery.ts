import { emailAddress, resendTransport } from "./resend-transport";
import type { ContactEnquiryInput } from "@workspace/api-zod";
import { SubmitContactEnquiryBody } from "@workspace/api-zod";

export const CONTACT_RECIPIENT = "admin@HETVopportunities.com";

export function contactRecipient(): string {
  return emailAddress(process.env.CONTACT_ENQUIRY_TO ?? CONTACT_RECIPIENT, "CONTACT_ENQUIRY_TO");
}

type ProxyOptions = {
  method: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
};
type ProxyResponse = { ok: boolean; status: number; json(): Promise<unknown> };
type Proxy = (path: string, options: ProxyOptions) => Promise<ProxyResponse>;

export function createContactDelivery(options: {
  proxy?: Proxy;
  from?: () => string | undefined;
  to?: () => string | undefined;
  now?: () => number;
} = {}) {
  const proxy = options.proxy ?? resendTransport;
  // Intentionally no subscription-sender fallback: configuring this address
  // represents specific owner approval for sending contact enquiries.
  const from = options.from ?? (() => process.env["CONTACT_ENQUIRY_FROM"]);
  const now = options.now ?? Date.now;
  let verifiedDomain = "";
  let verifiedUntil = 0;

  return {
    async send(input: ContactEnquiryInput): Promise<void> {
      const sender = SubmitContactEnquiryBody.shape.email.safeParse(from()?.trim());
      if (!sender.success) throw new Error("Contact sender approval is required");
      const recipient = emailAddress(
        options.to ? options.to() : contactRecipient(),
        "CONTACT_ENQUIRY_TO",
      );
      const domain = sender.data.split("@")[1].toLowerCase();
      if (verifiedDomain !== domain || verifiedUntil <= now()) {
        const response = await proxy("/domains", { method: "GET", signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error("Contact sender verification unavailable");
        const body = await response.json() as { data?: Array<{ name?: string; status?: string }> };
        if (!Array.isArray(body?.data) || !body.data.some(d => d.name?.toLowerCase() === domain && d.status === "verified")) {
          throw new Error("Contact sender domain is not verified");
        }
        verifiedDomain = domain;
        verifiedUntil = now() + 5 * 60_000;
      }
      const response = await proxy("/emails", {
        method: "POST",
        signal: AbortSignal.timeout(15_000),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `hetv-contact/${input.requestId}`,
        },
        body: JSON.stringify({
          from: `HETV Opportunities Hub <${sender.data}>`,
          to: [recipient],
          reply_to: input.email,
          subject: `HETV contact: ${input.subject}`,
          text: `Contact enquiry from HETV Opportunities Hub\n\nName: ${input.name}\nEmail: ${input.email}\nSubject: ${input.subject}\n\n${input.message}\n\nThis is a contact enquiry, not a newsletter subscription or a role/course application.`,
        }),
      });
      if (!response.ok) throw new Error("Contact provider rejected the enquiry");
      const body = await response.json() as { id?: unknown };
      if (typeof body?.id !== "string" || !body.id.trim()) throw new Error("Contact provider did not confirm acceptance");
    },
  };
}
