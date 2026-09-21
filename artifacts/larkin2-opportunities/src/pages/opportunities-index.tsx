import { useEffect, useState, useRef } from "react";
import {
  getListPublicProgrammesQueryKey,
  useListPublicProgrammes,
} from "@workspace/api-client-react";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";

export function OpportunitiesIndexPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const title = "Opportunities | HETV Opportunities Hub";
    const description = "Explore work experience, training and development programmes for High-End Television drama.";
    const previousTitle = document.title;
    const restore: Array<() => void> = [];
    const setMeta = (attribute: "name" | "property", key: string, content: string) => {
      let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      const existing = element;
      const previous = element?.getAttribute("content");
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
      restore.push(() => {
        if (!existing) element?.remove();
        else if (previous == null) element?.removeAttribute("content");
        else element?.setAttribute("content", previous);
      });
    };

    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);

    return () => {
      document.title = previousTitle;
      restore.forEach(reset => reset());
    };
  }, []);

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

  const {
    data: opps = [],
    isLoading: programmesLoading,
    isError: programmesFailed,
  } = useListPublicProgrammes(undefined, {
    query: {
      queryKey: getListPublicProgrammesQueryKey(),
      staleTime: 60_000,
      retry: 2,
    },
  });

  return (
    <div className="larkin2-page opp-index-page" id="top">
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
        <section className="larkin2-section opp-index-hero">
          <div className="larkin2-grid">
            <div>
              <h1 className="larkin2-title">Opportunities</h1>
              <p className="larkin2-copy">Discover structured pathways and development programmes designed to open doors into High-End Television. Whether you are seeking your first credit or transitioning from other genres, explore our programmes.</p>
            </div>
          </div>
        </section>

        <section className="larkin2-section" style={{ borderTop: "none", paddingTop: 0 }}>
          <div className="opp-list">
            {programmesLoading ? (
              <div className="opp-list-state" role="status" aria-live="polite">
                Loading opportunities…
              </div>
            ) : programmesFailed ? (
              <div className="opp-list-state" role="alert">
                We couldn’t load opportunities right now. Please refresh the page and try again.
              </div>
            ) : opps.length === 0 ? (
              <div className="opp-list-state">
                There are no published opportunities at the moment. Please check back soon.
              </div>
            ) : opps.map((opp, index) => (
              <article key={opp.slug} className={`opp-card ${index % 2 !== 0 ? "is-reversed" : ""}`}>
                <div className="opp-card-media">
                  <img src={`/larkin2-opportunities/images/${opp.image}`} alt="" loading="lazy" />
                </div>
                <div className="opp-card-content">
                  <div className="larkin2-eyebrow">Pathway / {opp.num}</div>
                  <h2 className="opp-card-title">{opp.title}</h2>
                  <p className="opp-card-desc">{opp.shortDescription}</p>
                  
                  <div className="opp-card-meta">
                    <div className="opp-card-meta-item">
                      <span>Status</span>
                      <strong>{opp.applicationStatus}</strong>
                    </div>
                    <div className="opp-card-meta-item">
                      <span>Location</span>
                      <strong>{opp.location}</strong>
                    </div>
                  </div>
                  
                  <div className="opp-card-action">
                    <MaskedLink href={`/opportunities/${opp.slug}`} className="larkin2-btn" testId={`link-opp-${opp.slug}`}>
                      View Opportunity
                    </MaskedLink>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
