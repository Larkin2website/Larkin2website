import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";
import { SubscriptionSignup } from "../components/subscription-signup";

let hasVisitedHomeThisPageLoad = false;

const commitments = [
  ["01", "Free to participate.", "Work experience, shadowing, and training courses are completely free to attend. We do not charge fees for any development programme.", "path-training.jpg"],
  ["02", "We publish everything openly.", "Every opportunity is advertised here and assessed through the published process. You do not need industry contacts.", "path-roles.jpg"],
  ["03", "Time to apply.", "We aim to keep all applications open for at least five days so you have a fair chance to put yourself forward.", "path-development.jpg"],
  ["04", "We will always give you a date.", "Every programme tells you when applications close, when you will hear back, and by when you should assume it was not this time.", "culture-set.jpg"],
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
        <span>HETV Opportunities Hub</span><i />
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
  const [videoPaused, setVideoPaused] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const heroTrackRef = useRef<HTMLElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
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
      if (event.matches) {
        setVideoPaused(true);
        setIntroVisible(false);
      }
    };
    motionQuery.addEventListener("change", handleMotionChange);
    return () => motionQuery.removeEventListener("change", handleMotionChange);
  }, []);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;

    const syncPlayback = () => {
      if (introVisible || videoPaused || document.hidden) {
        video.pause();
        if (reducedMotion) video.currentTime = 0;
        return;
      }

      const playback = video.play();
      if (playback) {
        playback.catch(() => {
          setVideoPaused(true);
        });
      }
    };

    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, [introVisible, reducedMotion, videoPaused]);

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
                preload={reducedMotion ? "none" : "metadata"}
                poster="/larkin2-opportunities/videos/hero-poster.webp"
                aria-hidden="true"
                data-testid="video-hero-background"
              >
                <source src="/larkin2-opportunities/videos/hero-loop.mp4" type={'video/mp4; codecs="avc1.64001f"'} />
                <source src="/larkin2-opportunities/videos/hero-loop.webm" type={'video/webm; codecs="vp9"'} />
              </video>
            </div>
            <div className="larkin2-hero-shade" />
            <button
              type="button"
              className="larkin2-video-toggle"
              onClick={() => setVideoPaused((paused) => !paused)}
              aria-label={videoPaused ? "Play background video" : "Pause background video"}
              aria-pressed={videoPaused}
            >
              {videoPaused ? "Play video" : "Pause video"}
            </button>
            <div className="larkin2-hero-content-wrap" onFocusCapture={() => {
              // Bring fading hero links back into view when reached by keyboard.
              const track = heroTrackRef.current;
              if (track && track.getBoundingClientRect().top < 0) {
                window.scrollTo({ top: window.scrollY + track.getBoundingClientRect().top, behavior: "instant" });
              }
            }}>
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
                <div className="larkin2-hero-actions-wrap">
                  <div className="larkin2-actions">
                    <MaskedLink href="/roles" className="larkin2-btn" testId="link-hero-roles">View Live Roles</MaskedLink>
                    <MaskedLink href="#paths" className="larkin2-btn secondary" testId="link-hero-opportunities">Explore Opportunities</MaskedLink>
                    <MaskedLink href="#signup" className="larkin2-btn secondary" testId="link-hero-signup">Sign Up For Updates</MaskedLink>
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
      <section className="larkin2-section larkin2-signup" id="signup" aria-labelledby="signup-title" style={{ borderTop: 'none', borderBottom: '1px solid var(--line)' }}>
        <div className="larkin2-signup-layout larkin2-reveal" data-reveal>
          <div>
            <h2 className="larkin2-title" id="signup-title" style={{ color: 'var(--paper-ink)' }}><span className="larkin2-mask"><span>Sign Up</span></span></h2>
            <p className="larkin2-copy" style={{ color: 'var(--secondary)' }}>Register your interest in roles, training and development across our productions. We aim to keep applications open for at least five days.</p>
            <p className="larkin2-small" style={{ color: 'var(--muted)', marginTop: '20px' }}>Sign up to be notified when roles or programmes become available. We are currently collecting interest, so while automated email alerts are not running yet, your preference will be saved securely.</p>
          </div>
          <div>
            <SubscriptionSignup />
          </div>
        </div>
      </section>
      <div id="content">
        <section className="larkin2-split-section" id="about" aria-labelledby="about-title">
          <div className="larkin2-split-content">
            <div className="larkin2-reveal" data-reveal>
              <h2 className="larkin2-title" id="about-title"><span className="larkin2-mask"><span>Production &amp; Culture</span></span></h2>
            </div>

            <div className="larkin2-copy larkin2-reveal" data-reveal>
              <p>Explore roles, work experience, training and development on Larkin 2, whether you’re new to television or an experienced crew member. We’re committed to fair, inclusive recruitment and a respectful, supportive production culture—creating opportunities for people from every background.</p>
            </div>

            <div className="larkin2-bordered-rows larkin2-reveal" data-reveal>
              <div className="larkin2-bordered-row">
                <p className="larkin2-small">HETV Opportunities Hub is operated by Larkin AV Limited.</p>
              </div>
              <div className="larkin2-bordered-row">
                <span className="larkin2-split-disclaimer">The opportunity and commitment images are AI-generated illustrations of television production, not photographs of a particular production, crew or cast.</span>
              </div>
            </div>
          </div>
          <div className="larkin2-split-image larkin2-reveal" data-reveal>
            <img src="/larkin2-opportunities/images/bailey-crew.jpg" alt="" role="presentation" loading="lazy" />
          </div>
        </section>

        <section className="larkin2-section larkin2-paths" id="paths" aria-labelledby="paths-title">
          <div className="larkin2-paths-header larkin2-reveal" data-reveal>
            <div className="larkin2-paths-intro">
              <h2 className="larkin2-title" id="paths-title"><span className="larkin2-mask"><span>Roles &amp; Opportunities</span></span></h2>
              <p className="larkin2-small text-[21px]">Whether you are looking for your first set experience, specific skills training, or a standard crew role, we have clear entry points.</p>
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
                  <p>Find Jobs, Employment &amp; Career Opportunities</p>
                </div>
                <div className="larkin2-path-cta">
                  <MaskedLink href="/roles" testId="link-path-roles">View Live Roles</MaskedLink>
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
                  <MaskedLink href="/training" testId="link-path-training">View courses</MaskedLink>
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
                  <MaskedLink href="/development" testId="link-path-development">View programmes</MaskedLink>
                </div>
              </div>
            </article>
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
