import { EmailDeliveryError } from "./resend-errors";
import type { EmailPurpose } from "./email-quota-core";
/** Server-only runtime configuration. Never fall back to a connector or another sender. */
export function emailAddress(value: string | undefined, setting: string, displayName = false): string {
  const address = value?.trim();
  if (!address || /[\r\n]/.test(address)) throw new Error(`${setting} is missing or invalid`);
  const mailbox = displayName && address.includes("<")
    ? address.match(/^[^<>]+<([^<>]+)>$/)?.[1] : address;
  if (!mailbox || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(mailbox)) {
    throw new Error(`${setting} is missing or invalid`);
  }
  return address;
}

export type ResendRequest = {
  method: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  purpose?: EmailPurpose;
  notAfter?: Date;
};
export type ResendResponse = {
  ok: boolean; status: number; retryAfterMs?: number;
  quotaUsed?: { daily?: number; monthly?: number };
  json(): Promise<unknown>;
};
export type ResendTransport = (path: string, options: ResendRequest) => Promise<ResendResponse>;

export function createResendTransport(options: {
  env?: () => NodeJS.ProcessEnv;
  fetch?: typeof fetch;
  timeoutMs?: number;
} = {}): ResendTransport {
  return async (path, init) => {
    const key = (options.env?.() ?? process.env).RESEND_API_KEY?.trim();
    if (!key || !/^re_[A-Za-z0-9_-]+$/.test(key)) throw new EmailDeliveryError("unconfigured");
    if (path !== "/emails" && path !== "/domains" && path !== "/usage") throw new Error("Unsupported Resend request");
    const timeout = AbortSignal.timeout(options.timeoutMs ?? 15_000);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    try {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${key}`);
      headers.set("Content-Type", "application/json");
      const { purpose: _purpose, notAfter: _notAfter, ...request } = init;
      const response = await (options.fetch ?? fetch)(`https://api.resend.com${path}`, {
        ...request, headers, signal, redirect: "error",
      });
      // Consume within the timeout; never expose provider bodies (which may contain PII).
      if (!response.ok) {
        let name: unknown;
        try { name = (await response.json() as { name?: unknown } | null)?.name; } catch { /* Ignore raw provider content. */ }
        const retry = Number(response.headers.get("retry-after") ?? response.headers.get("ratelimit-reset"));
        const retryAt = new Date(Date.now() + (Number.isFinite(retry) && retry > 0 ? Math.min(retry, 86400) * 1000 : 60_000));
        const code = name === "daily_quota_exceeded" ? "daily_limit"
          : name === "monthly_quota_exceeded" ? "monthly_limit"
          : response.status === 429 ? "rate_limited"
          : response.status === 401 || response.status === 403 || (response.status === 400 && name === "validation_error")
            ? "unconfigured" : response.status === 409 ? "unknown" : "unavailable";
        throw new EmailDeliveryError(code, retryAt, response.status >= 500 || response.status === 409);
      }
      const body: unknown = await response.json();
      const used = (name: string) => {
        const raw = response.headers.get(name);
        const n = raw === null ? NaN : Number(raw);
        return Number.isSafeInteger(n) && n >= 0 ? n : undefined;
      };
      return {
        ok: true, status: response.status,
        quotaUsed: { daily: used("x-resend-daily-quota"), monthly: used("x-resend-monthly-quota") },
        json: async () => body,
      };
    } catch (error) {
      if (error instanceof EmailDeliveryError) throw error;
      throw new EmailDeliveryError("unavailable", undefined, path === "/emails");
    }
  };
}

export const resendApi = createResendTransport();
export const resendTransport: ResendTransport = async (path, init) => {
  if (path !== "/emails") return resendApi(path, init);
  const { emailQuotaService } = await import("./email-quota");
  return emailQuotaService.dispatch(path, init);
};

export async function sendResendEmail(
  message: { from: string; to: string[]; subject: string; text: string; reply_to?: string },
  idempotencyKey?: string,
  transport: ResendTransport = resendTransport,
  purpose?: EmailPurpose,
): Promise<string> {
  emailAddress(message.from, "Email sender", true);
  if (!message.to.length) throw new Error("Email recipient is missing");
  message.to.forEach(address => emailAddress(address, "Email recipient"));
  if (message.reply_to) emailAddress(message.reply_to, "Email reply-to");
  const response = await transport("/emails", {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    body: JSON.stringify(message),
    purpose,
  });
  if (!response.ok) throw new Error("Resend rejected email");
  const body = await response.json() as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id.trim()) throw new EmailDeliveryError("unknown", undefined, true);
  return body.id;
}
