import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  AudienceContentType,
  CareerLevel,
  createPublicSubscription,
  getPublicSubscriptionPreferences,
  useListPublicOpportunityOptions,
  type PublicSubscriptionInput,
} from "@workspace/api-client-react";
import { savedSubscriptionToken, saveSubscriptionToken, subscriptionLink } from "../lib/subscription-link";

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

function splitEntries(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function SubscriptionSignup() {
  const { data: opportunityOptions } = useListPublicOpportunityOptions();
  const [email, setEmail] = useState("");
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
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [managementToken, setManagementToken] = useState("");
  const [requestProcessed, setRequestProcessed] = useState(false);
  const [stored, setStored] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !consent) return;
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload: PublicSubscriptionInput = {
        email: email.trim(),
        consent: true,
        existingManagementToken: savedSubscriptionToken() || undefined,
        name: name.trim(),
        craft: craft.trim() || undefined,
        careerLevel: careerLevel ? careerLevel as PublicSubscriptionInput["careerLevel"] : undefined,
        location: location.trim() || undefined,
        acquisitionSource: acquisitionSource.trim() || undefined,
        acquisitionDetail: acquisitionDetail.trim() || undefined,
        interests: [...new Set([...interests, ...splitEntries(interestOther)])],
        contentTypes: contentTypes as PublicSubscriptionInput["contentTypes"],
        careerLevels: careerLevels as PublicSubscriptionInput["careerLevels"],
        crafts: [...new Set([...crafts, ...splitEntries(craftsOther)])],
        allOpportunities,
      };
      const result = await createPublicSubscription(payload);
      try {
        await getPublicSubscriptionPreferences({ managementToken: result.managementToken });
        const previousToken = savedSubscriptionToken();
        setManagementToken(result.managementToken);
        setStored(previousToken === result.managementToken
          ? true
          : previousToken ? false : saveSubscriptionToken(result.managementToken));
      } catch {
        // The create response intentionally does not reveal whether an email already exists.
        // Only expose a link after the token itself verifies.
        setManagementToken("");
      }
      setRequestProcessed(true);
      setEmail("");
    } catch {
      setError("We couldn't save your request. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  if (requestProcessed && !managementToken) {
    return (
      <div className="hetv-subscription">
        <div role="status">
          <h3>Request processed</h3>
          <p>We couldn’t verify a new preference or a working personal link. If you already subscribed, your original preferences and link are unchanged. No email has been sent.</p>
        </div>
        <Link href="/unsubscribe">Manage preferences with your original link</Link>
      </div>
    );
  }

  if (requestProcessed && managementToken) {
    const link = subscriptionLink(managementToken);
    return (
      <div className="hetv-subscription">
        <div role="status">
          <h3>Thank you for your interest</h3>
          <p>Your personal link was verified. If this was a new signup, these preferences are saved. Signing up again does not change an existing profile or restart a stopped subscription.</p>
        </div>
        <div className="hetv-subscription-link">
          <h4>Keep your personal unsubscribe link</h4>
          <p>No email has been sent. Keep this private link if you are new. If you already subscribed, this does not replace your original link or update your saved preferences; use your original link to manage them.</p>
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
      <label htmlFor="signup-name">Name</label>
      <input id="signup-name" type="text" autoComplete="name" required maxLength={160}
        value={name} onChange={event => setName(event.target.value)} disabled={busy} />
      <label htmlFor="signup-email">Email</label>
      <input id="signup-email" type="email" autoComplete="email" required maxLength={254}
        placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)}
        disabled={busy} data-testid="input-signup-email" />
      <label htmlFor="signup-craft">Your craft (optional)</label>
      <input id="signup-craft" type="text" maxLength={120} placeholder="e.g. Editing"
        value={craft} onChange={event => setCraft(event.target.value)} disabled={busy} />
      <label htmlFor="signup-career-level">Your career level (optional)</label>
      <select id="signup-career-level" value={careerLevel} onChange={event => setCareerLevel(event.target.value)} disabled={busy}>
        <option value="">Select a level</option>
        {careerOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <label htmlFor="signup-location">Location (optional)</label>
      <input id="signup-location" type="text" maxLength={160} placeholder="Town, city or region"
        value={location} onChange={event => setLocation(event.target.value)} disabled={busy} />
      <label htmlFor="signup-source">How did you hear about us? (optional)</label>
      <input id="signup-source" type="text" maxLength={120} value={acquisitionSource}
        onChange={event => setAcquisitionSource(event.target.value)} disabled={busy} />
      {acquisitionSource.trim() && <>
        <label htmlFor="signup-source-detail">Anything else about how you found us? (optional)</label>
        <input id="signup-source-detail" type="text" maxLength={500} value={acquisitionDetail}
          onChange={event => setAcquisitionDetail(event.target.value)} disabled={busy} />
      </>}
      <fieldset className="hetv-subscription-options">
        <legend>Interests (optional)</legend>
        {opportunityOptions?.departments.map((department) => (
          <label className="hetv-subscription-check" key={department}>
            <input type="checkbox" checked={interests.includes(department)} disabled={busy}
              onChange={event => setInterests(current => event.target.checked
                ? [...current, department] : current.filter(item => item !== department))} />
            <span>{department}</span>
          </label>
        ))}
        {!opportunityOptions?.departments.length && <p>Interest choices are temporarily unavailable; you can enter your interests below.</p>}
        <label htmlFor="signup-interests-other">Other interests, separated by commas</label>
        <input id="signup-interests-other" type="text" maxLength={500} value={interestOther}
          onChange={event => setInterestOther(event.target.value)} disabled={busy} />
      </fieldset>
      <fieldset className="hetv-subscription-options">
        <legend>Updates you are interested in (optional)</legend>
        {contentOptions.map(([value, label]) => (
          <label className="hetv-subscription-check" key={value}>
            <input type="checkbox" checked={contentTypes.includes(value)} disabled={busy}
              onChange={event => setContentTypes(current => event.target.checked
                ? [...current, value] : current.filter(item => item !== value))} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="hetv-subscription-options">
        <legend>Career levels you are interested in (optional)</legend>
        {careerOptions.map(([value, label]) => (
          <label className="hetv-subscription-check" key={value}>
            <input type="checkbox" checked={careerLevels.includes(value)} disabled={busy}
              onChange={event => setCareerLevels(current => event.target.checked
                ? [...current, value] : current.filter(item => item !== value))} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="hetv-subscription-options">
        <legend>Crafts you are interested in (optional)</legend>
        {opportunityOptions?.departments.map(department => (
          <label className="hetv-subscription-check" key={department}>
            <input type="checkbox" checked={crafts.includes(department)} disabled={busy}
              onChange={event => setCrafts(current => event.target.checked
                ? [...current, department] : current.filter(item => item !== department))} />
            <span>{department}</span>
          </label>
        ))}
        {!opportunityOptions?.departments.length && <p>Craft choices are temporarily unavailable; enter them below.</p>}
        <label htmlFor="signup-crafts-other">Other crafts, separated by commas</label>
        <input id="signup-crafts-other" type="text" maxLength={500} placeholder="e.g. Camera, Sound"
          value={craftsOther} onChange={event => setCraftsOther(event.target.value)} disabled={busy} />
      </fieldset>
      <label className="hetv-subscription-consent">
        <input type="checkbox" checked={allOpportunities} disabled={busy}
          onChange={event => setAllOpportunities(event.target.checked)} />
        <span>Include all opportunities, regardless of these preferences.</span>
      </label>
      <label className="hetv-subscription-consent">
        <input type="checkbox" required checked={consent} disabled={busy}
          onChange={event => setConsent(event.target.checked)} data-testid="checkbox-signup-consent" />
        <span>I want to receive updates. I agree to my email being stored so HETV Opportunities Hub can contact me about roles, training and development opportunities.</span>
      </label>
      <button type="submit" disabled={busy || !consent} data-testid="button-signup-submit">
        {busy ? "Saving your preference…" : "Sign Up"}
      </button>
      {error && <p role="alert">{error}</p>}
      <p>We are collecting interest; automated email alerts are not running yet, and no email will be sent. <Link href="/unsubscribe">Manage preferences or unsubscribe</Link> using your personal link. Read our <Link href="/privacy">Privacy Notice</Link>.</p>
    </form>
  );
}

export default SubscriptionSignup;