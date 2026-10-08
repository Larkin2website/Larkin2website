import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader, MobileMenu, MaskedLink } from "../components/layout";
import { HomeFooterReveal } from "../components/home-footer-reveal";
import { SubscriptionSignup } from "../components/subscription-signup";
import "./home-round-two.css";
import { newFaq } from "./faq-data";
import { NewFaqAnswer } from "./faq-answer";

let hasVisitedHomeThisPageLoad = false;

const commitments = [
  ["01", "Paid Opportunities", "All advertised roles, work experience placements and shadowing programmes are paid.", "commitment-paid-camera-crew.webp"],
  ["02", "Opportunities are Open for All", "We want everyone to feel welcome and supported when applying for opportunities on our productions. We are committed to making information available in alternative formats (such as Easy Read guides, which are available for all advertised roles) and providing additional support where needed.", "commitment-inclusive-crew.webp"],
  ["03", "Every application matters", "We aim to keep applications open for a minimum of five working days, allowing every applicant to put themselves forward.", "commitment-alerts-slate.webp"],
  ["04", "Clear Timelines", "Every role listing will tell you when applications close, when you can expect to hear back and when to assume your application has progressed", "commitment-dates-calendar.webp"],
] as const;

function IntroOverlay({ onComplete }: { onComplete: () => void }) {
  const introFrames = [
    "bailey-craft.jpg",
    "larkin2-commitment-open.jpg",
    "bailey-crew.jpg",
    "larkin2-commitment-paid.jpg",
  ];

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      onComplete();
      return;
    }

    const handleMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) onComplete();
    };
    const timer = window.setTimeout(onComplete, 3090);
    const safeTimer = window.setTimeout(onComplete, 4000);
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(safeTimer);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [onComplete]);

  return (
    <div className="larkin2-intro-overlay" role="status" aria-label="HETV Opportunities Hub loading" data-testid="status-intro">
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
            src="/larkin2-opportunities/images/hero-set-1440.webp"
            alt=""
          />
        </div>
        <span className="larkin2-intro-corner is-top-left" />
        <span className="larkin2-intro-corner is-top-right" />
        <span className="larkin2-intro-corner is-bottom-left" />
        <span className="larkin2-intro-corner is-bottom-right" />
      </div>
      <div className="larkin2-intro-brand" aria-hidden="true">
        <span>HETV Opportunities Hub</span><i />
      </div>
    </div>
  );
}

function CommitmentsCarousel() {
  const [active, setActive] = useState(0);
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

  const resetPointer = () => {
    pointerStartX.current = null;
    pointerStartY.current = null;
    pointerEndX.current = null;
    pointerEndY.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    pointerEndX.current = e.clientX;
    pointerEndY.current = e.clientY;
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
      e.preventDefault();
      setActive(p => Math.min(commitments.length - 1, p + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActive(p => Math.max(0, p - 1));
    }
  };

  return (
    <div 
      className="larkin2-carousel larkin2-reveal" 
      data-reveal
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Our commitments. Use the arrow keys or buttons to view each commitment."
      role="region"
    >
      <ol className="sr-only" aria-label="All commitments">
        {commitments.map(([num, title, copy], index) => <li key={num} aria-current={active === index ? "step" : undefined}><h3>{title}</h3><p>{copy}</p></li>)}
      </ol>
      <div className="larkin2-carousel-viewport" aria-hidden="true">
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
              data-active={active === index}
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
          <div className="larkin2-carousel-indicator" role="status" aria-live="polite" aria-atomic="true">
            Commitment {active + 1} of {commitments.length}: {commitments[active][1]}
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [introVisible, setIntroVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    const isFirstHomeVisit = !hasVisitedHomeThisPageLoad;
    hasVisitedHomeThisPageLoad = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return isFirstHomeVisit && !window.location.hash && !reducedMotion;
  });
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const heroTrackRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  const finishIntro = useCallback(() => {
    setIntroVisible(false);
  }, []);

  useEffect(() => {
    document.title = "HETV Opportunities Hub";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Your central hub for jobs, training and development on Larkin 2 a high-end TV drama production");
    }
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
      if (event.matches) setIntroVisible(false);
    };
    motionQuery.addEventListener("change", handleMotionChange);
    return () => motionQuery.removeEventListener("change", handleMotionChange);
  }, []);

  useEffect(() => {
    let frame = 0;
    const heroTrack = heroTrackRef.current;
    const sticky = heroTrack?.querySelector<HTMLElement>(".larkin2-hero-sticky");
    let morphTravel = 1;
    const measure = () => {
      if (heroTrack && sticky) {
        // min-height is the final visible crop plus its gap, resolved by CSS per viewport.
        morphTravel = Math.max(1, heroTrack.offsetHeight - parseFloat(getComputedStyle(sticky).minHeight));
      }
      onScroll();
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const current = window.scrollY;
        if (heroTrack) {
          const travelled = -heroTrack.getBoundingClientRect().top;
          const progress = reducedMotion ? 0 : Math.min(1, Math.max(0, travelled / morphTravel));
          heroTrack.style.setProperty("--hero-progress", progress.toFixed(4));
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
    measure();
    const resizeObserver = new ResizeObserver(measure);
    if (heroTrack) resizeObserver.observe(heroTrack);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      resizeObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [menuOpen, reducedMotion]);

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

  return (
    <div className="larkin2-page" id="top" tabIndex={-1}>
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
      <main id="content" tabIndex={-1}>
      <section ref={heroTrackRef} className="larkin2-hero-track" aria-labelledby="hero-title">
        <div className="larkin2-hero-sticky">
          <div className="larkin2-hero-bg" />
          <div className="larkin2-hero-stage">
            <div className="larkin2-hero-media-wrap">
              <img
                className="larkin2-hero-media"
                src="/larkin2-opportunities/images/hero-set-1440.webp"
                srcSet="/larkin2-opportunities/images/hero-set-720.webp 720w, /larkin2-opportunities/images/hero-set-1440.webp 1440w, /larkin2-opportunities/images/hero-set-2400.webp 2400w"
                sizes="100vw"
                alt="Film crew working with a clapperboard on a set"
                fetchPriority="high"
                data-testid="image-hero-background"
              />
            </div>
            <div className="larkin2-hero-shade" />
            <div className="larkin2-hero-content-wrap">
              <div className="larkin2-hero-content larkin2-reveal">
                <div className="larkin2-hero-split">
                  <div className="larkin2-hero-left">
                    <h1 className="larkin2-h1" id="hero-title">
                      <span className="larkin2-mask">
                        <span className="larkin2-hero-wordmark">
                          HETV
                          <span className="larkin2-hero-title-dot" aria-hidden="true" />
                        </span>
                      </span>
                    </h1>
                    <div className="larkin2-sub larkin2-mask"><span>Opportunities Hub</span></div>
                  </div>
                  <div className="larkin2-hero-right">
                    <p className="larkin2-intro larkin2-mask"><span>Your central hub for jobs, training and development on Larkin 2 a high-end TV drama production</span></p>
                  </div>
                </div>
              </div>
            </div>
            <div className="larkin2-hero-meta-wrap">
              <div className="larkin2-hero-meta">
                <span>Scroll to enter the hub</span><span className="larkin2-scroll-line" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>
        <section className="larkin2-split-section" id="about" aria-labelledby="about-title">
          <div className="larkin2-split-image">
            <img src="/larkin2-opportunities/images/production-culture.webp" alt="" loading="lazy" />
          </div>
          <div className="larkin2-split-content">
            <div className="larkin2-split-panel larkin2-split-about">
              <div className="larkin2-reveal" data-reveal>
                <h2 className="larkin2-title" id="about-title"><span className="larkin2-mask"><span>About Us</span></span></h2>
                <div className="larkin2-copy">
                  <p>Through this platform we provide opportunities to apply for full-time crew roles, HETV work experience, specific skills training, bespoke shadowing programs or simply to join our talent pool. All of these possibilities are advertised on this platform.</p>
                  <p>Please sign up to HETV Opportunities Hub to keep updated</p>
                </div>
              </div>
            </div>
            <div className="larkin2-split-panel larkin2-split-culture">
              <div className="larkin2-reveal" data-reveal>
                <h3 className="larkin2-culture-heading" id="production-culture">Production Culture Statement</h3>
                <div className="larkin2-copy">
                  <p>We believe everyone should have the opportunity to work in film and television - regardless of background, experience level, or personal circumstances. Our recruitment processes are designed to be transparent, inclusive, and fair at every stage.</p>
                  <p>We actively seek to create pathways for people who are new to the industry as well as those who are established. Through partnerships with training providers, community organisations, regional talent networks, unions, agents and guilds, we ensure that opportunity reaches those who might not otherwise have access to it as well as those that are already established.</p>
                  <p>Our production values centre on respect, collaboration, and genuine support. We are committed to building crews that reflect the diversity of the communities we work in - and to creating a working environment where every person feels valued and heard.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="larkin2-section larkin2-paths" id="paths" aria-labelledby="paths-title">
          <div className="larkin2-paths-header larkin2-reveal" data-reveal>
            <div className="larkin2-paths-intro">
              <h2 className="larkin2-title" id="paths-title"><span className="larkin2-mask"><span>Three Core Areas</span></span></h2>
              <p className="larkin2-small">Whether you’re looking for a mid-level role, specific skills training or your first on-set experience, we provide three core areas of support: Training Courses, Development Programmes and Recruitment.</p>
            </div>
          </div>
          <div className="larkin2-path-grid">
            <article className="larkin2-path larkin2-reveal" data-reveal style={{ "--reveal-delay": "0ms" } as CSSProperties}>
              <div className="larkin2-path-bg">
                  <img src="/larkin2-opportunities/images/path-training-studio.webp" alt="" role="presentation" loading="lazy" />
                <div className="larkin2-path-gradient" />
              </div>
              <div className="larkin2-path-top">
                <span className="larkin2-path-label">Core Area / 01</span>
              </div>
              <div className="larkin2-path-bottom">
                <div className="larkin2-path-bottom-main">
                  <h3 className="larkin2-core-title">Training Courses</h3>
                  <p>Helping you build the skills and knowledge you need to work confidently and effectively on production and beyond.</p>
                </div>
                <div className="larkin2-path-cta">
                  <MaskedLink href="/training" testId="link-path-training">VIEW COURSES</MaskedLink>
                </div>
              </div>
            </article>

            <article className="larkin2-path larkin2-reveal" data-reveal style={{ "--reveal-delay": "90ms" } as CSSProperties}>
              <div className="larkin2-path-bg">
                  <img src="/larkin2-opportunities/images/path-development-clapper.webp" alt="" role="presentation" loading="lazy" />
                <div className="larkin2-path-gradient" />
              </div>
              <div className="larkin2-path-top">
                <span className="larkin2-path-label">Core Area / 02</span>
              </div>
              <div className="larkin2-path-bottom">
                <div className="larkin2-path-bottom-main">
                  <h3 className="larkin2-core-title">Development Programmes</h3>
                  <p>Providing structured opportunities that support development at different career stages.</p>
                </div>
                <div className="larkin2-path-cta">
                  <MaskedLink href="/development" testId="link-path-development">VIEW PROGRAMMES</MaskedLink>
                </div>
              </div>
            </article>

            <article className="larkin2-path larkin2-reveal" data-reveal style={{ "--reveal-delay": "180ms" } as CSSProperties}>
              <div className="larkin2-path-bg">
                  <img src="/larkin2-opportunities/images/path-roles-set.webp" alt="" role="presentation" loading="lazy" />
                <div className="larkin2-path-gradient" />
              </div>
              <div className="larkin2-path-top">
                <span className="larkin2-path-label">Core Area / 03</span>
              </div>
              <div className="larkin2-path-bottom">
                <div className="larkin2-path-bottom-main">
                  <h3 className="larkin2-core-title">Recruitment</h3>
                  <p>Helping you find paid roles across our productions that match your career level, skills and experience.</p>
                </div>
                <div className="larkin2-path-cta">
                  <MaskedLink href="/roles" testId="link-path-roles">VIEW LIVE ROLES</MaskedLink>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="larkin2-section larkin2-commit" id="commitments" aria-labelledby="commit-title">
          <div className="larkin2-commit-header">
            <div className="larkin2-commit-header-text">
              <h2 className="larkin2-title larkin2-reveal" data-reveal id="commit-title"><span className="larkin2-mask"><span>Our Commitment to You</span></span></h2>
              <p className="larkin2-small larkin2-reveal text-[20px]" data-reveal>We believe in being open and transparent about how we work. Here are the commitments we make to everyone who engages with our Hub.</p>
            </div>
          </div>
          <CommitmentsCarousel />
        </section>

        <section className="larkin2-section larkin2-culture" id="faqs" aria-labelledby="faqs-title">
          <div className="larkin2-grid" style={{ minHeight: 'auto', paddingBlock: '80px' }}>
            <div className="larkin2-reveal" data-reveal style={{ paddingBlock: 0 }}>
              <h2 className="larkin2-title" id="faqs-title"><span className="larkin2-mask"><span>Frequently Asked Questions</span></span></h2>
            </div>
            <div className="larkin2-copy larkin2-reveal" data-reveal style={{ paddingBlock: 0 }}>
              <div className="hetv-faq-item">
                <h3>Do you offer individual feedback on applications?</h3>
                <p>Due to the volume of applications we receive, we’re unable to provide individual feedback</p>
              </div>
              <div className="hetv-faq-item">
                <h3>{newFaq.question}</h3>
                <NewFaqAnswer />
              </div>
              <MaskedLink href="/faqs" className="larkin2-btn" testId="link-more-faqs">View more FAQs</MaskedLink>
            </div>
          </div>
        </section>
        <section className="larkin2-section larkin2-signup" id="signup" aria-labelledby="signup-title" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="larkin2-signup-layout larkin2-reveal" data-reveal>
            <div>
              <h2 className="larkin2-title" id="signup-title" style={{ color: 'var(--paper-ink)' }}><span className="larkin2-mask"><span>Sign Up</span></span></h2>
              <p className="larkin2-copy">Sign up to be notified when new roles and opportunities become available through the Hub. You can update your preferences at any time.</p>
              <p className="larkin2-small" style={{ marginTop: '20px' }}>We are collecting interest, not sending automated email alerts yet. Choosing to hear about opportunities is a separate step; joining for general updates does not include every role or programme.</p>
            </div>
            <SubscriptionSignup />
          </div>
        </section>
      </main>
      <HomeFooterReveal />
    </div>
  );
}
