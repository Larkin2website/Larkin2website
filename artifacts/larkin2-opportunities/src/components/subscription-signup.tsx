import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { createPublicSubscription } from "@workspace/api-client-react";
import { useSignupJourney } from "../lib/signup-journey";

export function SubscriptionSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [processed, setProcessed] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [, navigate] = useLocation();
  const { setDraft } = useSignupJourney();

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !consent) return;
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    const draft = { name: name.trim(), email: email.trim() };
    const skip = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "skip";
    if (!skip) {
      setDraft(draft);
      navigate("/preferences");
      return;
    }
    setBusy(true);
    try {
      await createPublicSubscription({ ...draft, consent: true });
      setProcessed(true);
      setDraft(null);
      setName("");
      setEmail("");
    } catch {
      setError("We couldn't save your request. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  if (processed) return (
    <div className="hetv-subscription hetv-signup-compact" role="status" data-testid="status-signup-processed">
      <span className="hetv-signup-kicker">Request processed</span>
      <h3>Thank you for your interest.</h3>
      <p>If this is a new signup, we have recorded your interest in general HETV news and announcements. Repeating a signup will not change or reactivate an existing subscription. No email has been sent, and automated updates are not running.</p>
      <p>To change your details or unsubscribe later, <a href="mailto:admin@HETVopportunities.com">contact HETV staff</a>. They will verify your request before making changes.</p>
    </div>
  );

  return (
    <form className="hetv-subscription hetv-signup-compact" onSubmit={event => void submit(event)}>
      <span className="hetv-signup-kicker">Stay in the picture</span>
      <h3>Start with your details.</h3>
      <div className="hetv-signup-fields">
        <div className="hetv-signup-field">
          <label htmlFor="signup-name">Your name</label>
          <input id="signup-name" type="text" autoComplete="name" required maxLength={160}
            value={name} onChange={event => { setName(event.target.value); setError(""); }}
            disabled={busy} aria-invalid={!!error && !name.trim()}
            aria-describedby={error && !name.trim() ? "signup-error" : undefined}
            data-testid="input-signup-name" />
        </div>
        <div className="hetv-signup-field">
          <label htmlFor="signup-email">Email address</label>
          <input id="signup-email" type="email" autoComplete="email" required maxLength={254}
            placeholder="you@example.com" value={email} onChange={event => { setEmail(event.target.value); setError(""); }}
            disabled={busy} data-testid="input-signup-email" />
        </div>
      </div>
      <label className="hetv-subscription-consent">
        <input type="checkbox" required checked={consent} disabled={busy}
          onChange={event => setConsent(event.target.checked)} data-testid="checkbox-signup-consent" />
        <span>I agree to HETV Opportunities Hub storing my name and email and contacting me about general HETV news and announcements. I can separately choose opportunity interests next. I can unsubscribe at any time.</span>
      </label>
      <div className="hetv-signup-actions">
        <button type="submit" disabled={busy || !consent} data-testid="button-signup-submit">Continue to preferences →</button>
        <button type="submit" value="skip" disabled={busy || !consent}
          data-testid="button-signup-skip">{busy ? "Saving…" : "Skip preferences"}</button>
      </div>
      {error && <p id="signup-error" ref={errorRef} role="alert" tabIndex={-1}>{error}</p>}
      <p className="hetv-signup-footnote">We are collecting interest, not sending automated marketing emails or opportunity alerts. Signing up does not send an email. Read our <Link href="/privacy">Privacy Notice</Link>. For later changes or unsubscribe requests, <a href="mailto:admin@HETVopportunities.com">contact HETV staff</a>.</p>
    </form>
  );
}

export default SubscriptionSignup;