import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useSubmitContactEnquiry } from "@workspace/api-client-react";
import { MobileMenu, SiteFooter, SiteHeader } from "../components/layout";
import "./contact.css";

export const CONTACT_EMAIL = "admin@HETVopportunities.com";
const TITLE = "Contact Us | HETV Opportunities Hub";
const DESCRIPTION = "Send the HETV Opportunities Hub team a question about roles, training, development programmes or the Hub itself.";

type Field = "name" | "email" | "subject" | "message";
type Values = Record<Field, string>;
const LIMITS: Record<Field, number> = { name: 100, email: 254, subject: 160, message: 5000 };
const LABELS: Record<Field, string> = { name: "Your name", email: "Email address", subject: "Subject", message: "Message" };
const EMPTY: Values = { name: "", email: "", subject: "", message: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(values: Values) {
  const errors: Partial<Record<Field, string>> = {};
  (Object.keys(LIMITS) as Field[]).forEach((field) => {
    const v = values[field].trim();
    if (!v) errors[field] = `Please enter ${field === "email" ? "your email address" : field === "name" ? "your name" : `a ${field}`}.`;
    else if (v.length > LIMITS[field]) errors[field] = `${LABELS[field]} must be ${LIMITS[field]} characters or fewer.`;
  });
  if (!errors.email && !EMAIL_RE.test(values.email.trim())) errors.email = "Please enter a valid email address, like name@example.com.";
  return errors;
}

function newRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
}

function useMeta(name: string, content: string, attr: "name" | "property" = "name") {
  useEffect(() => {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
    const created = !el;
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
    const previous = el.getAttribute("content");
    el.setAttribute("content", content);
    return () => {
      if (created) el?.remove();
      else if (previous !== null) el?.setAttribute("content", previous);
      else el?.removeAttribute("content");
    };
  }, [name, content, attr]);
}

export function ContactPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const lastScrollY = useRef(0);

  const [values, setValues] = useState<Values>(EMPTY);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [successMessage, setSuccessMessage] = useState("");
  const lockRef = useRef(false);
  const requestRef = useRef<{ key: string; id: string } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const mutation = useSubmitContactEnquiry({ mutation: { retry: false } });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = TITLE;
    return () => { document.title = previousTitle; };
  }, []);
  useMeta("description", DESCRIPTION);
  useMeta("og:title", TITLE, "property");
  useMeta("og:description", DESCRIPTION, "property");
  useMeta("og:type", "website", "property");

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      setScrolled(current > 38);
      if (current < 20 || current < lastScrollY.current - 5) setHeaderHidden(false);
      else if (current > lastScrollY.current + 8 && current > 90 && !menuOpen) {
        if (!(headerRef.current && document.activeElement && headerRef.current.contains(document.activeElement))) setHeaderHidden(true);
      }
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  useEffect(() => {
    if (status === "error") errorRef.current?.focus();
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const update = (field: Field, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lockRef.current) return;
    const found = validateContact(values);
    setErrors(found);
    const first = (Object.keys(LIMITS) as Field[]).find((f) => found[f]);
    if (first) { fieldRefs.current[first]?.focus(); return; }

    const data = {
      name: values.name.trim(),
      email: values.email.trim(),
      subject: values.subject.trim(),
      message: values.message.trim(),
      ...(website ? { website: website.slice(0, 200) } : {}),
    };
    const key = JSON.stringify(data);
    if (!requestRef.current || requestRef.current.key !== key) requestRef.current = { key, id: newRequestId() };

    lockRef.current = true;
    setStatus("idle");
    try {
      const result = await mutation.mutateAsync({ data: { ...data, requestId: requestRef.current.id } });
      if (result?.status === "accepted") {
        setSuccessMessage(result.message);
        setValues(EMPTY);
        setWebsite("");
        requestRef.current = null;
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      lockRef.current = false;
    }
  };

  const pending = mutation.isPending;
  const remaining = LIMITS.message - values.message.length;

  const renderField = (field: Field, type: string, autoComplete: string, multiline = false) => {
    const id = `contact-${field}`;
    const err = errors[field];
    const describedBy = [field === "message" ? "contact-message-count" : "", err ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
    const common = {
      id,
      name: field,
      value: values[field],
      required: true,
      maxLength: LIMITS[field],
      autoComplete,
      disabled: pending,
      "aria-invalid": err ? true : undefined,
      "aria-describedby": describedBy,
      "data-testid": `input-contact-${field}`,
    } as const;
    return (
      <div className={`contact-field${err ? " has-error" : ""}`}>
        <label htmlFor={id}>{LABELS[field]} <span className="contact-required" aria-hidden="true">required</span></label>
        {multiline ? (
          <textarea {...common} rows={8} ref={(el) => { fieldRefs.current[field] = el; }} onChange={(e) => update(field, e.target.value)} />
        ) : (
          <input {...common} type={type} ref={(el) => { fieldRefs.current[field] = el; }} onChange={(e) => update(field, e.target.value)} />
        )}
        {field === "message" && (
          <span id="contact-message-count" className={`contact-count${remaining < 200 ? " is-low" : ""}`} data-testid="text-contact-message-count">
            {values.message.length} / {LIMITS.message} characters
          </span>
        )}
        {err && <span id={`${id}-error`} className="contact-error" data-testid={`error-contact-${field}`}>{err}</span>}
      </div>
    );
  };

  return (
    <div className="larkin2-page legal-page hetv-contact-page" id="top">
      <a className="larkin2-skip" href="#content" data-testid="link-skip-content">Skip to content</a>
      <SiteHeader scrolled={scrolled} headerHidden={headerHidden} menuOpen={menuOpen} setMenuOpen={setMenuOpen} headerRef={headerRef} menuButtonRef={menuButtonRef} />
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuButtonRef={menuButtonRef} />
      <main id="content">
        <header className="legal-hero">
          <h1>Contact Us</h1>
          <p>Questions about a role, a training course or a development programme? Send us a note and the team will pick it up.</p>
        </header>

        <div className="contact-layout">
          <section className="contact-form-wrap" aria-labelledby="contact-form-heading">
            <h2 id="contact-form-heading">Send an enquiry</h2>
            <p className="contact-lede">All four fields are required. Before writing, the <Link href="/faqs" data-testid="link-contact-faqs-inline">FAQs</Link> may already answer your question.</p>

            {status === "success" ? (
              <div ref={successRef} tabIndex={-1} className="contact-notice is-success" role="status" data-testid="status-contact-success">
                <h3>Enquiry accepted for delivery</h3>
                <p>{successMessage || "Your enquiry has been accepted for delivery."} The team can reply using the email address you provided.</p>
                <button type="button" className="larkin2-btn secondary" onClick={() => setStatus("idle")} data-testid="button-contact-another">Send another enquiry</button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={onSubmit} noValidate aria-busy={pending} data-testid="form-contact">
                {status === "error" && (
                  <div ref={errorRef} tabIndex={-1} className="contact-notice is-error" role="alert" data-testid="status-contact-error">
                    <h3>We couldn't send your enquiry.</h3>
                    <p>Your message is still here. Try again in a moment, or email us directly at <a href={`mailto:${CONTACT_EMAIL}`} data-testid="link-contact-error-email">{CONTACT_EMAIL}</a>.</p>
                  </div>
                )}
                <div className="contact-row">
                  {renderField("name", "text", "name")}
                  {renderField("email", "email", "email")}
                </div>
                {renderField("subject", "text", "off")}
                {renderField("message", "text", "off", true)}

                <div className="contact-honeypot" aria-hidden="true">
                  <label htmlFor="contact-website">Website</label>
                  <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} maxLength={200} onChange={(e) => setWebsite(e.target.value)} data-testid="input-contact-website" />
                </div>

                <p className="contact-privacy" data-testid="text-contact-privacy">
                  We use these details only to respond to your enquiry. Sending this form doesn't sign you up to any newsletter or updates, and please don't include attachments, CV links you'd rather keep private or sensitive personal information. See our <Link href="/privacy" data-testid="link-contact-privacy">Privacy Notice</Link>.
                </p>
                <div className="contact-actions">
                  <button type="submit" className="larkin2-btn" disabled={pending} data-testid="button-contact-submit">
                    {pending ? "Sending…" : "Send enquiry"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <aside className="contact-aside" aria-label="Other ways to reach us">
            <div className="contact-aside-block">
              <span className="larkin2-eyebrow">Email</span>
              <a className="contact-email" href={`mailto:${CONTACT_EMAIL}`} data-testid="link-contact-email">{CONTACT_EMAIL}</a>
              <p>Prefer your own inbox? Write to us directly.</p>
            </div>
            <div className="contact-aside-block">
              <span className="larkin2-eyebrow">Before you write</span>
              <p>Common questions about applications and feedback are covered in the <Link href="/faqs" data-testid="link-contact-faqs">FAQs</Link>. We can't offer individual feedback on applications.</p>
            </div>
            <div className="contact-aside-block">
              <span className="larkin2-eyebrow">Registered office</span>
              <p data-testid="text-contact-registered-office">Larkin AV Limited and Bailey Productions Limited<br />21 Poland Street, Third Floor<br />London, England, W1F 8QG</p>
              <p className="contact-aside-note">This is a registered office, not a walk-in office. Please get in touch by email or the form.</p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
