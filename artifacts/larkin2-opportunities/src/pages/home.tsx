import { type CSSProperties, useEffect, useRef, useState } from "react";
import { OPPORTUNITIES } from "../data/opportunities";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";
import { SubscriptionSignup } from "../components/subscription-signup";

const commitments = [
  ["01", "Free to participate.", "Work experience, shadowing, and training courses are completely free to attend. We do not charge fees for any development programme.", "path-training.jpg"],
  ["02", "We publish everything openly.", "Every opportunity is advertised here and assessed through the published process. You do not need industry contacts.", "path-roles.jpg"],
  ["03", "Time to apply.", "We aim to keep all applications open for at least five days so you have a fair chance to put yourself forward.", "path-development.jpg"],
  ["04", "We will always give you a date.", "Every programme tells you when applications close, when you will hear back, and by when you should assume it was not this time.", "culture-set.jpg"],
] as const;

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    document.title = "HETV Opportunities Hub";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "A welcoming home for newcomers and experienced drama crew to find jobs, training, and development across multiple high-end television productions.");
    }
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

  return (
    <main className="larkin2-page" id="top">
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

      <section className="larkin2-hero-static" aria-labelledby="hero-title">
        <div className="larkin2-hero-bg-static">
          <img src="/larkin2-opportunities/images/hero-bg.jpg" alt="A diverse film and television crew working collaboratively on a drama production set." loading="eager" />
        </div>
        <div className="larkin2-hero-shade-static" />
        <div className="larkin2-hero-content-static">
          <h1 className="larkin2-h1" id="hero-title">HETV Opportunities Hub</h1>
          <p className="larkin2-intro">A welcoming home for newcomers and experienced drama crew to find jobs, training, and development across multiple high-end television productions.</p>
          <div className="larkin2-actions">
            <MaskedLink href="/roles" className="larkin2-btn" testId="link-hero-roles">View Crew Roles</MaskedLink>
            <MaskedLink href="#paths" className="larkin2-btn secondary" testId="link-hero-opportunities">Explore opportunities</MaskedLink>
            <MaskedLink href="#signup" className="larkin2-btn secondary" testId="link-hero-signup">Sign up for updates</MaskedLink>
          </div>
        </div>
      </section>

      <section className="larkin2-section larkin2-signup" id="signup" aria-labelledby="signup-title" style={{ background: 'var(--paper)', borderTop: 'none', borderBottom: '1px solid var(--line)' }}>
        <div className="larkin2-signup-layout larkin2-reveal" data-reveal>
          <div>
            <h2 className="larkin2-title" id="signup-title" style={{ color: 'var(--paper-ink)' }}><span className="larkin2-mask"><span>Stay connected to opportunities</span></span></h2>
            <p className="larkin2-copy" style={{ color: 'var(--secondary)' }}>Register your interest in roles, training and development across our productions. We aim to keep applications open for at least five days.</p>
            <p className="larkin2-small" style={{ color: 'var(--muted)', marginTop: '20px' }}>Sign up to be notified when roles or programmes become available. We are currently collecting interest, so while automated email alerts are not running yet, your preference will be saved securely.</p>
          </div>
          <div>
            <SubscriptionSignup />
          </div>
        </div>
      </section>

      <div id="content">
        <section className="larkin2-section larkin2-about" id="about" aria-labelledby="about-title">
          <div className="larkin2-grid">
            <div className="larkin2-reveal" data-reveal>
              <h2 className="larkin2-title" id="about-title"><span className="larkin2-mask"><span>Who we are and what we cover</span></span></h2>
            </div>
            <div className="larkin2-copy larkin2-reveal" data-reveal>
              <p>Larkin2 is a special-purpose production company. HETV Opportunities Hub is operated by Larkin AV Limited and brings together opportunities across multiple high-end television (HETV) drama productions.</p>
              <p>This is a central place where you can find genuine crew roles, work experience placements, shadowing programmes, and training courses connected to our active productions. We manage these opportunities directly, ensuring you get accurate, up-to-date information directly from the source.</p>
              <p>We work with training providers, community organisations, and regional talent networks to reach people who might not otherwise hear about these routes into the industry.</p>

              <span className="hetv-disclaimer">The homepage images are AI-generated illustrations of television production, not photographs of a particular production, crew or cast.</span>
            </div>
          </div>
        </section>

        <section className="larkin2-section larkin2-paths" id="paths" aria-labelledby="paths-title">
          <div className="larkin2-paths-header larkin2-reveal" data-reveal>
            <div className="larkin2-paths-intro">
              <h2 className="larkin2-title" id="paths-title"><span className="larkin2-mask"><span>Something for every level of industry experience</span></span></h2>
              <p className="larkin2-small">Whether you are looking for your first set experience, specific skills training, or a standard crew role, we have clear entry points.</p>
            </div>
          </div>
          <div className="larkin2-path-grid">
            <article className="larkin2-path larkin2-reveal" data-reveal style={{ "--reveal-delay": "0ms" } as CSSProperties}>
              <div className="larkin2-path-bg">
                <img src="/larkin2-opportunities/images/path-roles.jpg" alt="" role="presentation" loading="lazy" />
                <div className="larkin2-path-gradient" />
              </div>
              <div className="larkin2-path-top">
                <span className="larkin2-path-label">Entry Point / 01</span>
              </div>
              <div className="larkin2-path-bottom">
                <div className="larkin2-path-bottom-main">
                  <h3>Crew Roles</h3>
                  <p>Paid crew positions posted as productions need them, across every department from Accounts to VFX.</p>
                </div>
                <div className="larkin2-path-cta">
                  <MaskedLink href="/roles" testId="link-path-roles">View current roles</MaskedLink>
                </div>
              </div>
            </article>

            <article className="larkin2-path larkin2-reveal" data-reveal style={{ "--reveal-delay": "90ms" } as CSSProperties}>
              <div className="larkin2-path-bg">
                <img src="/larkin2-opportunities/images/path-training.jpg" alt="" role="presentation" loading="lazy" />
                <div className="larkin2-path-gradient" />
              </div>
              <div className="larkin2-path-top">
                <span className="larkin2-path-label">Entry Point / 02</span>
              </div>
              <div className="larkin2-path-bottom">
                <div className="larkin2-path-bottom-main">
                  <h3>Training Courses</h3>
                  <p>Build practical skills and explore supported learning opportunities. Check each listing for the experience level it is designed for.</p>
                </div>
                <div className="larkin2-path-cta">
                  <MaskedLink href="#training" testId="link-path-training">View courses</MaskedLink>
                </div>
              </div>
            </article>

            <article className="larkin2-path larkin2-reveal" data-reveal style={{ "--reveal-delay": "180ms" } as CSSProperties}>
              <div className="larkin2-path-bg">
                <img src="/larkin2-opportunities/images/path-development.jpg" alt="" role="presentation" loading="lazy" />
                <div className="larkin2-path-gradient" />
              </div>
              <div className="larkin2-path-top">
                <span className="larkin2-path-label">Entry Point / 03</span>
              </div>
              <div className="larkin2-path-bottom">
                <div className="larkin2-path-bottom-main">
                  <h3>Development Programmes</h3>
                  <p>Shadowing and progression placements for experienced professionals moving into High-End Television.</p>
                </div>
                <div className="larkin2-path-cta">
                  <MaskedLink href="#development" testId="link-path-development">View programmes</MaskedLink>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="larkin2-section larkin2-commit" id="training" aria-labelledby="training-title">
          <div className="larkin2-grid">
            <div className="larkin2-reveal" data-reveal>
              <h2 className="larkin2-title" id="training-title"><span className="larkin2-mask"><span>Training Courses &amp; Work Experience</span></span></h2>
              <p className="larkin2-copy mt-6">Work experience and traineeships focus on learning and supported placements, rather than standard job recruitment. Check each listing for eligibility, support and pay. Free participation means no fees; it does not mean every course is paid.</p>
            </div>
            <div className="larkin2-copy larkin2-reveal" data-reveal>
              <div className="hetv-programme-list">
                <div className="hetv-programme-item">
                  <h3>First Credit Work Experience</h3>
                  <p>A paid production placement and training course for those with no experience or industry contacts.</p>
                  <MaskedLink href={`/opportunities/first-credit`} testId="link-opp-first-credit">Learn about First Credit</MaskedLink>
                </div>
                <div className="hetv-empty-state">
                  <h4>No active training courses</h4>
                  <p>No standalone training courses are currently listed. Approved courses, dates and eligibility will appear here when available. In the meantime, you can read about First Credit above.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="larkin2-section larkin2-commit" id="development" aria-labelledby="development-title" style={{ background: 'var(--stage)' }}>
          <div className="larkin2-grid">
            <div className="larkin2-reveal" data-reveal>
              <h2 className="larkin2-title" id="development-title"><span className="larkin2-mask"><span>Development Programmes</span></span></h2>
              <p className="larkin2-copy mt-6">Designed for industry professionals looking to step up or transition into High-End Television drama.</p>
            </div>
            <div className="larkin2-copy larkin2-reveal" data-reveal>
              <div className="hetv-programme-list">
                <div className="hetv-programme-item">
                  <h3>Director Pathway</h3>
                  <p>A paid six-week shadowing placement for freelance directors with a qualifying screen credit.</p>
                  <MaskedLink href={`/opportunities/director-pathway`} testId="link-opp-director">Learn about Director Pathway</MaskedLink>
                </div>
                <div className="hetv-programme-item mt-8">
                  <h3>Producer Pathway</h3>
                  <p>A paid shadowing placement of up to fourteen weeks for experienced freelance producers.</p>
                  <MaskedLink href={`/opportunities/producer-pathway`} testId="link-opp-producer">Learn about Producer Pathway</MaskedLink>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="larkin2-section larkin2-commit" id="commitments" aria-labelledby="commit-title">
          <div className="larkin2-commit-header">
            <div className="larkin2-commit-header-text">
              <h2 className="larkin2-title larkin2-reveal" data-reveal id="commit-title"><span className="larkin2-mask"><span>Our Commitments</span></span></h2>
              <p className="larkin2-small larkin2-reveal" data-reveal>Uncertainty is a major barrier in this industry. Here are the principles we uphold for every applicant.</p>
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
                <p>We cannot give individual feedback. Application volumes are incredibly high, and personal responses to everyone are simply not realistic. Not being selected is not a reflection of your worth or ability.</p>
              </div>
              <div className="hetv-faq-item mt-8">
                <h3>Can I send a speculative CV?</h3>
                <p>We do not accept speculative CVs. We only recruit through the active listings published on this hub. Please sign up for updates so we can let you know when roles and programmes open.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
