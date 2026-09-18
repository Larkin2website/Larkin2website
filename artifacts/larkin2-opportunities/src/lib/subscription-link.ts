const STORAGE_KEY = "hetv-subscription-management";

export function consumeSubscriptionFragment(browser: Pick<Window, "location" | "history">): string | null {
  const token = new URLSearchParams(browser.location.hash.slice(1)).get("token");
  if (token === null) return null;
  browser.history.replaceState(browser.history.state, "", browser.location.pathname + browser.location.search);
  return token;
}

export function savedSubscriptionToken(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? ""; }
  catch { return ""; }
}

export function saveSubscriptionToken(token: string): boolean {
  try { localStorage.setItem(STORAGE_KEY, token); return true; }
  catch { return false; }
}

export function subscriptionLink(token: string): string {
  return new URL(`${import.meta.env.BASE_URL}unsubscribe#token=${encodeURIComponent(token)}`, window.location.origin).href;
}

export function tokenFromLink(value: string): string {
  try {
    const url = new URL(value);
    return new URLSearchParams(url.hash.slice(1)).get("token") ?? "";
  } catch {
    return value.trim();
  }
}