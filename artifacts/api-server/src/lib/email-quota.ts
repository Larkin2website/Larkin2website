import { createHash, randomUUID } from "node:crypto";
import { budgetFailure, effectiveWindow, parseUsage, SAFE_REPLAY_MS, USAGE_REFRESH_MS, type EmailPurpose,
  type EmailReservation, type QuotaState, type QuotaStore, type QuotaTransaction } from "./email-quota-core";
import { EmailDeliveryError } from "./resend-errors";
import { emailAddress, resendApi, type ResendRequest, type ResendResponse, type ResendTransport } from "./resend-transport";
import { drizzleQuotaStore } from "./email-quota-store";
import { logger } from "./logger";
import { isTemporaryTestLoginEnabled } from "./development-session";
import type { GetCrmEmailHealthResponse } from "@workspace/api-zod";
type CrmEmailHealth = (typeof GetCrmEmailHealthResponse)["_output"];

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const integer = (value: string | undefined, fallback: number, max: number) => {
  const n = Number(value);
  return value?.trim() && Number.isInteger(n) && n >= 0 && n <= max ? n : fallback;
};

export function createEmailQuotaService(options: {
  store: QuotaStore; transport: ResendTransport; env?: () => NodeJS.ProcessEnv; now?: () => Date;
}) {
  const env = options.env ?? (() => process.env);
  const now = options.now ?? (() => new Date());
  function config() {
    const settings = env();
    const key = settings.RESEND_API_KEY?.trim();
    const account = settings.RESEND_ACCOUNT_ID?.trim();
    if (!key || !/^re_[A-Za-z0-9_-]+$/.test(key) || !account || !/^[a-zA-Z0-9_-]{1,100}$/.test(account)) {
      throw new EmailDeliveryError("unconfigured");
    }
    return {
      account, credentialTag: digest(key),
      reserves: {
        admin: integer(settings.EMAIL_ADMIN_RESERVE, 1, 50),
        transactional: integer(settings.EMAIL_TRANSACTIONAL_RESERVE, 5, 1000),
      },
    };
  }
  function noticeConfig() {
    try {
      return {
        from: emailAddress(env().EMAIL_ADMIN_FROM, "EMAIL_ADMIN_FROM", true),
        to: emailAddress(env().EMAIL_ADMIN_TO ?? "admin@HETVopportunities.com", "EMAIL_ADMIN_TO"),
      };
    } catch { return undefined; }
  }
  async function refresh(tx: QuotaTransaction, credentialTag: string, at: Date) {
    const changed = tx.state.snapshot && tx.state.snapshot.credentialTag !== credentialTag;
    if (changed) {
      tx.state.snapshot = undefined;
      tx.state.lastCheckAt = undefined;
    }
    if (tx.state.lastCheckAt && at.getTime() - Date.parse(tx.state.lastCheckAt) < USAGE_REFRESH_MS) return;
    tx.state.lastCheckAt = at.toISOString();
    try {
      const response = await options.transport("/usage", { method: "GET", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new EmailDeliveryError("unavailable");
      tx.state.snapshot = parseUsage(await response.json(), now(), credentialTag);
      const snapshot = tx.state.snapshot;
      snapshot.localAccepted = {
        daily: tx.reservations.filter(row => row.status === "accepted" && row.dailyReset === snapshot.daily.resetsAt)
          .reduce((sum, row) => sum + row.count, 0),
        monthly: tx.reservations.filter(row => row.status === "accepted" && row.monthlyReset === snapshot.monthly.resetsAt)
          .reduce((sum, row) => sum + row.count, 0),
      };
      // A new provider snapshot confirms resets/upgrades. Local reservations still apply.
      tx.state.block = undefined;
    } catch (error) {
      const failure = error instanceof EmailDeliveryError ? error : new EmailDeliveryError("unavailable");
      const code = failure.code === "unavailable" && tx.state.snapshot
        && at.getTime() - Date.parse(tx.state.snapshot.sampledAt) > 120_000 ? "stale" : failure.code;
      tx.state.block = { code, until: (failure.retryAt ?? new Date(at.getTime() + USAGE_REFRESH_MS)).toISOString() };
    }
  }
  function classify(init: ResendRequest): EmailPurpose {
    if (init.purpose) return init.purpose;
    const key = new Headers(init.headers).get("Idempotency-Key") ?? "";
    if (key.startsWith("publication-sample-") || key.startsWith("publication-test-")) return "test";
    return key.startsWith("publication-") ? "publication" : "transactional";
  }
  async function dispatch(path: string, init: ResendRequest): Promise<ResendResponse> {
    const cfg = config();
    if (path !== "/emails" || init.method !== "POST" || !init.body) throw new EmailDeliveryError("unconfigured");
    const body = JSON.parse(init.body) as { to?: unknown };
    if (!Array.isArray(body.to) || !body.to.length || body.to.some(item => typeof item !== "string")) {
      throw new EmailDeliveryError("unconfigured");
    }
    const recipientCount = body.to.length;
    const purpose = classify(init);
    // Every send has a stable key, including one-off codes; only its digest is stored.
    const headers = new Headers(init.headers);
    const providerKey = headers.get("Idempotency-Key") ?? `transactional-${randomUUID()}`;
    const key = digest(providerKey);
    const fingerprint = digest(init.body);
    const at = now();
    let decision: { row?: EmailReservation; error?: EmailDeliveryError; reference?: string };
    try {
      decision = await options.store.lock(cfg.account, key, async tx => {
        const existing = await tx.get(key);
        if (existing && existing.fingerprint !== fingerprint) return { error: new EmailDeliveryError("unknown") };
        if (existing?.status === "accepted" && existing.reference) return { reference: existing.reference };
        if (existing && (existing.status === "pending" || existing.status === "ambiguous")) {
          if (at.getTime() - existing.createdAt.getTime() >= SAFE_REPLAY_MS) {
            return { error: new EmailDeliveryError("unknown", undefined, true) };
          }
          if (existing.status === "pending" && at.getTime() - existing.updatedAt.getTime() < 30_000) {
            return { error: new EmailDeliveryError("rate_limited", new Date(existing.updatedAt.getTime() + 30_000)) };
          }
        }
        await refresh(tx, cfg.credentialTag, at);
        // Replays already have capacity reserved; do not reserve them twice.
        const replay = existing && (existing.status === "pending" || existing.status === "ambiguous");
        const failure = budgetFailure(tx.state, tx.reservations, at, purpose, replay ? 0 : recipientCount, replay
          ? { admin: 0, transactional: 0 } : cfg.reserves);
        if (failure) return { error: failure };
        if (tx.state.nextRequestAt && Date.parse(tx.state.nextRequestAt) > at.getTime()) {
          return { error: new EmailDeliveryError("rate_limited", new Date(tx.state.nextRequestAt)) };
        }
        // Space all sends across workers; request throttles are not quota exhaustion.
        tx.state.nextRequestAt = new Date(at.getTime() + 1000).toISOString();
        const row: EmailReservation = {
          id: key, fingerprint, count: recipientCount, status: "pending", reference: null,
          dailyReset: tx.state.snapshot!.daily.resetsAt, monthlyReset: tx.state.snapshot!.monthly.resetsAt,
          createdAt: replay ? existing.createdAt : at, updatedAt: at,
        };
        await tx.put(row);
        return { row };
      });
    } catch { throw new EmailDeliveryError("unavailable"); }
    if (decision.error) throw decision.error;
    if (decision.reference) return { ok: true, status: 200, json: async () => ({ id: decision.reference }) };
    const row = decision.row!;
    headers.set("Idempotency-Key", providerKey);
    try {
      if (init.notAfter && now() >= init.notAfter) throw new EmailDeliveryError("unavailable");
      const response = await options.transport(path, {
        ...init, headers: Object.fromEntries(headers.entries()),
      });
      if (!response.ok) throw new EmailDeliveryError("unavailable", undefined, true);
      const result = await response.json() as { id?: unknown } | null;
      if (typeof result?.id !== "string" || !result.id.trim()) throw new EmailDeliveryError("unknown", undefined, true);
      // Commit acceptance separately. If this fails, the committed pending hold survives.
      try {
        await options.store.lock(cfg.account, key, async tx => {
          await tx.put({ ...row, status: "accepted", reference: result.id as string, updatedAt: now() });
        });
      } catch { throw new EmailDeliveryError("unknown", undefined, true); }
      return { ok: true, status: response.status, json: async () => result };
    } catch (error) {
      const failure = error instanceof EmailDeliveryError ? error : new EmailDeliveryError("unknown", undefined, true);
      try {
        await options.store.lock(cfg.account, key, async tx => {
          // Never overwrite a committed acceptance with a late failure.
          if ((await tx.get(key))?.status === "accepted") return;
          await tx.put({ ...row, status: failure.uncertain ? "ambiguous" : "rejected", updatedAt: now() });
          if (failure.code !== "unknown") {
            let until = failure.retryAt ?? new Date(now().getTime() + USAGE_REFRESH_MS);
            if (failure.code === "daily_limit" && tx.state.snapshot) until = new Date(tx.state.snapshot.daily.resetsAt);
            if (failure.code === "monthly_limit" && tx.state.snapshot) until = new Date(tx.state.snapshot.monthly.resetsAt);
            tx.state.block = { code: failure.code, until: until.toISOString() };
          }
        });
      } catch { /* A pending hold is safer than releasing possibly accepted capacity. */ }
      throw failure;
    }
  }

  async function health(): Promise<CrmEmailHealth> {
    const empty: CrmEmailHealth = {
      status: "unconfigured", message: new EmailDeliveryError("unconfigured").message,
      daily: { used: 0, limit: 100, remaining: null, resetsAt: null },
      monthly: { used: 0, limit: 3000, remaining: null, resetsAt: null },
      lastSyncedAt: null, retryAt: null, deferredCount: 0,
      adminNotice: noticeConfig() ? "waiting" : "not_configured", billingUrl: "https://resend.com/settings/billing",
    };
    let cfg: ReturnType<typeof config>;
    try { cfg = config(); } catch { return empty; }
    try {
      return await options.store.lock(cfg.account, undefined, async tx => {
        const at = now();
        await refresh(tx, cfg.credentialTag, at);
        const snapshot = tx.state.snapshot;
        const failure = budgetFailure(tx.state, tx.reservations, at, "publication", 1, cfg.reserves);
        const daily = snapshot ? effectiveWindow(snapshot, tx.reservations, "daily") : empty.daily;
        const monthly = snapshot ? effectiveWindow(snapshot, tx.reservations, "monthly") : empty.monthly;
        const threshold = integer(env().EMAIL_WARNING_PERCENT, 80, 99) || 80;
        const warning = [daily, monthly].some(w => w.limit !== null && w.limit > 0 && w.used / w.limit >= threshold / 100);
        return {
          ...empty, daily, monthly,
          lastSyncedAt: snapshot?.sampledAt ?? null,
          status: failure?.code ?? (warning ? "warning" : "ready"),
          message: failure?.message ?? (warning
            ? "Email usage is approaching its allowance. Upgrade your Resend plan if you need to send more."
            : "The provider allowance is confirmed. Some capacity is reserved for essential mail and the admin warning."),
          retryAt: failure?.retryAt?.toISOString() ?? null,
          adminNotice: !noticeConfig() ? "not_configured" : tx.state.notice?.status ?? "waiting",
        };
      });
    } catch { return { ...empty, status: "unavailable", message: new EmailDeliveryError("unavailable").message }; }
  }

  async function sendAdminWarning(): Promise<void> {
    const notice = noticeConfig();
    if (!notice) return;
    const status = await health();
    if (!["warning", "daily_limit", "monthly_limit"].includes(status.status) || !status.lastSyncedAt) return;
    const threshold = integer(env().EMAIL_WARNING_PERCENT, 80, 99) || 80;
    const monthlyWarning = status.monthly.limit !== null && status.monthly.limit > 0
      && status.monthly.used / status.monthly.limit >= threshold / 100;
    const period = `${monthlyWarning ? "monthly" : "daily"}-${monthlyWarning ? status.monthly.resetsAt : status.daily.resetsAt}`;
    const cfg = config();
    const key = `quota-warning-${digest(period).slice(0, 32)}`;
    // Payload is stable for its entire idempotency period, even as usage changes.
    const body = JSON.stringify({
      from: notice.from, to: [notice.to], subject: "HETV email allowance: action may be required",
      text: `HETV email usage is approaching or has reached its ${monthlyWarning ? "monthly" : "daily"} allowance. Subscriber alerts pause safely when their available budget is exhausted. Upgrade your Resend plan at https://resend.com/settings/billing if you want additional mails sent now, or wait for the allowance to reset. Open CRM Communications for current usage, reserved capacity, deferred alerts and the latest provider status. This warning also uses the shared email allowance.`,
    });
    const shouldSend = await options.store.lock(cfg.account, undefined, async tx => {
      if (tx.state.notice?.period === period && tx.state.notice.status === "accepted") return false;
      tx.state.notice = { period, status: "waiting" };
      return true;
    });
    if (!shouldSend) return;
    try {
      await dispatch("/emails", { method: "POST", body, purpose: "admin", headers: { "Idempotency-Key": key } });
      await options.store.lock(cfg.account, undefined, async tx => { tx.state.notice = { period, status: "accepted" }; });
    } catch {
      await options.store.lock(cfg.account, undefined, async tx => { tx.state.notice = { period, status: "unavailable" }; });
    }
  }
  return { dispatch, health, sendAdminWarning };
}

export const emailQuotaService = createEmailQuotaService({ store: drizzleQuotaStore, transport: resendApi });
export function startEmailQuotaWorker() {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await emailQuotaService.health();
      if (!isTemporaryTestLoginEnabled()) await emailQuotaService.sendAdminWarning();
    } catch { logger.warn("Email quota monitoring unavailable"); }
    finally { busy = false; }
  };
  const timer = setInterval(() => { void tick(); }, USAGE_REFRESH_MS);
  timer.unref();
  void tick();
}
