import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { createPublicSubscription } from "@workspace/api-client-react";
import { savedSubscriptionToken, saveSubscriptionToken, subscriptionLink } from "../lib/subscription-link";

export function SubscriptionSignup() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [managementToken, setManagementToken] = useState("");
  const [stored, setStored] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !consent) return;
    setBusy(true);
    setError("");
    try {
      const result = await createPublicSubscription({
        email: email.trim(),
        consent: true,
        existingManagementToken: savedSubscriptionToken() || undefined,
      });
      setManagementToken(result.managementToken);
      setStored(saveSubscriptionToken(result.managementToken));
      setEmail("");
    } catch {
      setError("We couldn't save your request. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  if (managementToken) {
    const link = subscriptionLink(managementToken);
    return (
      <div className="hetv-subscription">
        <div role="status">
          <h3>Thank you for your interest</h3>
          <p>Your request has been processed. If this is your first signup, your preference is now saved.</p>
        </div>
        <div className="hetv-subscription-link">
          <h4>Keep your personal unsubscribe link</h4>
          <p>No email has been sent. Save this private link to manage a new subscription from any device. If you signed up before, use your original link; signing up again does not replace it or restart a stopped subscription.</p>
          <label htmlFor="subscription-management-link">Personal link — do not share</label>
          <input id="subscription-management-link" value={link} readOnly onFocus={event => event.currentTarget.select()} />
          <button type="button" onClick={async () => {
            try { await navigator.clipboard.writeText(link); setCopied(true); }
            catch { setError("Copy isn't available in this browser. Select and copy the personal link above."); }
          }}>{copied ? "Link copied" : "Copy personal link"}</button>
          <p>{stored ? "A link is also saved in this browser. On a shared device, copy it somewhere private and clear this site's browser data when you finish." : "This browser couldn't save the link. Please copy it before leaving this page."}</p>
          <Link href={`/unsubscribe#token=${encodeURIComponent(managementToken)}`}>Manage this request</Link>
        </div>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <form className="hetv-subscription" onSubmit={submit}>
      <label htmlFor="signup-email">Email</label>
      <input id="signup-email" type="email" autoComplete="email" required maxLength={254}
        placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)}
        disabled={busy} data-testid="input-signup-email" />
      <label className="hetv-subscription-consent">
        <input type="checkbox" required checked={consent} disabled={busy}
          onChange={event => setConsent(event.target.checked)} data-testid="checkbox-signup-consent" />
        <span>I want to receive updates. I agree to my email being stored so HETV Opportunities Hub can contact me about roles, training and development opportunities.</span>
      </label>
      <button type="submit" disabled={busy || !consent} data-testid="button-signup-submit">
        {busy ? "Saving your preference…" : "Sign Up"}
      </button>
      {error && <p role="alert">{error}</p>}
      <p>We are collecting interest; automated email alerts are not running yet. No spam. <Link href="/unsubscribe">Unsubscribe</Link> using your personal link at any time. Read our <Link href="/privacy">Privacy Notice</Link>.</p>
    </form>
  );
}

export default SubscriptionSignup;