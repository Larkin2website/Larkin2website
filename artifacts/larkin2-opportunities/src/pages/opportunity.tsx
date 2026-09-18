import { useEffect, useState, useRef } from "react";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";
import { OPPORTUNITIES, type Opportunity } from "../data/opportunities";
import NotFound from "./not-found";

export function OpportunityPage({ id }: { id: string }) {
  const opp = OPPORTUNITIES[id] as (Opportunity & { applicationLink?: string }) | undefined;
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

  if (!opp) return <NotFound />;

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
                 <h3>{opp.applicationStatus === "Closed" ? "Applications Closed" : "Applications Open"}</h3>
                 <p>Sign up to receive an alert when this or similar opportunities open on the HETV Opportunities Hub.</p>
                 {opp.applicationStatus === "Open" && opp.applicationLink && (
                   <a href={opp.applicationLink} className="larkin2-btn" data-testid="link-opp-apply">Apply now</a>
                 )}
                 <MaskedLink href="#signup" className="larkin2-btn" testId="link-opp-signup">Sign up for updates</MaskedLink>
              </div>
            </aside>
            
            <div className="opp-main">
               <div className="opp-block">
                  <h2>About the programme</h2>
                  {opp.about.map((p, i) => <p key={i}>{p}</p>)}
               </div>
               
               {opp.placement && opp.placement.length > 0 && (
                 <div className="opp-block">
                    <h2>Placement details</h2>
                    <ul>{opp.placement.map((p, i) => <li key={i}>{p}</li>)}</ul>
                 </div>
               )}
               
               {opp.training && opp.training.length > 0 && (
                 <div className="opp-block">
                    <h2>Training & support</h2>
                    <ul>{opp.training.map((p, i) => <li key={i}>{p}</li>)}</ul>
                 </div>
               )}
               
               <div className="opp-block">
                  <h2>Eligibility</h2>
                  <ul>{opp.eligibility.map((p, i) => <li key={i}>{p}</li>)}</ul>
               </div>
               
               <div className="opp-block">
                  <h2>Timeline</h2>
                  <ul>{opp.timeline.map((p, i) => <li key={i}>{p}</li>)}</ul>
               </div>
               
               <div className="opp-block">
                  <h2>Application guidance</h2>
                  <ul>{opp.applicationGuidance.map((p, i) => <li key={i}>{p}</li>)}</ul>
               </div>
            </div>
          </div>
        </section>
        
        <section className="opp-footer larkin2-section">
           <div>
             <h2 className="larkin2-title">Explore other pathways</h2>
             <MaskedLink href="/#paths" className="larkin2-btn secondary" testId="link-back-paths">Return to opportunities</MaskedLink>
           </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}