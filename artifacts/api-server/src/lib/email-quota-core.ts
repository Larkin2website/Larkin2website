import { EmailDeliveryError, type EmailFailureCode } from "./resend-errors";

export type EmailPurpose = "publication" | "transactional" | "test" | "admin";
export type QuotaWindow = { used: number; limit: number | null; resetsAt: string };
export type QuotaSnapshot = {
  daily: QuotaWindow; monthly: QuotaWindow; sampledAt: string; credentialTag: string;
  localAccepted?: { daily: number; monthly: number };
};
export type QuotaState = {
  snapshot?: QuotaSnapshot;
  lastCheckAt?: string;
  block?: { code: EmailFailureCode; until: string };
  nextRequestAt?: string;
  notice?: { period: string; status: "waiting" | "accepted" | "unavailable" };
};
export type EmailReservation = {
  id: string; fingerprint: string; count: number;
  status: "pending" | "accepted" | "rejected" | "ambiguous";
  reference: string | null; dailyReset: string; monthlyReset: string;
  createdAt: Date; updatedAt: Date;
};
export interface QuotaTransaction {
  state: QuotaState;
  reservations: EmailReservation[];
  get(id: string): Promise<EmailReservation | undefined>;
  put(row: EmailReservation): Promise<void>;
}
export interface QuotaStore {
  lock<T>(account: string, key: string | undefined, run: (tx: QuotaTransaction) => Promise<T>): Promise<T>;
}

export const USAGE_REFRESH_MS = 60_000;
export const USAGE_MAX_AGE_MS = 120_000;
export const SAFE_REPLAY_MS = 23 * 3_600_000;

export function parseUsage(value: unknown, at: Date, credentialTag: string): QuotaSnapshot {
  const emails = (value as { emails?: Record<string, unknown> } | null)?.emails;
  function window(name: "daily" | "monthly"): QuotaWindow {
    const input = emails?.[name] as QuotaWindow | undefined;
    if (!input || !Number.isSafeInteger(input.used) || input.used < 0
      || (input.limit !== null && (!Number.isSafeInteger(input.limit) || input.limit < 0))
      || (name === "monthly" && input.limit === null)) {
      throw new EmailDeliveryError("unavailable");
    }
    const reset = (input as unknown as { resets_at?: string }).resets_at;
    if (typeof reset !== "string" || !Number.isFinite(Date.parse(reset)) || Date.parse(reset) <= at.getTime()) {
      throw new EmailDeliveryError("unavailable");
    }
    return { used: input.used, limit: input.limit, resetsAt: new Date(reset).toISOString() };
  }
  return { daily: window("daily"), monthly: window("monthly"), sampledAt: at.toISOString(), credentialTag };
}

/** Accepted-before-snapshot messages are already in the provider total, not added twice.
 * Unsettled reservations are conservative holds, including across reset boundaries. */
export function effectiveWindow(snapshot: QuotaSnapshot, rows: EmailReservation[], kind: "daily" | "monthly") {
  const window = snapshot[kind];
  const resetField = kind === "daily" ? "dailyReset" : "monthlyReset";
  const accepted = rows.filter(row => row.status === "accepted" && row[resetField] === window.resetsAt)
    .reduce((n, row) => n + row.count, 0);
  const acceptedBefore = snapshot.localAccepted?.[kind] ?? 0;
  const acceptedAfter = Math.max(0, accepted - acceptedBefore);
  const holds = rows.filter(row => row.status === "pending" || row.status === "ambiguous").reduce((n, row) => n + row.count, 0);
  const used = Math.max(window.used, acceptedBefore) + acceptedAfter + holds;
  return { used, limit: window.limit, remaining: window.limit === null ? null : Math.max(0, window.limit - used), resetsAt: window.resetsAt };
}

export function budgetFailure(
  state: QuotaState, rows: EmailReservation[], at: Date, purpose: EmailPurpose, count: number,
  reserves: { admin: number; transactional: number },
): EmailDeliveryError | undefined {
  if (state.block && Date.parse(state.block.until) > at.getTime()) {
    return new EmailDeliveryError(state.block.code, new Date(state.block.until));
  }
  const snapshot = state.snapshot;
  if (!snapshot) return new EmailDeliveryError("unavailable", new Date(at.getTime() + USAGE_REFRESH_MS));
  if (at.getTime() - Date.parse(snapshot.sampledAt) > USAGE_MAX_AGE_MS
    || Date.parse(snapshot.daily.resetsAt) <= at.getTime() || Date.parse(snapshot.monthly.resetsAt) <= at.getTime()) {
    return new EmailDeliveryError("stale", new Date(at.getTime() + USAGE_REFRESH_MS));
  }
  const reserve = purpose === "admin" ? 0 : purpose === "publication" || purpose === "test"
    ? reserves.admin + reserves.transactional : reserves.admin;
  // Monthly first: do not suggest a daily reset will solve a monthly block.
  for (const kind of ["monthly", "daily"] as const) {
    const window = effectiveWindow(snapshot, rows, kind);
    if (window.remaining !== null && window.remaining < count + reserve) {
      return new EmailDeliveryError(kind === "daily" ? "daily_limit" : "monthly_limit", new Date(window.resetsAt));
    }
  }
  return undefined;
}
