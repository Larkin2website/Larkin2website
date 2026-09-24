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
  const [busy, setBusy] = useState(false);
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
  const [interests, setInterests] = useState<string[]>([]);
  const [interestOther, setInterestOther] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [careerLevels, setCareerLevels] = useState<string[]>([]);
  const [crafts, setCrafts] = useState<string[]>([]);
  const [craftsOther, setCraftsOther] = useState("");
  const [allOpportunities, setAllOpportunities] = useState(false);

  function setLoadedPreferences(value: PublicAudiencePreferences) {
    setPreferences(value);
    setName(value.name ?? "");
    setCraft(value.craft ?? "");
    setCareerLevel(value.careerLevel ?? "");
    setLocation(value.location ?? "");
    setAcquisitionSource(value.acquisitionSource ?? "");
    setAcquisitionDetail(value.acquisitionDetail ?? "");
    const currentInterests = value.interests ?? [];
    setInterests(currentInterests.filter(item => opportunityOptions?.departments.includes(item)));
    setInterestOther(currentInterests.filter(item => !opportunityOptions?.departments.includes(item)).join(", "));
    setContentTypes(value.contentTypes ?? []);
    setCareerLevels(value.careerLevels ?? []);
    const savedCrafts = value.crafts ?? [];
    setCrafts(savedCrafts.filter(item => opportunityOptions?.departments.includes(item)));
    setCraftsOther(savedCrafts.filter(item => !opportunityOptions?.departments.includes(item)).join(", "));
    setAllOpportunities(value.allOpportunities ?? false);
  }

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
      interests: [...new Set([...interests, ...splitEntries(interestOther)])],
      contentTypes: contentTypes as PublicAudiencePreferencesUpdate["contentTypes"],
      careerLevels: careerLevels as PublicAudiencePreferencesUpdate["careerLevels"],
      crafts: [...new Set([...crafts, ...splitEntries(craftsOther)])],
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
            </div> : <form className="hetv-subscription" onSubmit={loadPreferences}>
              <label htmlFor="unsubscribe-token">Personal unsubscribe link</label>
              <input id="unsubscribe-token" type="password" autoComplete="off" value={token}
                onChange={event => {
                  setToken(event.target.value);
                  setPreferences(null);
                  setError("");
                  setSavedMessage("");
                }} required disabled={!!busyAction}
                placeholder="Paste the link saved at signup" data-testid="input-unsubscribe-link" />
              <p>If a link was saved in this browser, it is filled in above. Otherwise, paste your original link. Keep it private: anyone with the link can stop that subscription.</p>
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
                <label htmlFor="manage-craft">Your craft</label>
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
                  <legend>Interests</legend>
                  {opportunityOptions?.departments.map(department => (
                    <label className="hetv-subscription-check" key={department}>
                      <input type="checkbox" checked={interests.includes(department)} disabled={!!busyAction}
                        onChange={event => setInterests(current => event.target.checked
                          ? [...current, department] : current.filter(item => item !== department))} />
                      <span>{department}</span>
                    </label>
                  ))}
                  <label htmlFor="manage-other-interests">Other interests, separated by commas</label>
                  <input id="manage-other-interests" type="text" maxLength={500} value={interestOther} disabled={!!busyAction}
                    onChange={event => setInterestOther(event.target.value)} />
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
                  <legend>Crafts you are interested in</legend>
                  {opportunityOptions?.departments.map(department => (
                    <label className="hetv-subscription-check" key={department}>
                      <input type="checkbox" checked={crafts.includes(department)} disabled={!!busyAction}
                        onChange={event => setCrafts(current => event.target.checked
                          ? [...current, department] : current.filter(item => item !== department))} />
                      <span>{department}</span>
                    </label>
                  ))}
                  <label htmlFor="manage-crafts-other">Other crafts, separated by commas</label>
                  <input id="manage-crafts-other" type="text" maxLength={500} value={craftsOther} disabled={!!busyAction}
                    onChange={event => setCraftsOther(event.target.value)} />
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
              <h2>Lost your link?</h2>
              <p>For your privacy, entering an email address alone cannot change a subscription. Automated email updates are not currently enabled. <a href="mailto:opportunities@baileyopportunities.com">Contact us</a> for help; we will need to verify your request.</p>
            </form>}
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}