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
};
export type ResendResponse = { ok: boolean; status: number; json(): Promise<unknown> };
export type ResendTransport = (path: string, options: ResendRequest) => Promise<ResendResponse>;

export function createResendTransport(options: {
  env?: () => NodeJS.ProcessEnv;
  fetch?: typeof fetch;
  timeoutMs?: number;
} = {}): ResendTransport {
  return async (path, init) => {
    const key = (options.env?.() ?? process.env).RESEND_API_KEY?.trim();
    if (!key || !/^re_[A-Za-z0-9_-]+$/.test(key)) throw new Error("RESEND_API_KEY is missing or invalid");
    if (path !== "/emails" && path !== "/domains") throw new Error("Unsupported Resend request");
    const timeout = AbortSignal.timeout(options.timeoutMs ?? 15_000);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    try {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${key}`);
      headers.set("Content-Type", "application/json");
      const response = await (options.fetch ?? fetch)(`https://api.resend.com${path}`, {
        ...init, headers, signal, redirect: "error",
      });
      // Consume within the timeout; never expose provider bodies (which may contain PII).
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`Resend request rejected (${response.status})`);
      }
      const body: unknown = await response.json();
      return { ok: true, status: response.status, json: async () => body };
    } catch {
      throw new Error("Resend request failed; check configuration, permissions, quota, and connectivity");
    }
  };
}

export const resendTransport = createResendTransport();

export async function sendResendEmail(
  message: { from: string; to: string[]; subject: string; text: string; reply_to?: string },
  idempotencyKey?: string,
  transport: ResendTransport = resendTransport,
): Promise<string> {
  emailAddress(message.from, "Email sender", true);
  if (!message.to.length) throw new Error("Email recipient is missing");
  message.to.forEach(address => emailAddress(address, "Email recipient"));
  if (message.reply_to) emailAddress(message.reply_to, "Email reply-to");
  const response = await transport("/emails", {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    body: JSON.stringify(message),
  });
  if (!response.ok) throw new Error("Resend rejected email");
  const body = await response.json() as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id.trim()) throw new Error("Resend did not confirm acceptance");
  return body.id;
}
