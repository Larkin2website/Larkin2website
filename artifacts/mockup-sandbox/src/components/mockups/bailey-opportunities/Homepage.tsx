import { FormEvent, type CSSProperties, useEffect, useRef, useState } from "react";
import "./_group.css";

const paths = [
  ["01", "Never worked in film or TV", "First Credit Work Experience is built for people with no previous professional industry experience. Three days of training before you start, then a paid placement inside a department on the production, then six months of alumni masterclasses after it ends. No CV history required. No contacts required.", "Learn about First Credit"],
  ["02", "Already directing, want to move into HETV", "The Creative Leadership Shadowing Programme: Director Pathway is for freelance directors with at least one directing or 2nd-unit credit on a distributed feature or an HETV drama. A paid six-week placement, spread across prep, shoot and post.", "Learn about the Director Pathway"],
  ["03", "Already producing, want to move into HETV", "The Creative Leadership Shadowing Programme: Producer Pathway is for freelance producers with at least three narrative producing credits. A paid placement of up to fourteen weeks, across prep, production and post.", "Learn about the Producer Pathway"],
  ["04", "Looking for a crew role", "Paid crew positions are posted as the production needs them, across every department from Accounts to VFX. Postings open and close quickly.", "View current role status"],
];

const commitments = [
  ["01", "Every placement on this site is paid.", "Work experience, shadowing, crew roles: all of it. We do not run unpaid placements."],
  ["02", "We publish everything openly.", "Every opportunity is advertised here and assessed through the published process. You do not need industry contacts."],
  ["03", "We will always give you a date.", "Every programme tells you when applications close, when you will hear back, and by when you should assume it was not this time."],
  ["04", "We cannot give individual feedback.", "Application volumes are high enough that personal responses to everyone are not realistic. It is not a reflection of your application."],
  ["05", "We do not accept speculative CVs.", "Sign up instead and we will tell you the moment something opens."],
];

type MaskedLinkProps = {
  href: string;
  children: string;
  className?: string;
  onClick?: () => void;
};

function MaskedLink({ href, children, className = "", onClick }: MaskedLinkProps) {
  return (
    <a className={`bailey-link ${className}`} href={href} onClick={onClick} aria-label={children}>
      <span className="bailey-link-label" aria-hidden="true">
        <span>{children}</span>
        <span>{children}</span>
      </span>
      <span className="bailey-link-arrow" aria-hidden="true">↗</span>
    </a>
  );
}

function IntroOverlay({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduced = false;
    }
    if (reduced) {
      onComplete();
      return;
    }
    const shortTimer = window.setTimeout(onComplete, 1450);
    const safeTimer = window.setTimeout(onComplete, 2400);
    return () => {
      window.clearTimeout(shortTimer);
      window.clearTimeout(safeTimer);
    };
  }, [onComplete]);

  return (
    <div className="bailey-intro-overlay" role="status" aria-label="Larkin2 loading">
      <div className="bailey-intro-wordmark">
        <span>Larkin2</span>
        <i aria-hidden="true" />
        <span>Opportunities</span>
      </div>
      <div className="bailey-intro-foot">
        <span>Official production opportunities</span>
        <span>London</span>
      </div>
    </div>
  );
}

export function Homepage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [introVisible, setIntroVisible] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  const finishIntro = () => {
    try {
      window.sessionStorage.setItem("larkin2-intro-seen", "true");
    } catch {
      // Session storage can be unavailable in privacy-restricted previews.
    }
    setIntroVisible(false);
  };

  useEffect(() => {
    let seen = false;
    let reduced = false;
    const previewMode = new URLSearchParams(window.location.search).has("no-intro");
    try {
      seen = window.sessionStorage.getItem("larkin2-intro-seen") === "true";
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      seen = false;
    }
    if (!seen && !reduced && !previewMode) setIntroVisible(true);
  }, []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const current = window.scrollY;
        setScrolled(current > 38);
        if (current < 20 || current < lastScrollY.current - 5) {
          setHeaderHidden(false);
        } else if (current > lastScrollY.current + 8 && current > 90 && !menuOpen) {
          const active = document.activeElement;
          const focusInHeader = !!(headerRef.current && active && headerRef.current.contains(active));
          if (!focusInHeader) setHeaderHidden(true);
        }
        lastScrollY.current = current;
        frame = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [menuOpen]);

  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = "";
      menuButtonRef.current?.focus();
      return;
    }
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !menuPanelRef.current) return;
      const focusable = Array.from(menuPanelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="bailey-page">
      {introVisible && <IntroOverlay onComplete={finishIntro} />}
      <a className="bailey-skip" href="#content">Skip to content</a>

      <header
        ref={headerRef}
        className={`bailey-top ${scrolled ? "is-scrolled" : ""} ${headerHidden ? "is-hidden" : ""}`}
      >
        <a href="#top" className="bailey-mark" aria-label="Larkin2 home">Larkin2<span aria-hidden="true">.</span></a>
        <nav className="bailey-nav" aria-label="Main navigation">
          <a className="bailey-nav-link" href="#paths" aria-current="page">Opportunities</a>
          <MaskedLink href="#signup">Sign up</MaskedLink>
        </nav>
        <button
          ref={menuButtonRef}
          type="button"
          className="bailey-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(true)}
        >
          <span>{menuOpen ? "Close" : "Menu"}</span>
          <i aria-hidden="true" />
        </button>
      </header>

      <aside
        ref={menuPanelRef}
        id="mobile-menu"
        className={`bailey-mobile-menu ${menuOpen ? "is-open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
      >
        <div className="bailey-mobile-menu-head">
          <span className="bailey-mobile-label">Larkin2 / navigation</span>
          <button
            ref={closeButtonRef}
            type="button"
            className="bailey-menu-close"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            Close <span aria-hidden="true">×</span>
          </button>
        </div>
        <nav className="bailey-mobile-nav" aria-label="Mobile main navigation">
          <a href="#top" onClick={closeMenu}>Home <span>01</span></a>
          <a href="#paths" onClick={closeMenu}>Opportunities <span>02</span></a>
          <a href="#commitments" onClick={closeMenu}>Our commitments <span>03</span></a>
          <a href="#about" onClick={closeMenu}>About Larkin2 <span>04</span></a>
          <a href="#signup" onClick={closeMenu}>Sign up <span>05</span></a>
        </nav>
        <div className="bailey-mobile-contact">
          <span>Questions about an opportunity?</span>
          <a href="mailto:opportunities@baileyopportunities.com" onClick={closeMenu}>Contact us ↗</a>
        </div>
      </aside>

      <section className="bailey-hero-shell" id="top" aria-labelledby="hero-title">
        <div className="bailey-hero-stage">
          <div className="bailey-hero-media" role="img" aria-label="Film crew working with practical lights and camera equipment on a London production" />
          <div className="bailey-hero-shade" />
          <div className="bailey-hero-content bailey-reveal">
            <div className="bailey-kicker"><span className="bailey-dot" /> Official opportunities / London</div>
            <h1 className="bailey-h1" id="hero-title">
              <span className="bailey-mask"><span>Larkin2</span></span>
            </h1>
            <div className="bailey-sub bailey-mask"><span>Roles &amp; Opportunities</span></div>
            <p className="bailey-intro bailey-mask"><span>Your central hub for jobs, training and development on Larkin2.</span></p>
            <div className="bailey-actions">
              <MaskedLink href="#roles" className="bailey-btn">View current role status</MaskedLink>
              <MaskedLink href="#paths" className="bailey-btn secondary">Explore opportunities</MaskedLink>
              <MaskedLink href="#signup" className="bailey-btn secondary">Sign up for updates</MaskedLink>
            </div>
          </div>
          <div className="bailey-hero-meta">
            <span>Scroll to enter the production</span>
            <span className="bailey-scroll-line" aria-hidden="true" />
            <span>01 — 06</span>
          </div>
        </div>
      </section>

      <div id="content">
        <section className="bailey-section bailey-production" aria-labelledby="production-title">
          <div className="bailey-section-intro bailey-reveal" data-reveal>
            <div>
              <div className="bailey-eyebrow">The production / 01</div>
              <h2 className="bailey-title" id="production-title"><span className="bailey-mask"><span>One place, and it is the real one</span></span></h2>
            </div>
            <div className="bailey-copy">
              <p>This is where Larkin2 hires, trains, and opens up routes in.</p>
              <p>Every crew role, every placement, every shadowing week listed here is a real position on the production, not an exercise running alongside it. The site is operated by the company producing Larkin2, and every hiring and selection decision is made by that company.</p>
              <p>Opportunities can open and close at short notice, so it is worth checking back, or signing up so we can tell you.</p>
              <div className="bailey-quote">If it is not on this site, it is not one of ours.</div>
              <MaskedLink href="#paths">Explore opportunities</MaskedLink>
            </div>
          </div>
          <figure className="bailey-media-reveal" data-reveal>
            <img className="bailey-image" src="/__mockup/images/bailey-craft.jpg" width="1600" height="1032" loading="lazy" alt="Hands working with a practical light and camera equipment on set" />
            <figcaption className="bailey-image-caption"><span>Set craft / North London</span><span>Larkin2 production</span></figcaption>
          </figure>
        </section>

        <section className="bailey-section bailey-paths" id="paths" aria-labelledby="paths-title">
          <div className="bailey-eyebrow bailey-reveal" data-reveal>Find your way in / 02</div>
          <h2 className="bailey-title bailey-reveal" data-reveal id="paths-title"><span className="bailey-mask"><span>Three ways in, depending on where you are starting</span></span></h2>
          <p className="bailey-small bailey-reveal" data-reveal>Not everyone arrives from the same place, so we run separate routes. Find the one that matches where you are now.</p>
          <div className="bailey-role-status" id="roles" data-reveal>
            <div><span className="bailey-status-dot" /> Current role status</div>
            <strong>Paid crew positions are posted as the production needs them.</strong>
            <MaskedLink href="#signup">Sign up to hear when something opens</MaskedLink>
          </div>
          <div className="bailey-path-grid">
            {paths.map(([num, title, copy, cta], index) => (
              <article className="bailey-path bailey-reveal" data-reveal key={num} style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}>
                <span className="bailey-path-num">{num}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <MaskedLink href={num === "04" ? "#roles" : "#signup"}>{cta}</MaskedLink>
              </article>
            ))}
          </div>
        </section>

        <section className="bailey-section bailey-commit" id="commitments" aria-labelledby="commit-title">
          <div className="bailey-eyebrow bailey-reveal" data-reveal>The candid commitments / 03</div>
          <h2 className="bailey-title bailey-reveal" data-reveal id="commit-title"><span className="bailey-mask"><span>What we’ll tell you straight</span></span></h2>
          <p className="bailey-small bailey-reveal" data-reveal>Uncertainty is one of the reasons people give up on this industry before they start. So here is what we commit to before you apply.</p>
          <div className="bailey-commit-list">
            {commitments.map(([num, title, copy], index) => (
              <div className="bailey-commit-item bailey-reveal" data-reveal key={num} style={{ "--reveal-delay": `${index * 70}ms` } as CSSProperties}>
                <b>{num}</b>
                <div><h3>{title}</h3><p>{copy}</p></div>
              </div>
            ))}
          </div>
          <MaskedLink href="#signup" className="bailey-btn">Sign up for updates</MaskedLink>
        </section>

        <section className="bailey-section bailey-culture" aria-labelledby="culture-title">
          <div className="bailey-grid">
            <div className="bailey-reveal" data-reveal>
              <div className="bailey-eyebrow">Production &amp; culture / 04</div>
              <h2 className="bailey-title" id="culture-title"><span className="bailey-mask"><span>Who gets to work here</span></span></h2>
              <p className="bailey-copy">We believe everyone should have the opportunity to work in film and television, regardless of background, experience level, or personal circumstances.</p>
              <MaskedLink href="#paths">Explore opportunities</MaskedLink>
            </div>
            <figure className="bailey-media-reveal" data-reveal>
              <img className="bailey-image" src="/__mockup/images/bailey-crew.jpg" width="1200" height="1320" loading="lazy" alt="Film crew gathered around a monitor on a soundstage" />
              <figcaption className="bailey-image-caption"><span>On set / Larkin2</span><span>Production &amp; culture</span></figcaption>
            </figure>
          </div>
          <p className="bailey-rule bailey-small">We work with training providers, community organisations and regional talent networks to reach people who might not otherwise hear about opportunities like these. On set and in the office, we expect respect, collaboration and genuine support.</p>
        </section>

        <section className="bailey-section bailey-about" id="about" aria-labelledby="about-title">
          <div className="bailey-grid">
            <div className="bailey-reveal" data-reveal>
              <div className="bailey-eyebrow">About Larkin2 Opportunities / 05</div>
              <h2 className="bailey-title" id="about-title"><span className="bailey-mask"><span>The official home for the work behind Larkin2.</span></span></h2>
            </div>
            <div className="bailey-copy bailey-reveal" data-reveal>
              <p>This is the official home for every live role, work experience placement, shadowing programme and industry event connected to Larkin2. It is run by the production itself, not a third-party jobs board, which means what you see here is what is genuinely open.</p>
              <p>Whether you have crewed a dozen HETV dramas or have never been on a set, this is where you start.</p>
              <div className="bailey-actions">
                <MaskedLink href="#roles" className="bailey-btn">View current role status</MaskedLink>
                <MaskedLink href="mailto:opportunities@baileyopportunities.com" className="bailey-btn secondary">Contact us</MaskedLink>
              </div>
            </div>
          </div>
        </section>

        <section className="bailey-section bailey-signup" id="signup" aria-labelledby="signup-title">
          <div className="bailey-signup-layout bailey-reveal" data-reveal>
            <div>
              <div className="bailey-eyebrow">Stay close / 06</div>
              <h2 className="bailey-title" id="signup-title"><span className="bailey-mask"><span>Nothing open right now that fits?</span></span></h2>
            </div>
            <div>
              <p className="bailey-copy">Opportunities open at different points as the production moves through its schedule, which means there is no fixed calendar, and the gap between something opening and closing can be short. Sign up and we will tell you when something opens that you could actually apply for.</p>
              <p className="bailey-small">First Credit alone is planned to run three times across the production.</p>
              {subscribed ? (
                <div className="bailey-success" role="status">You’re on the list. We’ll be in touch when something opens.</div>
              ) : (
                <form className="bailey-form" onSubmit={submit}>
                  <label htmlFor="bailey-email">Email address</label>
                  <div className="bailey-form-row">
                    <input id="bailey-email" name="email" type="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                    <button type="submit">Subscribe <span aria-hidden="true">↗</span></button>
                  </div>
                </form>
              )}
              <div className="bailey-small bailey-signup-note">No spam. Unsubscribe anytime.</div>
            </div>
          </div>
        </section>
      </div>

      <footer className="bailey-foot">
        <div className="bailey-foot-brand"><span className="bailey-mark">Larkin2<span aria-hidden="true">.</span></span><p>Official production opportunities.</p></div>
        <div className="bailey-foot-col"><span>Explore</span><a href="#paths">Opportunities</a><a href="#commitments">Commitments</a><a href="#about">About Larkin2</a></div>
        <div className="bailey-foot-col"><span>Contact</span><a href="#signup">Sign up for updates</a><a href="mailto:opportunities@baileyopportunities.com">Contact us ↗</a></div>
        <div className="bailey-foot-bottom"><span>London / UK</span><span>© 60Forty Films</span><span>Official Larkin2 opportunities</span></div>
      </footer>
    </main>
  );
}