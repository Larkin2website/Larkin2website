import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { createPublicSubscription, getPublicSubscriptionPreferences, type PublicSubscriptionInput } from "@workspace/api-client-react";
import { savedSubscriptionToken, saveSubscriptionToken, subscriptionLink } from "../lib/subscription-link";

export function SubscriptionSignup() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [processed, setProcessed] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState("");
  const [stored, setStored] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !consent) return;
    setBusy(true);
    setError("");
    setVerifiedToken("");
    try {
      const payload: PublicSubscriptionInput = {
        email: email.trim(),
        consent: true,
      };
      const result = await createPublicSubscription(payload);
      if (/^[A-Za-z0-9_-]{43,128}$/.test(result.managementToken)) {
        try {
          await getPublicSubscriptionPreferences({ managementToken: result.managementToken });
          setVerifiedToken(result.managementToken);
          const previousToken = savedSubscriptionToken();
          setStored(previousToken === result.managementToken || (!previousToken && saveSubscriptionToken(result.managementToken)));
        } catch {
          // Duplicate responses intentionally have the same shape. Never display an unverified token.
        }
      }
      setProcessed(true);
      setEmail("");
    } catch {
      setError("We couldn't save your request. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  if (processed) {
    const link = verifiedToken ? subscriptionLink(verifiedToken) : "";
    return (
      <div className="hetv-subscription hetv-signup-compact" role="status">
        <span className="hetv-signup-kicker">Request processed</span>
        <h3>Thank you for your interest.</h3>
        <p>HETV is collecting interest in general news and announcements. Automated email updates and opportunity alerts are not running, and no email has been sent. Signing up again does not change an existing subscription or restart one that was stopped.</p>
        {verifiedToken ? (
          <div className="hetv-subscription-link">
            <h4>Your private link</h4>
            <p>This link was verified. Keep it somewhere private: anyone with it can manage the associated preferences. If you previously signed up, keep using your original link; this request does not replace or change existing preferences.</p>
            <label htmlFor="subscription-management-link">Personal link — do not share</label>
            <input id="subscription-management-link" value={link} readOnly onFocus={event => event.currentTarget.select()} />
            <div className="hetv-signup-actions">
              <button type="button" onClick={async () => {
                try { await navigator.clipboard.writeText(link); setCopied(true); }
                catch { setError("Copy isn't available here. Select and copy the link above."); }
              }}>{copied ? "Link copied" : "Copy private link"}</button>
              <Link href={`/preferences#token=${encodeURIComponent(verifiedToken)}`}>Add details (optional) →</Link>
            </div>
            <p>{stored ? "This link is also saved in this browser. On a shared device, keep a private copy and clear this site's browser data when finished." : "This browser could not save the link. Copy it before leaving this page."}</p>
            <Link href={`/unsubscribe#token=${encodeURIComponent(verifiedToken)}`}>Manage or unsubscribe</Link>
          </div>
        ) : (
          <p>We could not verify a personal link for this request. If you have subscribed before, your original preferences and link remain unchanged. <Link href="/unsubscribe">Use your original link to manage preferences</Link>.</p>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <form className="hetv-subscription hetv-signup-compact" onSubmit={submit}>
      <span className="hetv-signup-kicker">Stay in the picture</span>
      <h3>Start with your email.</h3>
      <label htmlFor="signup-email">Email address</label>
      <div className="hetv-signup-fields">
        <input id="signup-email" type="email" autoComplete="email" required maxLength={254}
          placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)}
          disabled={busy} data-testid="input-signup-email" />
        <button type="submit" disabled={busy || !consent} data-testid="button-signup-submit">
          {busy ? "Saving…" : "Sign up"}
        </button>
      </div>
      <label className="hetv-subscription-consent">
        <input type="checkbox" required checked={consent} disabled={busy}
          onChange={event => setConsent(event.target.checked)} data-testid="checkbox-signup-consent" />
        <span>I agree to HETV Opportunities Hub storing my email and contacting me about general HETV news and announcements, and about specific opportunities only if I choose those preferences later. I can unsubscribe at any time.</span>
      </label>
      {error && <p role="alert">{error}</p>}
      <p className="hetv-signup-footnote">We are collecting interest. Automated marketing emails and opportunity alerts are not running; signing up does not send an email. After signup, you can optionally add your interests. Read our <Link href="/privacy">Privacy Notice</Link> or <Link href="/unsubscribe">manage an existing subscription</Link>.</p>
    </form>
  );
}

export default SubscriptionSignup;