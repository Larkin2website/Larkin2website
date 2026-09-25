import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  AudienceContentType,
  CareerLevel,
  getPublicSubscriptionPreferences,
  unsubscribePublicSubscription,
  updatePublicSubscriptionPreferences,
  useListPublicOpportunityOptions,
  type PublicAudiencePreferences,
  type PublicAudiencePreferencesUpdate,
} from "@workspace/api-client-react";
import { MobileMenu, SiteFooter, SiteHeader } from "../components/layout";
import { consumeSubscriptionFragment, savedSubscriptionToken, tokenFromLink } from "../lib/subscription-link";

const careerOptions = [
  [CareerLevel.new_entrant, "New entrant"],
  [CareerLevel.mid_level, "Mid-level"],
  [CareerLevel.senior, "Senior"],
] as const;
const contentOptions = [
  [AudienceContentType.role, "Roles"],
  [AudienceContentType.programme, "Programmes"],
  [AudienceContentType.training, "Training"],
] as const;
const splitEntries = (value: string) => [...new Set(value.split(",").map(item => item.trim()).filter(Boolean))];

export function UnsubscribePage() {
  const { data: opportunityOptions } = useListPublicOpportunityOptions();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [token, setToken] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("token") ?? savedSubscriptionToken());
  const [showLegacyLink, setShowLegacyLink] = useState(() =>
    !!(new URLSearchParams(window.location.hash.slice(1)).get("token") || savedSubscriptionToken()));
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState<PublicAudiencePreferences | null>(null);
  const [busyAction, setBusyAction] = useState<"load" | "save" | "unsubscribe" | "">("");
  const [savedMessage, setSavedMessage] = useState("");
  const [name, setName] = useState("");
  const [craft, setCraft] = useState("");
  const [careerLevel, setCareerLevel] = useState("");
  const [location, setLocation] = useState("");
  const [acquisitionSource, setAcquisitionSource] = useState("");
  const [acquisitionDetail, setAcquisitionDetail] = useState("");
  const [interestText, setInterestText] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [careerLevels, setCareerLevels] = useState<string[]>([]);
  const [craftText, setCraftText] = useState("");
  const [allOpportunities, setAllOpportunities] = useState(false);

  function setLoadedPreferences(value: PublicAudiencePreferences) {
    setPreferences(value);
    setName(value.name ?? "");
    setCraft(value.craft ?? "");
    setCareerLevel(value.careerLevel ?? "");
    setLocation(value.location ?? "");
    setAcquisitionSource(value.acquisitionSource ?? "");
    setAcquisitionDetail(value.acquisitionDetail ?? "");
    setInterestText((value.interests ?? []).join(", "));
    setContentTypes(value.contentTypes ?? []);
    setCareerLevels(value.careerLevels ?? []);
    setCraftText((value.crafts ?? []).join(", "));
    setAllOpportunities(value.allOpportunities ?? false);
  }

  useEffect(() => {
    document.title = "Unsubscribe | HETV Opportunities Hub";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Request changes or unsubscribe from HETV Opportunities Hub news.");
    // The same page can receive another link without remounting (Wouter pushState).
    const consume = () => {
      const incomingToken = consumeSubscriptionFragment(window);
      if (incomingToken !== null) {
        setToken(incomingToken);
        setShowLegacyLink(true);
        setDone(false);
        setError("");
        setPreferences(null);
        setSavedMessage("");
      }
    };
    consume();
    const events = ["hashchange", "popstate", "pushState"];
    events.forEach(event => window.addEventListener(event, consume));
    return () => events.forEach(event => window.removeEventListener(event, consume));
  }, []);

  function normalizedToken() {
    const managementToken = tokenFromLink(token);
    return /^[a-zA-Z0-9_-]{43}$/.test(managementToken) ? managementToken : "";
  }

  async function loadPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyAction) return;
    const managementToken = normalizedToken();
    if (!managementToken) {
      setError("Please paste the complete personal link you saved when you signed up.");
      return;
    }
    setBusyAction("load");
    setError("");
    setSavedMessage("");
    setPreferences(null);
    try {
      const result = await getPublicSubscriptionPreferences({ managementToken });
      setLoadedPreferences(result);
    } catch {
      setPreferences(null);
      setError("We couldn't load preferences for that link. Check it and try again.");
    } finally { setBusyAction(""); }
  }

  async function savePreferences() {
    if (busyAction || !preferences) return;
    const managementToken = normalizedToken();
    if (!managementToken) {
      setPreferences(null);
      setError("Please paste the complete personal link you saved when you signed up.");
      return;
    }
    setBusyAction("save");
    setError("");
    setSavedMessage("");
    const update: PublicAudiencePreferencesUpdate = {
      managementToken,
      name: name.trim() || null,
      craft: craft.trim() || null,
      careerLevel: careerLevel ? careerLevel as PublicAudiencePreferencesUpdate["careerLevel"] : null,
      location: location.trim() || null,
      acquisitionSource: acquisitionSource.trim() || null,
      acquisitionDetail: acquisitionDetail.trim() || null,
      interests: splitEntries(interestText),
      contentTypes: contentTypes as PublicAudiencePreferencesUpdate["contentTypes"],
      careerLevels: careerLevels as PublicAudiencePreferencesUpdate["careerLevels"],
      crafts: splitEntries(craftText),
      allOpportunities,
    };
    try {
      const result = await updatePublicSubscriptionPreferences(update);
      setLoadedPreferences(result);
      setSavedMessage("Your preferences have been updated.");
    } catch {
      setError("We couldn't update preferences. Please check your link and try again.");
    } finally { setBusyAction(""); }
  }

  async function unsubscribe() {
    if (busyAction) return;
    const managementToken = normalizedToken();
    if (!managementToken) {
      setError("Please paste the complete personal link you saved when you signed up.");
      return;
    }
    setBusyAction("unsubscribe");
    setError("");
    try {
      await unsubscribePublicSubscription({ managementToken });
      setDone(true);
      setPreferences(null);
    } catch {
      setError("We couldn't process that request. Please try again shortly.");
    } finally { setBusyAction(""); }
  }

  return (
    <div className="larkin2-page legal-page subscription-management-page" id="top">
      <a className="larkin2-skip" href="#content">Skip to content</a>
      <SiteHeader scrolled headerHidden={false} menuOpen={menuOpen} setMenuOpen={setMenuOpen}
        headerRef={headerRef} menuButtonRef={menuButtonRef} />
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuButtonRef={menuButtonRef} />
      <main id="content">
        <header className="legal-hero">
          <span className="larkin2-eyebrow">Your preferences</span>
           <h1>Manage your subscription</h1>
           <p>You can request changes or unsubscribe at any time. Opening this page alone does not change your preference.</p>
        </header>
        <div className="legal-content">
          <article className="legal-document">
             <h2>Need to make a change?</h2>
             <p>To update your preferences, unsubscribe, or make a privacy request, email <a href="mailto:opportunities@baileyopportunities.com">opportunities@baileyopportunities.com</a>. HETV staff will verify your request before making changes. Email-only self-service is not available yet; no automated update emails are being sent.</p>
             {done ? <div role="status" data-testid="status-unsubscribed">
              <h2>Request processed</h2>
              <p>Any subscription associated with this personal link is now stopped. If it was already stopped, it stays stopped.</p>
              <Link href="/">Return to the hub</Link>
             </div> : <>
             {!showLegacyLink && <button type="button" onClick={() => setShowLegacyLink(true)} data-testid="button-existing-link">I already have a private link</button>}
             {showLegacyLink && <form className="hetv-subscription" onSubmit={loadPreferences}>
               <h2>Using an existing link</h2>
               <p>If you received a private link previously, you can continue to use it here. New signups do not receive a link.</p>
              <label htmlFor="unsubscribe-token">Personal unsubscribe link</label>
              <input id="unsubscribe-token" type="password" autoComplete="off" value={token}
                onChange={event => {
                  setToken(event.target.value);
                  setPreferences(null);
                  setError("");
                  setSavedMessage("");
                }} required disabled={!!busyAction}
                placeholder="Paste the link saved at signup" data-testid="input-unsubscribe-link" />
               <p>If an older link was saved in this browser, it is filled in above. Otherwise paste your original link. Keep it private: anyone with it can stop that subscription.</p>
              <button type="submit" disabled={!!busyAction || !token.trim()} data-testid="button-load-preferences">
                {busyAction === "load" ? "Loading…" : preferences ? "Reload preferences" : "Load preferences"}
              </button>
              <button type="button" onClick={unsubscribe} disabled={!!busyAction || !token.trim()} data-testid="button-unsubscribe">
                {busyAction === "unsubscribe" ? "Processing…" : "Unsubscribe"}
              </button>
              {error && <p role="alert">{error}</p>}
              {preferences && <>
                <h2>Manage your preferences</h2>
                <p>Your details are shown only after your private link has been verified.</p>
                <label htmlFor="manage-name">Name</label>
                <input id="manage-name" type="text" maxLength={160} value={name} disabled={!!busyAction}
                  onChange={event => setName(event.target.value)} />
                <label htmlFor="manage-craft">Your current or primary craft</label>
                <input id="manage-craft" type="text" maxLength={120} value={craft} disabled={!!busyAction}
                  onChange={event => setCraft(event.target.value)} />
                <label htmlFor="manage-career-level">Your career level</label>
                <select id="manage-career-level" value={careerLevel} disabled={!!busyAction}
                  onChange={event => setCareerLevel(event.target.value)}>
                  <option value="">Not specified</option>
                  {careerOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <label htmlFor="manage-location">Location</label>
                <input id="manage-location" type="text" maxLength={160} value={location} disabled={!!busyAction}
                  onChange={event => setLocation(event.target.value)} />
                <label htmlFor="manage-source">How did you hear about us?</label>
                <input id="manage-source" type="text" maxLength={120} value={acquisitionSource} disabled={!!busyAction}
                  onChange={event => setAcquisitionSource(event.target.value)} />
                {acquisitionSource.trim() && <>
                  <label htmlFor="manage-source-detail">More detail</label>
                  <input id="manage-source-detail" type="text" maxLength={500} value={acquisitionDetail} disabled={!!busyAction}
                    onChange={event => setAcquisitionDetail(event.target.value)} />
                </>}
                <fieldset className="hetv-subscription-options">
                  <legend>Topics or themes you’re interested in (optional)</legend>
                  <p>Tell us about other topics that matter to you, such as mentoring or sustainability. Separate them with commas. Entering a topic does not guarantee a matching opportunity or an email alert.</p>
                  <label htmlFor="manage-other-interests">Your topics or themes, separated by commas</label>
                  <input id="manage-other-interests" type="text" maxLength={500} value={interestText} disabled={!!busyAction}
                    onChange={event => setInterestText(event.target.value)} />
                </fieldset>
                <fieldset className="hetv-subscription-options">
                  <legend>Updates you are interested in</legend>
                  {contentOptions.map(([value, label]) => (
                    <label className="hetv-subscription-check" key={value}>
                      <input type="checkbox" checked={contentTypes.includes(value)} disabled={!!busyAction}
                        onChange={event => setContentTypes(current => event.target.checked
                          ? [...current, value] : current.filter(item => item !== value))} />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="hetv-subscription-options">
                  <legend>Career levels you are interested in</legend>
                  {careerOptions.map(([value, label]) => (
                    <label className="hetv-subscription-check" key={value}>
                      <input type="checkbox" checked={careerLevels.includes(value)} disabled={!!busyAction}
                        onChange={event => setCareerLevels(current => event.target.checked
                          ? [...current, value] : current.filter(item => item !== value))} />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="hetv-subscription-options">
                  <legend>Departments you’d like opportunities in (optional)</legend>
                  <p>Choose areas you’d consider working in, even if they differ from your current craft. Your current craft may also be considered when identifying relevant opportunities.</p>
                  {opportunityOptions?.departments.map(department => (
                    <label className="hetv-subscription-check" key={department}>
                      <input type="checkbox" checked={splitEntries(craftText).includes(department)} disabled={!!busyAction}
                        onChange={event => setCraftText(current => event.target.checked
                          ? [...new Set([...splitEntries(current), department])].join(", ")
                          : splitEntries(current).filter(item => item !== department).join(", "))} />
                      <span>{department}</span>
                    </label>
                  ))}
                  <label htmlFor="manage-crafts-other">Selected departments or other crafts, separated by commas</label>
                  <input id="manage-crafts-other" type="text" maxLength={500} value={craftText} disabled={!!busyAction}
                    onChange={event => setCraftText(event.target.value)} />
                </fieldset>
                <label className="hetv-subscription-consent">
                  <input type="checkbox" checked={allOpportunities} disabled={!!busyAction}
                    onChange={event => setAllOpportunities(event.target.checked)} />
                  <span>Include all opportunities, regardless of these preferences.</span>
                </label>
                {savedMessage && <p role="status">{savedMessage}</p>}
                <button type="button" onClick={savePreferences} disabled={!!busyAction} data-testid="button-update-preferences">
                  {busyAction === "save" ? "Saving…" : "Update preferences"}
                </button>
              </>}
             </form>}</>}
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}