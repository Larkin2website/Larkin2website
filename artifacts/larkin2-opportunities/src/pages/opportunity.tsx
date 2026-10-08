import { useEffect, useState, useRef } from "react";
import {
  getGetPublicProgrammeQueryKey,
  recordPublicEngagement,
  useGetPublicProgramme,
} from "@workspace/api-client-react";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";
import { SAMPLE_PROGRAMME, SAMPLE_PROGRAMME_SLUG } from "../data/sample-listings";
import NotFound from "./not-found";
import { ProgrammeContent } from "@workspace/programme-content";
import { programmeRegistration } from "@workspace/programme-content/registration";
import { LIVE_QUERY_OPTIONS, developmentDetailContent, isTraining, useNow } from "../lib/programme-presentation";


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
      ...LIVE_QUERY_OPTIONS,
      enabled: !isSample,
    },
  });
  const now = useNow();
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
  const course = isTraining(displayOpp);
  const reg = isSample ? { state: "closed" as const, canApply: false, label: "Applications closed" } : programmeRegistration(displayOpp, now);
  const canApply = reg.canApply && !!displayOpp.applicationUrl;
  const sectionGroups = (course ? [
    ["About the Course", displayOpp.about],
    ["Supported Placement", displayOpp.placement],
    ["Course Content", displayOpp.training],
    ["Who Can Register?", displayOpp.eligibility],
    ["Course Dates", displayOpp.timeline],
    ["Original registration information", displayOpp.applicationGuidance],
  ] : [
    ["About the Programme", displayOpp.about],
    ["Work Experience Placement", displayOpp.placement],
    ["Training & Development", displayOpp.training],
    ["Who Can Apply?", displayOpp.eligibility],
    ["Programme Timeline & Structure", displayOpp.timeline],
    ["How to Apply", displayOpp.applicationGuidance],
  ]) as ReadonlyArray<readonly [string, string[]]>;
  const statusHeading = course ? (reg.state === "open" ? "Registration open" : reg.state === "closed" ? "Registration closed" : "Registration status unconfirmed")
    : reg.canApply ? "Applications Open" : "Applications Closed";
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
                      <strong>{isSample ? displayOpp.applicationStatus : reg.label}</strong>
                   </div>
                   <div className="opp-meta-item">
                     <span>Location</span>
                      <strong>{displayOpp.location}</strong>
                   </div>
                </div>
             </div>
          </div>
        </section>

        <section className="opp-content larkin2-section">
          <div className="opp-content-layout">
            <aside className="opp-sidebar">
              <div className="opp-status-card">
                  <h2>{statusHeading}</h2>
                   <p>{isSample ? "Example only — this sample programme is not accepting applications." : course && canApply ? "Course registration is handled by an external provider and is separate from registering interest in the hub." : "You can register your interest in future opportunities. Email alerts are not currently enabled."}</p>
                   {course && !isSample && reg.state === "unconfirmed" && <p>We cannot confirm that registration is still open, so no registration link is offered.</p>}
                   {!isSample && canApply && (
                     <a href={displayOpp.applicationUrl ?? undefined} className="larkin2-btn" data-testid="link-opp-apply" onClick={trackApply}>{course ? "Register with the course provider" : "Apply now"}</a>
                 )}
                   {!isSample && <MaskedLink href="#signup" className="larkin2-btn" testId="link-opp-signup">Register interest</MaskedLink>}
              </div>
            </aside>
            
            <div className="opp-main">
                {sectionGroups.map(([heading, content]) => content.length > 0 && (
                  <div className="opp-block" key={heading}>
                    <h2>{heading}</h2>
                    {course && heading === "Original registration information" && !canApply && (
                      <p className="larkin2-small" role="note">This is the original wording from the source listing. Registration is no longer open or cannot be confirmed, so do not rely on it to register.</p>
                    )}
                    {content.map((paragraph, index) => (
                      <ProgrammeContent key={`${heading}-${index}`} content={developmentDetailContent(displayOpp.slug, paragraph)} />
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