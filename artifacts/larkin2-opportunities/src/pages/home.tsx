import { type FormEvent, type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { OPPORTUNITIES } from "../data/opportunities";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";

let hasVisitedHomeThisPageLoad = false;

const commitments = [
  ["01", "Every placement on this site is paid.", "Work experience, shadowing, crew roles: all of it. We do not run unpaid placements.", "commitment-paid-camera-crew.webp"],
  ["02", "We publish everything openly.", "Every opportunity is advertised here and assessed through the published process. You do not need industry contacts.", "commitment-open-camera.webp"],
  ["03", "We will always give you a date.", "Every programme tells you when applications close, when you will hear back, and by when you should assume it was not this time.", "commitment-dates-calendar.webp"],
  ["04", "We cannot give individual feedback.", "Application volumes are high enough that personal responses to everyone are not realistic. It is not a reflection of your application.", "larkin2-commitment-feedback.jpg"],
  ["05", "We do not accept speculative CVs.", "Sign up instead and we will tell you the moment something opens.", "commitment-alerts-slate.webp"],
] as const;

function IntroOverlay({ onComplete }: { onComplete: () => void }) {
  const introFrames = [
    "bailey-craft.jpg",
    "larkin2-commitment-open.jpg",
    "bailey-crew.jpg",
    "larkin2-commitment-paid.jpg",
  ];

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
    const timer = window.setTimeout(onComplete, 3090);
    const safeTimer = window.setTimeout(onComplete, 4000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(safeTimer);
    };
  }, [onComplete]);

  return (
    <div className="larkin2-intro-overlay" role="status" aria-label="Larkin2 loading" data-testid="status-intro">
      <div className="larkin2-intro-bg" aria-hidden="true" />
      <div className="larkin2-intro-loading" aria-hidden="true">
        <span>Loading</span>
        <span className="larkin2-intro-count-window">
          <span className="larkin2-intro-count">
            <span>00</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span>
          </span>
        </span>
      </div>
      <div className="larkin2-intro-aperture" aria-hidden="true">
        <div className="larkin2-intro-reel">
          {introFrames.map((frame, index) => (
            <img
              key={frame}
              src={`/larkin2-opportunities/images/${frame}`}
              alt=""
              style={{ "--intro-frame": index } as CSSProperties}
            />
          ))}
          <img
            className="larkin2-intro-final-frame"
            src="/larkin2-opportunities/videos/hero-poster.webp"
            alt=""
          />
        </div>
        <span className="larkin2-intro-corner is-top-left" />
        <span className="larkin2-intro-corner is-top-right" />
        <span className="larkin2-intro-corner is-bottom-left" />
        <span className="larkin2-intro-corner is-bottom-right" />
      </div>
      <div className="larkin2-intro-brand" aria-hidden="true">
        <span>Larkin2</span><i />
      </div>
    </div>
  );
}

function CommitmentsCarousel() {
  const [active, setActive] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const pointerEndX = useRef<number | null>(null);
  const pointerEndY = useRef<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mql.matches);
      const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } catch {
      setReducedMotion(false);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (reducedMotion || isHovered || hasFocus || isInteracting) return;

    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % commitments.length);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [active, reducedMotion, isHovered, hasFocus, isInteracting]);

  const resetPointer = () => {
    pointerStartX.current = null;
    pointerStartY.current = null;
    pointerEndX.current = null;
    pointerEndY.current = null;
    setIsInteracting(false);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    pointerEndX.current = e.clientX;
    pointerEndY.current = e.clientY;
    setIsInteracting(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerStartX.current === null) return;
    pointerEndX.current = e.clientX;
    pointerEndY.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (
      pointerStartX.current === null ||
      pointerStartY.current === null ||
      pointerEndX.current === null ||
      pointerEndY.current === null
    ) return;
    const diffX = pointerStartX.current - pointerEndX.current;
    const diffY = pointerStartY.current - pointerEndY.current;
    
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0 && active < commitments.length - 1) {
        setActive(p => p + 1);
      } else if (diffX < 0 && active > 0) {
        setActive(p => p - 1);
      }
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetPointer();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      setActive(p => Math.min(commitments.length - 1, p + 1));
    } else if (e.key === "ArrowLeft") {
      setActive(p => Math.max(0, p - 1));
    }
  };

  return (
    <div 
      className="larkin2-carousel larkin2-reveal" 
      data-reveal
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setHasFocus(false);
        }
      }}
      tabIndex={0}
      aria-label="Commitments carousel"
      role="region"
    >
      <div className="larkin2-carousel-viewport">
        <div 
          className="larkin2-carousel-track" 
          style={{ 
            transform: `translateX(-${active * 100}%)`, 
            transition: reducedMotion ? 'none' : 'transform 0.6s var(--ease-cinematic)' 
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={resetPointer}
        >
          {commitments.map(([num, title, copy, img], index) => (
            <div 
              className="larkin2-carousel-slide" 
              aria-hidden={active !== index} 
              key={num}
              data-testid={`item-commitment-${num}`}
            >
              <div className="larkin2-commit-card-inner">
                <div className="larkin2-commit-card-content">
                  <div className="larkin2-commit-meta">Commitment / {num}</div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
                <div className="larkin2-commit-card-media">
                  <img src={`/larkin2-opportunities/images/${img}`} alt="" loading={index === 0 ? "eager" : "lazy"} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="larkin2-carousel-controls">
        <button 
          className="larkin2-carousel-btn" 
          onClick={() => setActive(p => Math.max(0, p - 1))} 
          disabled={active === 0}
          aria-label="Previous commitment"
          data-testid="button-commitment-previous"
        >
          ←
        </button>
        <div className="larkin2-carousel-pagination">
          <div className="larkin2-carousel-dots">
            {commitments.map((_, i) => (
              <button 
                key={i}
                className={`larkin2-carousel-dot ${active === i ? "is-active" : ""}`}
                onClick={() => setActive(i)}
                aria-label={`Go to commitment ${i + 1}`}
                aria-current={active === i ? "true" : "false"}
                data-testid={`button-commitment-dot-${i + 1}`}
              />
            ))}
          </div>
          <div className="larkin2-carousel-indicator">
            0{active + 1} / 0{commitments.length}
          </div>
        </div>
        <button 
          className="larkin2-carousel-btn" 
          onClick={() => setActive(p => Math.min(commitments.length - 1, p + 1))} 
          disabled={active === commitments.length - 1}
          aria-label="Next commitment"
          data-testid="button-commitment-next"
        >
          →
        </button>
      </div>
    </div>
  );
}

export function Home() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [introVisible, setIntroVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    const isFirstHomeVisit = !hasVisitedHomeThisPageLoad;
    hasVisitedHomeThisPageLoad = true;
    const previewMode = new URLSearchParams(window.location.search).has("no-intro");
    return isFirstHomeVisit && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !previewMode;
  });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const heroTrackRef = useRef<HTMLElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const lastScrollY = useRef(0);

  const paths = Object.values(OPPORTUNITIES);

  const finishIntro = useCallback(() => {
    setIntroVisible(false);
  }, []);

  useEffect(() => {
    // Reset document title and meta description on home page mount
    document.title = "Larkin2 Opportunities";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Official production opportunities for Larkin2. Your central hub for jobs, training and development.");
    }
  }, []);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;

    if (introVisible) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    video.currentTime = 0;
    const playback = video.play();
    if (playback) playback.catch(() => {
      // The poster remains visible if the browser blocks autoplay.
    });
  }, [introVisible]);

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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  return (
    <main className="larkin2-page" id="top">
      {introVisible && <IntroOverlay onComplete={finishIntro} />}
      <a className="larkin2-skip" href="#content" data-testid="link-skip-content">Skip to content</a>

      <SiteHeader 
        scrolled={scrolled} 
        headerHidden={headerHidden} 
        menuOpen={menuOpen} 
        setMenuOpen={setMenuOpen} 
        headerRef={headerRef} 
        menuButtonRef={menuButtonRef} 
      />
      <MobileMenu 
        menuOpen={menuOpen} 
        setMenuOpen={setMenuOpen} 
        menuButtonRef={menuButtonRef} 
      />

      <section ref={heroTrackRef} className="larkin2-hero-track" aria-labelledby="hero-title">
        <div className="larkin2-hero-sticky">
          <div className="larkin2-hero-bg" />
          <div className="larkin2-hero-stage">
            <div className="larkin2-hero-media-wrap">
              <video
                ref={heroVideoRef}
                className="larkin2-hero-media"
                loop
                muted
                playsInline
                preload="metadata"
                poster="/larkin2-opportunities/videos/hero-poster.webp"
                aria-hidden="true"
                data-testid="video-hero-background"
              >
                <source src="/larkin2-opportunities/videos/hero-loop.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="larkin2-hero-shade" />
            <div className="larkin2-hero-content-wrap">
              <div className="larkin2-hero-content larkin2-reveal">
                <div className="larkin2-hero-split">
                  <div className="larkin2-hero-left">
                    <h1 className="larkin2-h1" id="hero-title">
                      <span className="larkin2-mask">
                        <span className="larkin2-hero-wordmark">Larkin2<span className="larkin2-hero-title-dot" aria-hidden="true" /></span>
                      </span>
                    </h1>
                    <div className="larkin2-sub larkin2-mask"><span>Roles &amp; Opportunities</span></div>
                  </div>
                  <div className="larkin2-hero-right">
                    <p className="larkin2-intro larkin2-mask"><span>Your central hub for jobs, training and development on Larkin2.</span></p>
                  </div>
                </div>
                <div className="larkin2-hero-actions-wrap">
                  <div className="larkin2-actions">
                    <MaskedLink href="#roles" className="larkin2-btn" testId="link-hero-role-status">View current role status</MaskedLink>
                    <MaskedLink href="#paths" className="larkin2-btn secondary" testId="link-hero-opportunities">Explore opportunities</MaskedLink>
                    <MaskedLink href="#signup" className="larkin2-btn secondary" testId="link-hero-signup">Sign up for updates</MaskedLink>
                  </div>
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
              <h2 className="larkin2-title" id="paths-title"><span className="larkin2-mask"><span>Three ways in, depending on where you are starting</span></span></h2>
              <p className="larkin2-small">Not everyone arrives from the same place, so we run separate routes. Find the one that matches where you are now.</p>
            </div>
            <div className="larkin2-role-status is-desktop" id="roles">
              <h3 className="larkin2-role-status-title">Looking for a crew role / 04</h3>
              <strong data-testid="status-crew-roles">Paid crew positions are posted as the production needs them, across every department from Accounts to VFX. Postings open and close quickly.</strong>
              <div className="larkin2-role-status-actions">
                <MaskedLink href="#roles" testId="link-opportunity-04">View current role status</MaskedLink>
                <MaskedLink href="#signup" testId="link-role-status-signup">Sign up to hear when something opens</MaskedLink>
              </div>
            </div>
          </div>
          <div className="larkin2-path-grid">
            {paths.map((opp, index) => (
              <article className="larkin2-path larkin2-reveal" data-reveal key={opp.num} style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties} data-testid={`card-opportunity-${opp.num}`}>
                <div className="larkin2-path-bg">
                  <img src={`/larkin2-opportunities/images/${opp.image}`} alt="" role="presentation" loading="lazy" />
                  <div className="larkin2-path-gradient" />
                </div>
                <div className="larkin2-path-top">
                  <span className="larkin2-path-label" data-testid={`text-opportunity-number-${opp.num}`}>Pathway / {opp.num}</span>
                </div>
                <div className="larkin2-path-bottom">
                  <div className="larkin2-path-bottom-main">
                    <h3>{opp.cardTitle}</h3>
                    <p>{opp.cardCopy}</p>
                  </div>
                  <div className="larkin2-path-cta">
                    <MaskedLink href={`/opportunities/${opp.id}`} testId={`link-opportunity-${opp.num}`}>{opp.cardCta}</MaskedLink>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="larkin2-role-status is-mobile">
            <h3 className="larkin2-role-status-title">Looking for a crew role / 04</h3>
            <strong>Paid crew positions are posted as the production needs them, across every department from Accounts to VFX. Postings open and close quickly.</strong>
            <div className="larkin2-role-status-actions">
              <MaskedLink href="#roles" testId="link-opportunity-04-mobile">View current role status</MaskedLink>
              <MaskedLink href="#signup" testId="link-role-status-signup-mobile">Sign up to hear when something opens</MaskedLink>
            </div>
          </div>
        </section>

        <section className="larkin2-section larkin2-commit" id="commitments" aria-labelledby="commit-title">
          <div className="larkin2-commit-header">
            <div className="larkin2-commit-header-text">
              <h2 className="larkin2-title larkin2-reveal" data-reveal id="commit-title"><span className="larkin2-mask"><span>What we’ll tell you straight</span></span></h2>
              <p className="larkin2-small larkin2-reveal" data-reveal>Uncertainty is one of the reasons people give up on this industry before they start. So here is what we commit to before you apply.</p>
            </div>
            <div className="larkin2-commit-header-cta is-desktop larkin2-reveal" data-reveal>
              <MaskedLink href="#signup" className="larkin2-btn secondary" testId="link-commitments-signup">Sign up for updates</MaskedLink>
            </div>
          </div>
          <CommitmentsCarousel />
          <div className="larkin2-commit-header-cta is-mobile larkin2-reveal" data-reveal>
            <MaskedLink href="#signup" className="larkin2-btn secondary" testId="link-commitments-signup-mobile">Sign up for updates</MaskedLink>
          </div>
        </section>

        <section className="larkin2-section larkin2-culture" aria-labelledby="culture-title">
          <div className="larkin2-grid">
            <div className="larkin2-reveal" data-reveal>
              <h2 className="larkin2-title" id="culture-title"><span className="larkin2-mask"><span>Who gets to work here</span></span></h2>
              <figure className="larkin2-culture-media-mobile">
                <img className="larkin2-image" src="/larkin2-opportunities/images/culture-camera-operator.webp" width="1800" height="1162" loading="lazy" alt="Camera operator monitoring multiple screens on a soundstage" data-testid="img-culture-crew-mobile" />
                <figcaption className="larkin2-image-caption"><span>On set / Larkin2</span><span>Production &amp; culture</span></figcaption>
              </figure>
              <p className="larkin2-copy">We believe everyone should have the opportunity to work in film and television, regardless of background, experience level, or personal circumstances.</p>
              <MaskedLink href="#paths" testId="link-culture-opportunities">Explore opportunities</MaskedLink>
              <p className="larkin2-rule larkin2-small">We work with training providers, community organisations and regional talent networks to reach people who might not otherwise hear about opportunities like these. On set and in the office, we expect respect, collaboration and genuine support.</p>
            </div>
            <figure className="larkin2-media-reveal larkin2-culture-media-desktop" data-reveal>
              <img className="larkin2-image" src="/larkin2-opportunities/images/culture-camera-operator.webp" width="1800" height="1162" loading="lazy" alt="Camera operator monitoring multiple screens on a soundstage" data-testid="img-culture-crew" />
              <figcaption className="larkin2-image-caption"><span>On set / Larkin2</span><span>Production &amp; culture</span></figcaption>
            </figure>
          </div>
        </section>

        <section className="larkin2-section larkin2-about" id="about" aria-labelledby="about-title">
          <div className="larkin2-grid">
            <div className="larkin2-reveal" data-reveal>
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

      <SiteFooter />
    </main>
  );
}
