import { useEffect, useState, useRef, useMemo } from "react";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";
import { RoleSearchComposer } from "../components/role-search-composer";
import { ROLES } from "../data/roles";

export function RolesPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");

  useEffect(() => {
    document.title = "Roles | Larkin2 Opportunities";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Explore available roles and opportunities at Larkin2. Find your next position in television production.");
    }
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

  const filteredRoles = useMemo(() => {
    const terms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return ROLES;

    return ROLES.filter(r => {
      const searchableRole = [r.title, r.department, r.roleType, r.status].join(" ").toLowerCase();
      return terms.every(term => searchableRole.includes(term));
    });
  }, [search]);

  return (
    <div className="larkin2-page roles-page" id="top">
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
        <section className="roles-hero larkin2-section">
          <div className="larkin2-eyebrow" style={{ marginBottom: "20px" }}>Opportunities</div>
          <h1 className="roles-title">Roles</h1>
          <p className="roles-intro">Explore currently open positions and closed placements to understand the scope of opportunities at Larkin2.</p>
        </section>

        <section className="roles-filters larkin2-section">
          <RoleSearchComposer
            id="search-roles"
            value={search}
            onChange={setSearch}
            inputTestId="input-roles-search"
            clearTestId="button-clear-roles-search"
          />
        </section>

        <section className="roles-list larkin2-section">
          <div className="roles-count" data-testid="text-roles-count">
            {filteredRoles.length} {filteredRoles.length === 1 ? "Result" : "Results"}
          </div>

          {filteredRoles.length === 0 ? (
            <div className="roles-empty" data-testid="container-roles-empty">
              <h3 className="roles-empty-title">No roles match that search</h3>
              <p>Try a different title, department, role type or status.</p>
            </div>
          ) : (
            <div className="roles-grid">
              {filteredRoles.map(role => (
                <article key={role.id} className="roles-card" data-testid={`card-role-${role.id}`}>
                  <div className="roles-card-main">
                    <div className="roles-card-badges">
                      {role.deadlineExtended && <span className="roles-badge is-urgent">Deadline Extended!</span>}
                      {role.urgent && <span className="roles-badge is-urgent">Urgent</span>}
                      {role.featured && <span className="roles-badge is-featured">Featured</span>}
                    </div>
                    <h2 className="roles-card-title">{role.title}</h2>
                    <div className="roles-card-meta">
                      <span>{role.department}</span>
                      <span>{role.roleType}</span>
                      <span>{role.date}</span>
                    </div>
                  </div>
                  
                  <div className="roles-card-status">
                    <span className={`roles-status-indicator is-${role.status.toLowerCase()}`}></span>
                    {role.status}
                  </div>

                  <div className="roles-card-action">
                    <MaskedLink href={`/roles/${role.id}`} testId={`link-role-${role.id}`}>
                      View details
                    </MaskedLink>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
