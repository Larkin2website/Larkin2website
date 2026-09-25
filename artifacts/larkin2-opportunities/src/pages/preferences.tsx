import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  AudienceContentType, CareerLevel, createPublicSubscription,
  useListPublicOpportunityOptions, type PublicSubscriptionInput,
} from "@workspace/api-client-react";
import { MobileMenu, SiteFooter, SiteHeader } from "../components/layout";
import { consumeSubscriptionFragment } from "../lib/subscription-link";
import { useSignupJourney } from "../lib/signup-journey";

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
  const { draft, setDraft } = useSignupJourney();
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { data: options, isError: optionsError, refetch: retryOptions } = useListPublicOpportunityOptions();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
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

  useEffect(() => {
    document.title = "Your preferences | HETV Opportunities Hub";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Choose optional interests while signing up for HETV news.");
    const incoming = consumeSubscriptionFragment(window);
    if (incoming !== null) {
      // Older signup links pointed here. Keep their management path available.
      navigate(`/unsubscribe#token=${encodeURIComponent(incoming)}`, { replace: true });
    }
  }, []);

  async function submit(skip = false) {
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    const input: PublicSubscriptionInput = {
      ...draft, consent: true,
      ...(!skip && {
        craft: craft.trim() || undefined,
        careerLevel: careerLevel ? careerLevel as PublicSubscriptionInput["careerLevel"] : undefined,
        location: location.trim() || undefined,
        acquisitionSource: source.trim() || undefined,
        acquisitionDetail: sourceDetail.trim() || undefined,
        interests: splitEntries(interestText),
        contentTypes: contentTypes as PublicSubscriptionInput["contentTypes"],
        careerLevels: careerLevels as PublicSubscriptionInput["careerLevels"],
        crafts: splitEntries(craftText),
        allOpportunities,
      }),
    };
    try {
      await createPublicSubscription(input);
      setDraft(null);
      setSaved(true);
    } catch {
      setError("We couldn't save your request. Please try again shortly.");
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
           <p>General HETV news comes first. Add interests if you like, or skip this step.</p>
        </header>
        <div className="legal-content">
          <article className="legal-document">
            <div className="hetv-subscription hetv-followup">
               <span className="hetv-followup-kicker">02 / Optional preferences</span>
               {!draft && !saved && <>
                 <h2>Start with your name and email.</h2>
                 <p>This page follows the first signup step. If you left or refreshed it, your unsent details were cleared for privacy.</p>
                 <Link href="/#signup">Start signup</Link>
               </>}
               {saved && <div role="status" data-testid="status-signup-processed">
                 <h2>Thank you for your interest.</h2>
                 <p>If this is a new signup, we have recorded your choices. Repeating signup does not change or reactivate an existing subscription. No email has been sent; automated updates are not running.</p>
                 <p>For later changes, unsubscribe, or privacy requests, <a href="mailto:opportunities@baileyopportunities.com">contact HETV staff</a>. They will verify your request before making changes.</p>
                 <Link href="/">Return to the hub</Link>
               </div>}
               {draft && !saved && <>
                <div className="hetv-followup-intro">
                  <h2>Choose what matters to you.</h2>
                   <p>Everything below is optional. Leave opportunity types unselected for general HETV news only. Choosing interests does not turn on automated email alerts. Your signup is sent when you finish this step.</p>
                </div>
                 <form className="hetv-subscription-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit(); }}>
                  <div className="hetv-followup-grid">
                    <div className="hetv-followup-field"><label htmlFor="followup-location">Your location (optional)</label>
                      <input id="followup-location" type="text" maxLength={160} value={location} onChange={event => setLocation(event.target.value)} disabled={saving} placeholder="Town, city or region" /></div>
                    <div className="hetv-followup-field"><label htmlFor="followup-craft">Your current or primary craft (optional)</label>
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
                      <legend>Topics or themes you’re interested in (optional)</legend>
                      <p>Tell us about other topics that matter to you, such as mentoring or sustainability. Separate them with commas. Entering a topic does not guarantee a matching opportunity or an email alert.</p>
                      <label htmlFor="followup-interests">Your topics or themes, separated by commas</label>
                      <input id="followup-interests" type="text" value={interestText}
                        onChange={event => setInterestText(event.target.value)}
                        disabled={saving} maxLength={500} placeholder="e.g. Mentoring, sustainability" />
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
                      <legend>Departments you’d like opportunities in (optional)</legend>
                      <p>Choose areas you’d consider working in, even if they differ from your current craft. Your current craft may also be considered when identifying relevant opportunities.</p>
                      {options?.departments.map(department => <label className="hetv-subscription-check" key={department}>
                        <input type="checkbox" checked={splitEntries(craftText).includes(department)} disabled={saving}
                          onChange={event => setCraftText(current => toggle(splitEntries(current), department, event.target.checked).join(", "))} />
                        <span>{department}</span>
                      </label>)}
                      {optionsError && <p>Department choices could not load. You can enter them below. <button type="button" onClick={() => void retryOptions()}>Try again</button></p>}
                      <label htmlFor="followup-crafts">Selected departments or other crafts, separated by commas</label>
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
                     <button type="submit" disabled={saving} data-testid="button-save-preferences">{saving ? "Saving…" : "Sign up with these preferences"}</button>
                     <button type="button" disabled={saving} onClick={() => void submit(true)} data-testid="button-skip-preferences">Skip preferences and sign up</button>
                  </div>
                  {error && <p role="alert">{error}</p>}
                </form>
              </>}
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}