import { useState } from "react";
import { Link } from "wouter";

const DISMISSAL_KEY = "hetv-cookie-notice-dismissed";

function wasDismissed() {
  try {
    return window.localStorage.getItem(DISMISSAL_KEY) === "true";
  } catch {
    return false;
  }
}

export function CookieNotice() {
  const [visible, setVisible] = useState(() => !wasDismissed());

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSAL_KEY, "true");
    } catch {
      // The notice can still be dismissed for this visit when storage is unavailable.
    }
  };

  return (
    <aside className="larkin2-cookie-notice" role="region" aria-label="Cookie notice">
      <p className="larkin2-cookie-notice-title">Cookies on this site</p>
      <p>We use cookies and similar technologies on this site. Read our <Link href="/privacy#legal-section-9">Privacy Notice</Link> for more information.</p>
      <button type="button" onClick={dismiss} aria-label="Dismiss cookie notice">Dismiss</button>
    </aside>
  );
}