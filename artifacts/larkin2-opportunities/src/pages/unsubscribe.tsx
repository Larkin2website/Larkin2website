import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { unsubscribePublicSubscription } from "@workspace/api-client-react";
import { MobileMenu, SiteFooter, SiteHeader } from "../components/layout";
import { consumeSubscriptionFragment, savedSubscriptionToken, tokenFromLink } from "../lib/subscription-link";

export function UnsubscribePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [token, setToken] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("token") ?? savedSubscriptionToken());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Unsubscribe | HETV Opportunities Hub";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Use your private link to stop an HETV Opportunities Hub subscription.");
    // The same page can receive another link without remounting (Wouter pushState).
    const consume = () => {
      const incomingToken = consumeSubscriptionFragment(window);
      if (incomingToken !== null) {
        setToken(incomingToken);
        setDone(false);
        setError("");
      }
    };
    consume();
    const events = ["hashchange", "popstate", "pushState"];
    events.forEach(event => window.addEventListener(event, consume));
    return () => events.forEach(event => window.removeEventListener(event, consume));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const managementToken = tokenFromLink(token);
    if (!/^[a-zA-Z0-9_-]{43}$/.test(managementToken)) {
      setError("Please paste the complete personal link you saved when you signed up.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await unsubscribePublicSubscription({ managementToken });
      setDone(true);
    } catch {
      setError("We couldn't process that request. Please try again shortly.");
    } finally { setBusy(false); }
  }

  return (
    <div className="larkin2-page legal-page" id="top">
      <a className="larkin2-skip" href="#content">Skip to content</a>
      <SiteHeader scrolled headerHidden={false} menuOpen={menuOpen} setMenuOpen={setMenuOpen}
        headerRef={headerRef} menuButtonRef={menuButtonRef} />
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuButtonRef={menuButtonRef} />
      <main id="content">
        <header className="legal-hero">
          <span className="larkin2-eyebrow">Your preferences</span>
          <h1>Unsubscribe</h1>
          <p>You can stop updates at any time. Opening this page alone does not change your preference.</p>
        </header>
        <div className="legal-content">
          <article className="legal-document">
            {done ? <div role="status" data-testid="status-unsubscribed">
              <h2>Request processed</h2>
              <p>Any subscription associated with this personal link is now stopped. If it was already stopped, it stays stopped.</p>
              <Link href="/">Return to the hub</Link>
            </div> : <form className="hetv-subscription" onSubmit={submit}>
              <label htmlFor="unsubscribe-token">Personal unsubscribe link</label>
              <input id="unsubscribe-token" type="password" autoComplete="off" value={token}
                onChange={event => setToken(event.target.value)} required disabled={busy}
                placeholder="Paste the link saved at signup" data-testid="input-unsubscribe-link" />
              <p>If a link was saved in this browser, it is filled in above. Otherwise, paste your original link. Keep it private: anyone with the link can stop that subscription.</p>
              <button type="submit" disabled={busy || !token.trim()} data-testid="button-unsubscribe">
                {busy ? "Processing…" : "Unsubscribe"}
              </button>
              {error && <p role="alert">{error}</p>}
              <h2>Lost your link?</h2>
              <p>For your privacy, entering an email address alone cannot change a subscription. <a href="mailto:opportunities@baileyopportunities.com">Contact us</a> for help; we will need to verify your request.</p>
            </form>}
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}