import { useEffect, useState, useRef } from "react";
import {
  getGetPublicProgrammeQueryKey,
  useGetPublicProgramme,
} from "@workspace/api-client-react";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";
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
    },
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (opp) {
      document.title = `${opp.title} | HETV Opportunities Hub`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", opp.shortDescription);
      }
    }
  }, [opp]);

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

  if (isNotFound) return <NotFound />;
  if (programmeLoading) {
    return <div className="larkin2-page opp-page"><main id="content"><div className="opp-list-state" role="status" aria-live="polite">Loading opportunity…</div></main></div>;
  }
  if (programmeFailed || !opp) {
    return <div className="larkin2-page opp-page"><main id="content"><div className="opp-list-state" role="alert">We couldn’t load this opportunity right now. Please refresh the page and try again.</div></main></div>;
  }

  const sectionGroups = [
    ["About the Programme", opp.about],
    ["Work Experience Placement", opp.placement],
    ["Training & Development", opp.training],
    ["Who Can Apply?", opp.eligibility],
    ["Programme Timeline & Structure", opp.timeline],
    ["How to Apply", opp.applicationGuidance],
  ] as const;
  const isOpen = opp.status === "published";

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
                <div className="larkin2-eyebrow">Pathway / {opp.num}</div>
                <h1 className="opp-title">{opp.title}</h1>
                <p className="larkin2-intro">{opp.shortDescription}</p>
                <div className="opp-meta">
                   <div className="opp-meta-item">
                     <span>Status</span>
                     <strong>{opp.applicationStatus}</strong>
                   </div>
                   <div className="opp-meta-item">
                     <span>Location</span>
                     <strong>{opp.location}</strong>
                   </div>
                </div>
             </div>
             <div className="opp-hero-media">
                <img src={`/larkin2-opportunities/images/${opp.image}`} alt="" role="presentation" />
             </div>
          </div>
        </section>

        <section className="opp-content larkin2-section">
          <div className="opp-content-layout">
            <aside className="opp-sidebar">
              <div className="opp-status-card">
                  <h3>{isOpen ? "Applications Open" : "Applications Closed"}</h3>
                  <p>You can register your interest in future opportunities. Email alerts are not currently enabled.</p>
                  {isOpen && opp.applicationUrl && (
                    <a href={opp.applicationUrl} className="larkin2-btn" data-testid="link-opp-apply">Apply now</a>
                 )}
                  <MaskedLink href="#signup" className="larkin2-btn" testId="link-opp-signup">Register interest</MaskedLink>
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