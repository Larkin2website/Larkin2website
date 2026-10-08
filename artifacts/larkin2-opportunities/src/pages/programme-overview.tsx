import { useEffect, useState, useRef } from "react";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";
import { OPPORTUNITIES } from "../data/opportunities";
import { DevelopmentListings } from "../components/development-listings";
import "./programme-overview.css";

function useHeaderScroll() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => {
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
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  return { menuOpen, setMenuOpen, scrolled, headerHidden, headerRef, menuButtonRef };
}

function PageMeta({ title, description }: { title: string, description: string }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | HETV Opportunities Hub`;
    const restore: Array<() => void> = [];
    const setMeta = (attribute: "name" | "property", key: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      const existing = el;
      const previous = el?.getAttribute("content");
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attribute, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      const element = el;
      restore.push(() => {
        if (!existing) element.remove();
        else if (previous == null) element.removeAttribute("content");
        else element.setAttribute("content", previous);
      });
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", `${title} | HETV Opportunities Hub`);
    setMeta("property", "og:description", description);

    return () => {
      document.title = previousTitle;
      restore.forEach(reset => reset());
    };
  }, [title, description]);

  return null;
}

export function TrainingPage() {
  const { menuOpen, setMenuOpen, scrolled, headerHidden, headerRef, menuButtonRef } = useHeaderScroll();
  const firstCreditStatus = OPPORTUNITIES["first-credit"].applicationStatus;

  return (
    <div className="larkin2-page programme-overview-page" id="top">
      <PageMeta 
        title="Training Courses"
        description="Work experience and traineeships focus on learning and supported placements. Free participation means no fees; it does not mean every course is paid."
      />
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

      <main id="content">
        <section className="larkin2-section larkin2-commit programme-overview-section" aria-labelledby="training-title">
          <div className="programme-overview-intro">
            <h1 className="larkin2-title" id="training-title">Training Courses</h1>
            <p className="larkin2-copy">Helping you build the skills and knowledge you need to work confidently and effectively on production and beyond.</p>
            <p className="larkin2-small">Work experience and traineeships focus on learning and supported placements, rather than standard job recruitment. Check each listing for eligibility, support and pay. Free participation means no fees; it does not mean every course is paid.</p>
          </div>
          <div className="hetv-programme-list">
            <div className="hetv-programme-item">
              <div className={`programme-status-badge ${firstCreditStatus === "Open" ? "is-open" : "is-closed"}`}>
                Applications {firstCreditStatus}
              </div>
              <h2>First Credit Work Experience</h2>
              <p>The First Credit Work Experience Programme has been designed to provide meaningful first industry experience for people who have had little or no opportunity to access the Film &amp; Television industry.</p>
              <MaskedLink href="/opportunities/first-credit" testId="link-opp-first-credit">View First Credit Programme</MaskedLink>
            </div>
            <div className="hetv-empty-state">
              <h2>No active training courses</h2>
              <p>No standalone training courses are currently listed. Approved courses, dates and eligibility will appear here when available. In the meantime, you can read about First Credit.</p>
            </div>
          </div>
          <div className="previous-programmes">
            <MaskedLink href="/development#previous-programmes" testId="link-training-previous">Explore previous development programmes</MaskedLink>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export function DevelopmentPage() {
  const { menuOpen, setMenuOpen, scrolled, headerHidden, headerRef, menuButtonRef } = useHeaderScroll();

  return (
    <div className="larkin2-page programme-overview-page" id="top">
      <PageMeta 
        title="Development Programmes" 
        description="Designed for industry professionals looking to step up or transition into High-End Television drama."
      />
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

      <main id="content">
        <section className="larkin2-section larkin2-commit programme-overview-section" aria-labelledby="development-title" style={{ background: 'var(--stage)' }}>
          <div className="programme-overview-intro">
            <h1 className="larkin2-title" id="development-title">Development Programmes</h1>
            <p className="larkin2-copy">Providing structured opportunities that support development at different career stages.</p>
            <p className="larkin2-small">Designed for industry professionals looking to step up or transition into High-End Television drama.</p>
          </div>
          <DevelopmentListings />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
