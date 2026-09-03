import { type FormEvent, type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import "./index.css";

const queryClient = new QueryClient();

const paths = [
  ["01", "Never worked in film or TV", "First Credit Work Experience is built for people with no previous professional industry experience. Three days of training before you start, then a paid placement inside a department on the production, then six months of alumni masterclasses after it ends. No CV history required. No contacts required.", "Learn about First Credit", "bailey-studio.jpg"],
  ["02", "Already directing, want to move into HETV", "The Creative Leadership Shadowing Programme: Director Pathway is for freelance directors with at least one directing or 2nd-unit credit on a distributed feature or an HETV drama. A paid six-week placement, spread across prep, shoot and post.", "Learn about the Director Pathway", "bailey-craft.jpg"],
  ["03", "Already producing, want to move into HETV", "The Creative Leadership Shadowing Programme: Producer Pathway is for freelance producers with at least three narrative producing credits. A paid placement of up to fourteen weeks, across prep, production and post.", "Learn about the Producer Pathway", "bailey-crew.jpg"],
] as const;

const commitments = [
  ["01", "Every placement on this site is paid.", "Work experience, shadowing, crew roles: all of it. We do not run unpaid placements.", "larkin2-commitment-paid.jpg"],
  ["02", "We publish everything openly.", "Every opportunity is advertised here and assessed through the published process. You do not need industry contacts.", "larkin2-commitment-open.jpg"],
  ["03", "We will always give you a date.", "Every programme tells you when applications close, when you will hear back, and by when you should assume it was not this time.", "larkin2-commitment-dates.jpg"],
  ["04", "We cannot give individual feedback.", "Application volumes are high enough that personal responses to everyone are not realistic. It is not a reflection of your application.", "larkin2-commitment-feedback.jpg"],
  ["05", "We do not accept speculative CVs.", "Sign up instead and we will tell you the moment something opens.", "larkin2-commitment-alerts.jpg"],
] as const;

type MaskedLinkProps = {
  href: string;
  children: string;
  className?: string;
  testId: string;
  onClick?: () => void;
};

function MaskedLink({ href, children, className = "", testId, onClick }: MaskedLinkProps) {
  return (
    <a className={`larkin2-link ${className}`} href={href} onClick={onClick} aria-label={children} data-testid={testId}>
      <span className="larkin2-link-label" aria-hidden="true">
        <span>{children}</span>
        <span>{children}</span>
      </span>
      <span className="larkin2-link-arrow" aria-hidden="true">↗</span>
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
    const timer = window.setTimeout(onComplete, 1450);
    const safeTimer = window.setTimeout(onComplete, 2400);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(safeTimer);
    };
  }, [onComplete]);

  return (
    <div className="larkin2-intro-overlay" role="status" aria-label="Larkin2 loading" data-testid="status-intro">
      <div className="larkin2-intro-wordmark">
        <span>Larkin2</span><i aria-hidden="true" /><span>Opportunities</span>
      </div>
      <div className="larkin2-intro-foot">
        <span>Official production opportunities</span><span>London</span>
      </div>
    </div>
  );
}

function Home() {
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
  const heroTrackRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const wasMenuOpen = useRef(false);

  const finishIntro = useCallback(() => {
    try {
      window.sessionStorage.setItem("larkin2-intro-seen", "true");
    } catch {
      // Session storage may be unavailable in privacy-restricted previews.
    }
    setIntroVisible(false);
  }, []);

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
        const heroTrack = heroTrackRef.current;
        if (heroTrack) {
          const travel = Math.max(1, heroTrack.offsetHeight - window.innerHeight);
          const morphTravel = travel * 0.75;
          heroTrack.style.setProperty("--hero-progress", Math.min(1, Math.max(0, current / morphTravel)).toFixed(4));
        }
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
      if (wasMenuOpen.current) menuButtonRef.current?.focus();
      wasMenuOpen.current = false;
      return;
    }
    wasMenuOpen.current = true;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !menuPanelRef.current) return;
      const focusable = Array.from(menuPanelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'));
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

  const closeMenu = () => setMenuOpen(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  return (
    <main className="larkin2-page" id="top">
      {introVisible && <IntroOverlay onComplete={finishIntro} />}
      <a className="larkin2-skip" href="#content" data-testid="link-skip-content">Skip to content</a>

      <header ref={headerRef} className={`larkin2-top ${scrolled ? "is-scrolled" : ""} ${headerHidden ? "is-hidden" : ""}`}>
        <a href="#top" className="larkin2-mark" aria-label="Larkin2 home" data-testid="link-home">
          Larkin2<span aria-hidden="true">.</span>
        </a>
        <nav className="larkin2-nav" aria-label="Main navigation">
          <a className="larkin2-nav-link" href="#paths" aria-current="page" data-testid="link-opportunities">Opportunities</a>
          <MaskedLink href="#signup" testId="link-signup-nav">Sign up</MaskedLink>
        </nav>
        <button
          ref={menuButtonRef}
          type="button"
          className="larkin2-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen(true)}
          data-testid="button-menu-toggle"
        >
          <span>{menuOpen ? "Close" : "Menu"}</span><i aria-hidden="true" />
        </button>
      </header>

      <aside
        ref={menuPanelRef}
        id="mobile-menu"
        className={`larkin2-mobile-menu ${menuOpen ? "is-open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
      >
        <div className="larkin2-mobile-menu-head">
          <span className="larkin2-mobile-label">Larkin2 / navigation</span>
          <button ref={closeButtonRef} type="button" className="larkin2-menu-close" onClick={closeMenu} aria-label="Close menu" data-testid="button-menu-close">
            Close <span aria-hidden="true">×</span>
          </button>
        </div>
        <nav className="larkin2-mobile-nav" aria-label="Mobile main navigation">
          <a href="#top" onClick={closeMenu} data-testid="link-mobile-home">Home <span>01</span></a>
          <a href="#paths" onClick={closeMenu} data-testid="link-mobile-opportunities">Opportunities <span>02</span></a>
          <a href="#commitments" onClick={closeMenu} data-testid="link-mobile-commitments">Our commitments <span>03</span></a>
          <a href="#about" onClick={closeMenu} data-testid="link-mobile-about">About Larkin2 <span>04</span></a>
          <a href="#signup" onClick={closeMenu} data-testid="link-mobile-signup">Sign up <span>05</span></a>
        </nav>
        <div className="larkin2-mobile-contact">
          <span>Questions about an opportunity?</span>
          <a href="mailto:opportunities@baileyopportunities.com" onClick={closeMenu} data-testid="link-mobile-contact">Contact us ↗</a>
        </div>
      </aside>

      <section ref={heroTrackRef} className="larkin2-hero-track" aria-labelledby="hero-title">
        <div className="larkin2-hero-sticky">
          <div className="larkin2-hero-bg" />
          <div className="larkin2-hero-stage">
            <div className="larkin2-hero-media-wrap">
              <div className="larkin2-hero-media" role="img" aria-label="Film crew working with practical lights and camera equipment on a London production" data-testid="img-hero-studio" />
            </div>
          <div className="larkin2-hero-shade" />
          <div className="larkin2-hero-content-wrap">
            <div className="larkin2-hero-content larkin2-reveal">
              <div className="larkin2-kicker"><span className="larkin2-dot" /> Official opportunities / London</div>
              <h1 className="larkin2-h1" id="hero-title"><span className="larkin2-mask"><span>Larkin2</span></span></h1>
              <div className="larkin2-sub larkin2-mask"><span>Roles &amp; Opportunities</span></div>
              <p className="larkin2-intro larkin2-mask"><span>Your central hub for jobs, training and development on Larkin2.</span></p>
              <div className="larkin2-actions">
                <MaskedLink href="#roles" className="larkin2-btn" testId="link-hero-role-status">View current role status</MaskedLink>
                <MaskedLink href="#paths" className="larkin2-btn secondary" testId="link-hero-opportunities">Explore opportunities</MaskedLink>
                <MaskedLink href="#signup" className="larkin2-btn secondary" testId="link-hero-signup">Sign up for updates</MaskedLink>
              </div>
            </div>
          </div>
          <div className="larkin2-hero-meta-wrap">
            <div className="larkin2-hero-meta">
              <span>Scroll to enter the production</span><span className="larkin2-scroll-line" aria-hidden="true" /><span>01 — 06</span>
            </div>
          </div>
        </div>
        </div>
      </section>

      <div id="content">
        <section className="larkin2-section larkin2-production" aria-labelledby="production-title">
          <div className="larkin2-section-intro larkin2-reveal" data-reveal>
            <div>
              <div className="larkin2-eyebrow">The production / 01</div>
              <h2 className="larkin2-title" id="production-title"><span className="larkin2-mask"><span>One place, and it is the real one</span></span></h2>
            </div>
            <div className="larkin2-copy">
              <p>This is where Larkin2 hires, trains, and opens up routes in.</p>
              <p>Every crew role, every placement, every shadowing week listed here is a real position on the production, not an exercise running alongside it. The site is operated by the company producing Larkin2, and every hiring and selection decision is made by that company.</p>
              <p>Opportunities can open and close at short notice, so it is worth checking back, or signing up so we can tell you.</p>
              <div className="larkin2-quote">If it is not on this site, it is not one of ours.</div>
              <MaskedLink href="#paths" testId="link-production-opportunities">Explore opportunities</MaskedLink>
            </div>
          </div>
        </section>

        <section className="larkin2-section larkin2-paths" id="paths" aria-labelledby="paths-title">
          <div className="larkin2-paths-header larkin2-reveal" data-reveal>
            <div className="larkin2-paths-intro">
              <div className="larkin2-eyebrow">Find your way in / 02</div>
              <h2 className="larkin2-title" id="paths-title"><span className="larkin2-mask"><span>Three ways in, depending on where you are starting</span></span></h2>
              <p className="larkin2-small">Not everyone arrives from the same place, so we run separate routes. Find the one that matches where you are now.</p>
            </div>
            <div className="larkin2-role-status" id="roles">
              <div className="larkin2-role-status-label"><span className="larkin2-status-dot" /> Current role status</div>
              <h3 className="larkin2-role-status-title">Looking for a crew role / 04</h3>
              <strong data-testid="status-crew-roles">Paid crew positions are posted as the production needs them, across every department from Accounts to VFX. Postings open and close quickly.</strong>
              <div className="larkin2-role-status-actions">
                <MaskedLink href="#roles" testId="link-opportunity-04">View current role status</MaskedLink>
                <MaskedLink href="#signup" testId="link-role-status-signup">Sign up to hear when something opens</MaskedLink>
              </div>
            </div>
          </div>
          <div className="larkin2-path-grid">
            {paths.map(([num, title, copy, cta, img], index) => (
              <article className="larkin2-path larkin2-reveal" data-reveal key={num} style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties} data-testid={`card-opportunity-${num}`}>
                <div className="larkin2-path-bg">
                  <img src={`/larkin2-opportunities/images/${img}`} alt="" role="presentation" loading="lazy" />
                  <div className="larkin2-path-gradient" />
                </div>
                <div className="larkin2-path-top">
                  <span className="larkin2-path-label" data-testid={`text-opportunity-number-${num}`}>Pathway / {num}</span>
                </div>
                <div className="larkin2-path-bottom">
                  <div className="larkin2-path-bottom-main">
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                  <div className="larkin2-path-cta">
                    <MaskedLink href="#signup" testId={`link-opportunity-${num}`}>{cta}</MaskedLink>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="larkin2-section larkin2-commit" id="commitments" aria-labelledby="commit-title">
          <div className="larkin2-commit-header">
            <div className="larkin2-commit-header-text">
              <div className="larkin2-eyebrow larkin2-reveal" data-reveal>The candid commitments / 03</div>
              <h2 className="larkin2-title larkin2-reveal" data-reveal id="commit-title"><span className="larkin2-mask"><span>What we’ll tell you straight</span></span></h2>
              <p className="larkin2-small larkin2-reveal" data-reveal>Uncertainty is one of the reasons people give up on this industry before they start. So here is what we commit to before you apply.</p>
            </div>
            <div className="larkin2-commit-header-cta larkin2-reveal" data-reveal>
              <MaskedLink href="#signup" className="larkin2-btn secondary" testId="link-commitments-signup">Sign up for updates</MaskedLink>
            </div>
          </div>
          <div className="larkin2-commit-stack">
            {commitments.map(([num, title, copy, img], index) => (
              <article 
                className="larkin2-commit-card larkin2-reveal" 
                data-reveal 
                key={num} 
                style={{ "--card-index": index, "--reveal-delay": `${index * 70}ms` } as CSSProperties} 
                data-testid={`item-commitment-${num}`}
              >
                <div className="larkin2-commit-card-inner">
                  <div className="larkin2-commit-card-content">
                    <div className="larkin2-commit-meta">Commitment / {num}</div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                  <div className="larkin2-commit-card-media">
                    <img src={`/larkin2-opportunities/images/${img}`} alt="" loading="lazy" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="larkin2-section larkin2-culture" aria-labelledby="culture-title">
          <div className="larkin2-grid">
            <div className="larkin2-reveal" data-reveal>
              <div className="larkin2-eyebrow">Production &amp; culture / 04</div>
              <h2 className="larkin2-title" id="culture-title"><span className="larkin2-mask"><span>Who gets to work here</span></span></h2>
              <p className="larkin2-copy">We believe everyone should have the opportunity to work in film and television, regardless of background, experience level, or personal circumstances.</p>
              <MaskedLink href="#paths" testId="link-culture-opportunities">Explore opportunities</MaskedLink>
            </div>
            <figure className="larkin2-media-reveal" data-reveal>
              <img className="larkin2-image" src="/larkin2-opportunities/images/bailey-crew.jpg" width="1200" height="1320" loading="lazy" alt="Film crew gathered around a monitor on a soundstage" data-testid="img-culture-crew" />
              <figcaption className="larkin2-image-caption"><span>On set / Larkin2</span><span>Production &amp; culture</span></figcaption>
            </figure>
          </div>
          <p className="larkin2-rule larkin2-small">We work with training providers, community organisations and regional talent networks to reach people who might not otherwise hear about opportunities like these. On set and in the office, we expect respect, collaboration and genuine support.</p>
        </section>

        <section className="larkin2-section larkin2-about" id="about" aria-labelledby="about-title">
          <div className="larkin2-grid">
            <div className="larkin2-reveal" data-reveal>
              <div className="larkin2-eyebrow">About Larkin2 Opportunities / 05</div>
              <h2 className="larkin2-title" id="about-title"><span className="larkin2-mask"><span>The official home for the work behind Larkin2.</span></span></h2>
            </div>
            <div className="larkin2-copy larkin2-reveal" data-reveal>
              <p>This is the official home for every live role, work experience placement, shadowing programme and industry event connected to Larkin2. It is run by the production itself, not a third-party jobs board, which means what you see here is what is genuinely open.</p>
              <p>Whether you have crewed a dozen HETV dramas or have never been on a set, this is where you start.</p>
              <div className="larkin2-actions">
                <MaskedLink href="#roles" className="larkin2-btn" testId="link-about-role-status">View current role status</MaskedLink>
                <MaskedLink href="mailto:opportunities@baileyopportunities.com" className="larkin2-btn secondary" testId="link-about-contact">Contact us</MaskedLink>
              </div>
            </div>
          </div>
        </section>

        <section className="larkin2-section larkin2-signup" id="signup" aria-labelledby="signup-title">
          <div className="larkin2-signup-layout larkin2-reveal" data-reveal>
            <div>
              <div className="larkin2-eyebrow">Stay close / 06</div>
              <h2 className="larkin2-title" id="signup-title"><span className="larkin2-mask"><span>Nothing open right now that fits?</span></span></h2>
            </div>
            <div>
              <p className="larkin2-copy">Opportunities open at different points as the production moves through its schedule, which means there is no fixed calendar, and the gap between something opening and closing can be short. Sign up and we will tell you when something opens that you could actually apply for.</p>
              <p className="larkin2-small">First Credit alone is planned to run three times across the production.</p>
              {subscribed ? (
                <div className="larkin2-success" role="status" data-testid="status-signup-success">You’re on the list. We’ll be in touch when something opens.</div>
              ) : (
                <form className="larkin2-form" onSubmit={submit} noValidate={false}>
                  <label htmlFor="larkin2-email">Email address</label>
                  <div className="larkin2-form-row">
                    <input id="larkin2-email" name="email" type="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} data-testid="input-signup-email" />
                    <button type="submit" data-testid="button-signup-submit">Subscribe <span aria-hidden="true">↗</span></button>
                  </div>
                </form>
              )}
              <div className="larkin2-small larkin2-signup-note">No spam. Unsubscribe anytime.</div>
            </div>
          </div>
        </section>
      </div>

      <footer className="larkin2-foot">
        <div className="larkin2-foot-brand"><span className="larkin2-mark">Larkin2<span aria-hidden="true">.</span></span><p>Official production opportunities.</p></div>
        <div className="larkin2-foot-col"><span>Explore</span><a href="#paths" data-testid="link-footer-opportunities">Opportunities</a><a href="#commitments" data-testid="link-footer-commitments">Commitments</a><a href="#about" data-testid="link-footer-about">About Larkin2</a></div>
        <div className="larkin2-foot-col"><span>Contact</span><a href="#signup" data-testid="link-footer-signup">Sign up for updates</a><a href="mailto:opportunities@baileyopportunities.com" data-testid="link-footer-contact">Contact us ↗</a></div>
        <div className="larkin2-foot-bottom"><span>London / UK</span><span>© 60Forty Films</span><span>Official Larkin2 opportunities</span></div>
      </footer>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;