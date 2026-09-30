import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  AudienceContentType,
  CareerLevel,
  requestSubscriptionCode,
  verifySubscriptionCode,
  getVerifiedSubscriptionPreferences,
  updateVerifiedSubscriptionPreferences,
  unsubscribeVerifiedSubscription,
  getPublicSubscriptionPreferences,
  unsubscribePublicSubscription,
  updatePublicSubscriptionPreferences,
  useListPublicOpportunityOptions,
  type PublicAudiencePreferences,
  type PublicAudiencePreferencesUpdate,
} from "@workspace/api-client-react";
import { MobileMenu, SiteFooter, SiteHeader } from "../components/layout";
import { consumeSubscriptionFragment, savedSubscriptionToken, tokenFromLink } from "../lib/subscription-link";
import { isReferralSource, referralPrompt, referralSources, type ReferralSource } from "../lib/referral-source";

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
const accessStorageKey = "hetv_verified_subscription_access";
const isExpiredAccess = (reason: unknown) => typeof reason === "object" && reason !== null && "status" in reason && reason.status === 401;

export function UnsubscribePage() {
  const { data: opportunityOptions } = useListPublicOpportunityOptions();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [token, setToken] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("token") ?? savedSubscriptionToken());
  const [showLegacyLink, setShowLegacyLink] = useState(() =>
    !!(new URLSearchParams(window.location.hash.slice(1)).get("token") || savedSubscriptionToken()));
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem(accessStorageKey) ?? "");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState<PublicAudiencePreferences | null>(null);
  const [busyAction, setBusyAction] = useState<"load" | "save" | "unsubscribe" | "request" | "verify" | "">("");
  const [savedMessage, setSavedMessage] = useState("");
  const [name, setName] = useState("");
  const [craft, setCraft] = useState("");
  const [careerLevel, setCareerLevel] = useState("");
  const [location, setLocation] = useState("");
  const [acquisitionSource, setAcquisitionSource] = useState("");
  const [acquisitionDetail, setAcquisitionDetail] = useState("");
  const [acquisitionDetailDeclined, setAcquisitionDetailDeclined] = useState(false);
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
    setAcquisitionDetailDeclined(!!(value as PublicAudiencePreferences & { acquisitionDetailDeclined?: boolean }).acquisitionDetailDeclined);
    setInterestText((value.interests ?? []).join(", "));
    setContentTypes(value.contentTypes ?? []);
    setCareerLevels(value.careerLevels ?? []);
    setCraftText((value.crafts ?? []).join(", "));
    setAllOpportunities(value.allOpportunities ?? false);
  }

  function clearAccess() {
    sessionStorage.removeItem(accessStorageKey);
    setAccessToken("");
    setPreferences(null);
  }

  useEffect(() => {
    document.title = "Unsubscribe | HETV Opportunities Hub";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Request changes or unsubscribe from HETV Opportunities Hub news.");
    // The same page can receive another link without remounting (Wouter pushState).
    const consume = () => {
      const incomingToken = consumeSubscriptionFragment(window);
      if (incomingToken !== null) {
        sessionStorage.removeItem(accessStorageKey);
        setAccessToken("");
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

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getVerifiedSubscriptionPreferences({ accessToken }).then(value => {
      if (!cancelled) setLoadedPreferences(value);
    }).catch(reason => {
      if (!cancelled) {
        if (isExpiredAccess(reason)) clearAccess();
        else setError("We couldn't load your preferences right now. Please try again shortly.");
      }
    });
    return () => { cancelled = true; };
  }, [accessToken]);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyAction) return;
    setBusyAction("request"); setError(""); setVerificationMessage("");
    try {
      await requestSubscriptionCode({ email: email.trim() });
      setCodeRequested(true);
      setVerificationMessage("If this address has an active subscription and delivery is available, a code should arrive shortly. Check your inbox and spam folder. If it does not arrive, try again later or contact our team.");
    } catch {
      setError("We couldn't send a code right now. Try again later or contact our team.");
    } finally { setBusyAction(""); }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyAction) return;
    setBusyAction("verify"); setError("");
    try {
      const result = await verifySubscriptionCode({ email: email.trim(), code });
      setCode("");
      setPreferences(null);
      setSavedMessage("");
      sessionStorage.setItem(accessStorageKey, result.accessToken);
      setAccessToken(result.accessToken);
      setShowLegacyLink(false);
      setVerificationMessage("");
    } catch {
      setError("That code is invalid or expired. Check the code or request a new one.");
    } finally { setBusyAction(""); }
  }

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
    const managementToken = accessToken ? "" : normalizedToken();
    if (!accessToken && !managementToken) {
      setPreferences(null);
      setError("Please paste the complete personal link you saved when you signed up.");
      return;
    }
    setBusyAction("save");
    setError("");
    setSavedMessage("");
    const update: PublicAudiencePreferencesUpdate & { acquisitionDetailDeclined?: boolean } = {
      managementToken,
      name: name.trim() || null,
      craft: craft.trim() || null,
      careerLevel: careerLevel ? careerLevel as PublicAudiencePreferencesUpdate["careerLevel"] : null,
      location: location.trim() || null,
      acquisitionSource: acquisitionSource || null,
      acquisitionDetail: acquisitionDetailDeclined ? null : acquisitionDetail.trim() || null,
      acquisitionDetailDeclined,
      interests: splitEntries(interestText),
      contentTypes: contentTypes as PublicAudiencePreferencesUpdate["contentTypes"],
      careerLevels: careerLevels as PublicAudiencePreferencesUpdate["careerLevels"],
      crafts: splitEntries(craftText),
      allOpportunities,
    };
    try {
      const { managementToken: _legacyToken, ...fields } = update;
      const result = accessToken
        ? await updateVerifiedSubscriptionPreferences({ ...fields, accessToken })
        : await updatePublicSubscriptionPreferences(update);
      setLoadedPreferences(result);
      setSavedMessage("Your preferences have been updated.");
    } catch (reason) {
      if (accessToken && isExpiredAccess(reason)) clearAccess();
      setError(accessToken ? "We couldn't update preferences. Your verification may have expired; request a new code." : "We couldn't update preferences. Please check your link and try again.");
    } finally { setBusyAction(""); }
  }

  async function unsubscribe() {
    if (busyAction) return;
    const managementToken = accessToken ? "" : normalizedToken();
    if (!accessToken && !managementToken) {
      setError("Please paste the complete personal link you saved when you signed up.");
      return;
    }
    setBusyAction("unsubscribe");
    setError("");
    try {
      if (accessToken) {
        await unsubscribeVerifiedSubscription({ accessToken });
        clearAccess();
      } else await unsubscribePublicSubscription({ managementToken });
      setDone(true);
      setPreferences(null);
    } catch (reason) {
      if (accessToken && isExpiredAccess(reason)) clearAccess();
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
              <p>Verify your email to manage preferences or unsubscribe. We send a code only for this request, not opportunity alerts. For a privacy request or help, email <a href="mailto:opportunities@baileyopportunities.com">opportunities@baileyopportunities.com</a>.</p>
             {done ? <div role="status" data-testid="status-unsubscribed">
              <h2>Request processed</h2>
               <p>Your subscription has been stopped. If you used an older private link, any subscription associated with it is now stopped.</p>
              <Link href="/">Return to the hub</Link>
             </div> : <>
              {!accessToken && <>
                <form className="hetv-subscription" onSubmit={requestCode}>
                  <h2>Verify your email</h2>
                  <p>Enter the email address you signed up with. If it has an active subscription and delivery is available, we'll send a six-digit code from hetv@gentraxtech.com. The code expires in 10 minutes.</p>
                  <label htmlFor="verification-email">Email address</label>
                  <input id="verification-email" type="email" required maxLength={254} autoComplete="email"
                    value={email} disabled={!!busyAction} onChange={event => {
                      setEmail(event.target.value); setCodeRequested(false); setPreferences(null); setError("");
                    }} />
                  <button type="submit" disabled={!!busyAction}>{busyAction === "request" ? "Sending…" : "Send verification code"}</button>
                </form>
                {codeRequested && <form className="hetv-subscription" onSubmit={verifyCode}>
                  <label htmlFor="verification-code">Six-digit verification code</label>
                  <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code"
                    pattern="[0-9]{6}" maxLength={6} required value={code} disabled={!!busyAction}
                    onChange={event => setCode(event.target.value)} />
                  <button type="submit" disabled={!!busyAction}>{busyAction === "verify" ? "Verifying…" : "Verify and manage"}</button>
                </form>}
                {verificationMessage && <p role="status">{verificationMessage}</p>}
              </>}
              {!showLegacyLink && !accessToken && <button type="button" onClick={() => setShowLegacyLink(true)} data-testid="button-existing-link">I already have a private link</button>}
              {(showLegacyLink || accessToken) && <form className="hetv-subscription" onSubmit={accessToken ? event => event.preventDefault() : loadPreferences}>
               {!accessToken && <>
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
               </>}
               {accessToken && <h2>Manage your preferences</h2>}
               <button type="button" onClick={unsubscribe} disabled={!!busyAction || (!accessToken && !token.trim())} data-testid="button-unsubscribe">
                {busyAction === "unsubscribe" ? "Processing…" : "Unsubscribe"}
              </button>
               {preferences && <>
                 {!accessToken && <h2>Manage your preferences</h2>}
                 <p>Your details are shown only after your email or private link has been verified.</p>
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
                 <select id="manage-source" value={isReferralSource(acquisitionSource) ? acquisitionSource : acquisitionSource ? "__legacy__" : ""}
                   disabled={!!busyAction} aria-describedby="manage-source-hint"
                   onChange={event => {
                     setAcquisitionSource(event.target.value === "__legacy__" ? acquisitionSource : event.target.value as ReferralSource | "");
                     setAcquisitionDetail("");
                     setAcquisitionDetailDeclined(false);
                   }}>
                   <option value="">Not specified</option>
                   {acquisitionSource && !isReferralSource(acquisitionSource) &&
                     <option value="__legacy__">Existing response: {acquisitionSource}</option>}
                   {referralSources.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                 </select>
                 <p id="manage-source-hint">This optional answer helps us understand how people find HETV opportunities.</p>
                 {!!acquisitionSource && <>
                   <label htmlFor="manage-source-detail">{referralPrompt(acquisitionSource)} (optional)</label>
                   <input id="manage-source-detail" type="text" maxLength={500} value={acquisitionDetail}
                     disabled={!!busyAction || acquisitionDetailDeclined} aria-describedby="manage-source-detail-hint"
                     onChange={event => setAcquisitionDetail(event.target.value)} />
                   <p id="manage-source-detail-hint">You can include a person’s name if they referred you. Please do not include private group content.</p>
                   <label className="hetv-subscription-check">
                     <input type="checkbox" checked={acquisitionDetailDeclined} disabled={!!busyAction}
                       onChange={event => {
                         setAcquisitionDetailDeclined(event.target.checked);
                         if (event.target.checked) setAcquisitionDetail("");
                       }} />
                     <span>Prefer not to say more</span>
                   </label>
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
              </form>}
              {error && <p role="alert">{error}</p>}
              </>}
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}