import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  AudienceContentType, CareerLevel, getPublicSubscriptionPreferences,
  updatePublicSubscriptionPreferences, useListPublicOpportunityOptions,
  type PublicAudiencePreferences, type PublicAudiencePreferencesUpdate,
} from "@workspace/api-client-react";
import { MobileMenu, SiteFooter, SiteHeader } from "../components/layout";
import { savedSubscriptionToken, subscriptionLink, tokenFromLink } from "../lib/subscription-link";

const contentOptions = [
  [AudienceContentType.role, "Roles"], [AudienceContentType.programme, "Programmes"],
  [AudienceContentType.training, "Training"],
] as const;
const careerOptions = [
  [CareerLevel.new_entrant, "New entrant"], [CareerLevel.mid_level, "Mid-level"],
  [CareerLevel.senior, "Senior"],
] as const;
const splitEntries = (value: string) => [...new Set(value.split(",").map(item => item.trim()).filter(Boolean))];
const toggle = (items: string[], item: string, checked: boolean) =>
  checked ? [...new Set([...items, item])] : items.filter(value => value !== item);

export function PreferencesPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { data: options, isError: optionsError, refetch: retryOptions } = useListPublicOpportunityOptions();
  const [tokenInput, setTokenInput] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("token") ?? savedSubscriptionToken());
  const [verifiedToken, setVerifiedToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [preferences, setPreferences] = useState<PublicAudiencePreferences | null>(null);
  const [name, setName] = useState("");
  const [craft, setCraft] = useState("");
  const [careerLevel, setCareerLevel] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState("");
  const [sourceDetail, setSourceDetail] = useState("");
  const [interestText, setInterestText] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [careerLevels, setCareerLevels] = useState<string[]>([]);
  const [craftText, setCraftText] = useState("");
  const [allOpportunities, setAllOpportunities] = useState(false);
  const [copied, setCopied] = useState(false);

  function initialize(value: PublicAudiencePreferences) {
    setPreferences(value);
    setName(value.name ?? "");
    setCraft(value.craft ?? "");
    setCareerLevel(value.careerLevel ?? "");
    setLocation(value.location ?? "");
    setSource(value.acquisitionSource ?? "");
    setSourceDetail(value.acquisitionDetail ?? "");
    setInterestText((value.interests ?? []).join(", "));
    setContentTypes(value.contentTypes ?? []);
    setCareerLevels(value.careerLevels ?? []);
    setCraftText((value.crafts ?? []).join(", "));
    setAllOpportunities(value.allOpportunities ?? false);
  }

  async function load(value: string) {
    const managementToken = tokenFromLink(value);
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(managementToken)) {
      setError("Paste the complete personal link you saved when you signed up.");
      return;
    }
    setLoading(true);
    setError("");
    setSaved(false);
    setVerifiedToken("");
    setPreferences(null);
    try {
      const result = await getPublicSubscriptionPreferences({ managementToken });
      initialize(result);
      setVerifiedToken(managementToken);
      setTokenInput(managementToken);
    } catch {
      setError("We couldn't verify that link. Check your original link and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Your preferences | HETV Opportunities Hub";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Choose what HETV Opportunities Hub may contact you about using your private link.");
    const incoming = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (incoming !== null) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
    const initial = incoming ?? savedSubscriptionToken();
    if (initial) void load(initial);
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verifiedToken || !preferences || saving) return;
    setSaving(true);
    setSaved(false);
    setError("");
    const update: PublicAudiencePreferencesUpdate = {
      managementToken: verifiedToken,
      name: name.trim() || null,
      craft: craft.trim() || null,
      careerLevel: careerLevel ? careerLevel as PublicAudiencePreferencesUpdate["careerLevel"] : null,
      location: location.trim() || null,
      acquisitionSource: source.trim() || null,
      acquisitionDetail: sourceDetail.trim() || null,
      interests: splitEntries(interestText), contentTypes: contentTypes as PublicAudiencePreferencesUpdate["contentTypes"],
      careerLevels: careerLevels as PublicAudiencePreferencesUpdate["careerLevels"],
      crafts: splitEntries(craftText), allOpportunities,
    };
    try {
      const result = await updatePublicSubscriptionPreferences(update);
      initialize(result);
      setSaved(true);
    } catch {
      setError("We couldn't save your preferences. Check your link and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="larkin2-page legal-page" id="top">
      <a className="larkin2-skip" href="#content">Skip to content</a>
      <SiteHeader scrolled headerHidden={false} menuOpen={menuOpen} setMenuOpen={setMenuOpen}
        headerRef={headerRef} menuButtonRef={menuButtonRef} />
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuButtonRef={menuButtonRef} />
      <main id="content">
        <header className="legal-hero">
          <span className="larkin2-eyebrow">Your next step / optional</span>
          <h1>Make it yours.</h1>
          <p>General HETV news comes first. If you want us to know more about you or the opportunities you care about, add those details here.</p>
        </header>
        <div className="legal-content">
          <article className="legal-document">
            <div className="hetv-subscription hetv-followup">
              <span className="hetv-followup-kicker">01 / Private access</span>
              {!verifiedToken && <>
                <h2>Use your personal link</h2>
                <p className="hetv-followup-intro">Your preferences can only be changed with a verified private link. If it was saved in this browser, we'll try it automatically. Otherwise, paste your original link below.</p>
                <form className="hetv-subscription-form" onSubmit={event => { event.preventDefault(); void load(tokenInput); }}>
                  <label htmlFor="followup-token">Personal link</label>
                  <input id="followup-token" type="password" autoComplete="off" value={tokenInput}
                    onChange={event => { setTokenInput(event.target.value); setError(""); }}
                    placeholder="Paste your private link" required disabled={loading} />
                  <button type="submit" disabled={loading || !tokenInput.trim()}>{loading ? "Checking…" : "Load preferences"}</button>
                </form>
                {loading && <div className="hetv-followup-loading" role="status" aria-label="Loading preferences"><span /><span /><span /></div>}
                {error && <p role="alert">{error}</p>}
                <p>Lost your link? An email address alone cannot change an existing subscription. <Link href="/unsubscribe">Visit the manage page</Link> for help and other options.</p>
              </>}
              {verifiedToken && preferences && <>
                <div className="hetv-followup-intro">
                  <h2>Choose what matters to you.</h2>
                  <p>Everything below is optional. Leave opportunity types unselected to stay with general HETV news and announcements. Selecting types records your interests; it does not turn on automated email alerts.</p>
                </div>
                <form className="hetv-subscription-form" onSubmit={save}>
                  <div className="hetv-followup-grid">
                    <div className="hetv-followup-field"><label htmlFor="followup-name">Name (optional)</label>
                      <input id="followup-name" type="text" maxLength={160} value={name} onChange={event => setName(event.target.value)} disabled={saving} /></div>
                    <div className="hetv-followup-field"><label htmlFor="followup-location">Your location (optional)</label>
                      <input id="followup-location" type="text" maxLength={160} value={location} onChange={event => setLocation(event.target.value)} disabled={saving} placeholder="Town, city or region" /></div>
                    <div className="hetv-followup-field"><label htmlFor="followup-craft">Your craft (optional)</label>
                      <input id="followup-craft" type="text" maxLength={120} value={craft} onChange={event => setCraft(event.target.value)} disabled={saving} placeholder="e.g. Editing" /></div>
                    <div className="hetv-followup-field"><label htmlFor="followup-career">Your career level (optional)</label>
                      <select id="followup-career" value={careerLevel} onChange={event => setCareerLevel(event.target.value)} disabled={saving}>
                        <option value="">Not specified</option>
                        {careerOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select></div>
                    <fieldset className="hetv-subscription-options hetv-followup-full">
                      <legend>Opportunity updates you are interested in (optional)</legend>
                      {contentOptions.map(([value, label]) => <label className="hetv-subscription-check" key={value}>
                        <input type="checkbox" checked={contentTypes.includes(value)} disabled={saving}
                          onChange={event => setContentTypes(current => toggle(current, value, event.target.checked))} />
                        <span>{label}</span>
                      </label>)}
                    </fieldset>
                    <fieldset className="hetv-subscription-options hetv-followup-full">
                      <legend>Departments and interests (optional)</legend>
                      {options?.departments.map(department => <label className="hetv-subscription-check" key={department}>
                        <input type="checkbox" checked={splitEntries(interestText).includes(department)} disabled={saving}
                          onChange={event => setInterestText(current => toggle(splitEntries(current), department, event.target.checked).join(", "))} />
                        <span>{department}</span>
                      </label>)}
                      {optionsError && <p>Department choices could not load. You can still enter interests below. <button type="button" onClick={() => void retryOptions()}>Try again</button></p>}
                      <label htmlFor="followup-interests">All selected interests, separated by commas</label>
                      <input id="followup-interests" type="text" value={interestText}
                        onChange={event => setInterestText(event.target.value)}
                        disabled={saving} maxLength={500} />
                    </fieldset>
                    <fieldset className="hetv-subscription-options hetv-followup-full">
                      <legend>Career levels of interest (optional)</legend>
                      {careerOptions.map(([value, label]) => <label className="hetv-subscription-check" key={value}>
                        <input type="checkbox" checked={careerLevels.includes(value)} disabled={saving}
                          onChange={event => setCareerLevels(current => toggle(current, value, event.target.checked))} />
                        <span>{label}</span>
                      </label>)}
                    </fieldset>
                    <fieldset className="hetv-subscription-options hetv-followup-full">
                      <legend>Crafts of interest (optional)</legend>
                      {options?.departments.map(department => <label className="hetv-subscription-check" key={department}>
                        <input type="checkbox" checked={splitEntries(craftText).includes(department)} disabled={saving}
                          onChange={event => setCraftText(current => toggle(splitEntries(current), department, event.target.checked).join(", "))} />
                        <span>{department}</span>
                      </label>)}
                      {optionsError && <p>Craft choices could not load. You can enter them below.</p>}
                      <label htmlFor="followup-crafts">All selected crafts, separated by commas</label>
                      <input id="followup-crafts" type="text" value={craftText}
                        onChange={event => setCraftText(event.target.value)}
                        disabled={saving} maxLength={500} />
                    </fieldset>
                    <div className="hetv-followup-field"><label htmlFor="followup-source">How did you hear about us? (optional)</label>
                      <input id="followup-source" type="text" maxLength={120} value={source} onChange={event => setSource(event.target.value)} disabled={saving} /></div>
                    <div className="hetv-followup-field"><label htmlFor="followup-source-detail">Any more detail? (optional)</label>
                      <input id="followup-source-detail" type="text" maxLength={500} value={sourceDetail} onChange={event => setSourceDetail(event.target.value)} disabled={saving} /></div>
                  </div>
                  <label className="hetv-subscription-consent"><input type="checkbox" checked={allOpportunities} disabled={saving}
                    onChange={event => setAllOpportunities(event.target.checked)} />
                    <span>Include all opportunities, regardless of my selections above.</span></label>
                  <div className="hetv-followup-actions">
                    <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save my preferences"}</button>
                    <Link href="/">Skip for now / return to the hub</Link>
                  </div>
                  {saved && <p className="hetv-followup-note" role="status">Your preferences have been saved. Automated email alerts are not running.</p>}
                  {error && <p role="alert">{error}</p>}
                </form>
                <div className="hetv-subscription-link">
                  <h4>Keep your private link</h4>
                  <p>No email has been sent. Anyone with this link can manage these preferences or unsubscribe; keep it private.</p>
                  <label htmlFor="followup-private-link">Personal link — do not share</label>
                  <input id="followup-private-link" readOnly value={subscriptionLink(verifiedToken)} onFocus={event => event.currentTarget.select()} />
                  <div className="hetv-followup-actions">
                    <button type="button" onClick={async () => {
                      try { await navigator.clipboard.writeText(subscriptionLink(verifiedToken)); setCopied(true); }
                      catch { setError("Copy isn't available here. Select and copy the link above."); }
                    }}>{copied ? "Link copied" : "Copy link"}</button>
                    <Link href={`/unsubscribe#token=${encodeURIComponent(verifiedToken)}`}>Manage or unsubscribe</Link>
                  </div>
                </div>
              </>}
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}