import { useEffect, useState, useRef } from "react";
import {
  getGetPublicProgrammeQueryKey,
  recordPublicEngagement,
  useGetPublicProgramme,
} from "@workspace/api-client-react";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";
import { SAMPLE_PROGRAMME, SAMPLE_PROGRAMME_SLUG } from "../data/sample-listings";
import NotFound from "./not-found";

function ProgrammeContent({ content }: { content: string }) {
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length > 0 && lines.every((line) => line.startsWith("• "))) {
    return <ul>{lines.map((line) => <li key={line}>{line.slice(2)}</li>)}</ul>;
  }
  if (lines.length > 0 && lines.every((line) => /^.+: https?:\/\//.test(line))) {
    return (
      <ul>
        {lines.map((line) => {
          const separator = line.indexOf(": http");
          const label = line.slice(0, separator);
          const href = line.slice(separator + 2);
          return <li key={href}><a href={href} target="_blank" rel="noreferrer">{label}</a></li>;
        })}
      </ul>
    );
  }
  return <p>{content}</p>;
}

export function OpportunityPage({ id }: { id: string }) {
  const isSample = import.meta.env.DEV && id === SAMPLE_PROGRAMME_SLUG;
  const {
    data: opp,
    isLoading: programmeLoading,
    isError: programmeFailed,
    error: programmeError,
  } = useGetPublicProgramme(id, {
    query: {
      queryKey: getGetPublicProgrammeQueryKey(id),
      staleTime: 60_000,
      retry: 2,
      enabled: !isSample,
    },
  });
  const displayedProgramme = isSample ? SAMPLE_PROGRAMME : opp;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const trackedViewId = useRef("");

  useEffect(() => {
    if (displayedProgramme) {
      document.title = `${displayedProgramme.title} | HETV Opportunities Hub`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", displayedProgramme.shortDescription);
      }
    }
  }, [displayedProgramme]);

  useEffect(() => {
    if (isSample || !opp || trackedViewId.current === opp.slug) return;
    trackedViewId.current = opp.slug;
    void recordPublicEngagement({ kind: "programme", id: opp.id, event: "view" }).catch(() => undefined);
  }, [isSample, opp]);

  function trackApply() {
    if (!isSample && opp) void recordPublicEngagement({ kind: "programme", id: opp.id, event: "apply" }).catch(() => undefined);
  }

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

  const isNotFound = typeof programmeError === "object"
    && programmeError !== null
    && "status" in programmeError
    && programmeError.status === 404;

  if (!isSample && isNotFound) return <NotFound />;
  if (!isSample && programmeLoading) {
    return <div className="larkin2-page opp-page"><main id="content"><div className="opp-list-state" role="status" aria-live="polite">Loading opportunity…</div></main></div>;
  }
  if (!isSample && (programmeFailed || !opp)) {
    return <div className="larkin2-page opp-page"><main id="content"><div className="opp-list-state" role="alert">We couldn’t load this opportunity right now. Please refresh the page and try again.</div></main></div>;
  }

  if (!displayedProgramme) return <NotFound />;
  const displayOpp = displayedProgramme;
  const sectionGroups = [
    ["About the Programme", displayOpp.about],
    ["Work Experience Placement", displayOpp.placement],
    ["Training & Development", displayOpp.training],
    ["Who Can Apply?", displayOpp.eligibility],
    ["Programme Timeline & Structure", displayOpp.timeline],
    ["How to Apply", displayOpp.applicationGuidance],
  ] as const;
  const isOpen = !isSample && displayOpp.status === "published";

  return (
    <div className="larkin2-page opp-page" id="top">
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
        <section className="opp-hero larkin2-section">
          <div className="opp-hero-grid">
             <div className="opp-hero-content">
                 <div className="larkin2-eyebrow">{isSample ? "EXAMPLE ONLY" : `Pathway / ${displayOpp.num}`}</div>
                 {isSample && <p className="roles-badge is-featured" role="note">EXAMPLE ONLY</p>}
                 <h1 className="opp-title">{displayOpp.title}</h1>
                 <p className="larkin2-intro">{displayOpp.shortDescription}</p>
                <div className="opp-meta">
                   <div className="opp-meta-item">
                     <span>Status</span>
                      <strong>{displayOpp.applicationStatus}</strong>
                   </div>
                   <div className="opp-meta-item">
                     <span>Location</span>
                      <strong>{displayOpp.location}</strong>
                   </div>
                </div>
             </div>
             <div className="opp-hero-media">
                 <img src={`/larkin2-opportunities/images/${displayOpp.image}`} alt="" role="presentation" />
             </div>
          </div>
        </section>

        <section className="opp-content larkin2-section">
          <div className="opp-content-layout">
            <aside className="opp-sidebar">
              <div className="opp-status-card">
                  <h3>{isOpen ? "Applications Open" : "Applications Closed"}</h3>
                   <p>{isSample ? "Example only — this sample programme is not accepting applications." : "You can register your interest in future opportunities. Email alerts are not currently enabled."}</p>
                   {!isSample && isOpen && displayOpp.applicationUrl && (
                     <a href={displayOpp.applicationUrl} className="larkin2-btn" data-testid="link-opp-apply" onClick={trackApply}>Apply now</a>
                 )}
                   {!isSample && <MaskedLink href="#signup" className="larkin2-btn" testId="link-opp-signup">Register interest</MaskedLink>}
              </div>
            </aside>
            
            <div className="opp-main">
                {sectionGroups.map(([heading, content]) => content.length > 0 && (
                  <div className="opp-block" key={heading}>
                    <h2>{heading}</h2>
                    {content.map((paragraph, index) => (
                      <ProgrammeContent key={`${heading}-${index}`} content={paragraph} />
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </section>
        
        <section className="opp-footer larkin2-section">
           <div>
             <h2 className="larkin2-title">Explore other pathways</h2>
             <MaskedLink href="/opportunities" className="larkin2-btn secondary" testId="link-back-paths">Return to opportunities</MaskedLink>
           </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}