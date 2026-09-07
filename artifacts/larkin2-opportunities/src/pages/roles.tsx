import { useEffect, useState, useRef, useMemo } from "react";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";
import { ROLES } from "../data/roles";

export function RolesPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

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

  const departments = useMemo(() => ["All", ...Array.from(new Set(ROLES.map(r => r.department)))], []);
  const types = useMemo(() => ["All", ...Array.from(new Set(ROLES.map(r => r.roleType)))], []);
  const statuses = useMemo(() => ["All", ...Array.from(new Set(ROLES.map(r => r.status)))], []);

  const filteredRoles = useMemo(() => {
    return ROLES.filter(r => {
      const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.department.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === "All" || r.department === deptFilter;
      const matchType = typeFilter === "All" || r.roleType === typeFilter;
      const matchStatus = statusFilter === "All" || r.status === statusFilter;
      return matchSearch && matchDept && matchType && matchStatus;
    });
  }, [search, deptFilter, typeFilter, statusFilter]);

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
          <div className="roles-filters-bar">
             <div className="roles-filter-group">
                <label htmlFor="search-roles">Search roles</label>
                <input 
                   id="search-roles"
                   type="text" 
                   className="roles-filter-input" 
                   placeholder="Keyword or department..."
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   data-testid="input-roles-search"
                />
             </div>
             <div className="roles-filter-group">
                <label htmlFor="dept-filter">Department</label>
                <select 
                   id="dept-filter"
                   className="roles-filter-input"
                   value={deptFilter}
                   onChange={e => setDeptFilter(e.target.value)}
                   data-testid="select-roles-dept"
                >
                   {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
             </div>
             <div className="roles-filter-group">
                <label htmlFor="type-filter">Role Type</label>
                <select 
                   id="type-filter"
                   className="roles-filter-input"
                   value={typeFilter}
                   onChange={e => setTypeFilter(e.target.value)}
                   data-testid="select-roles-type"
                >
                   {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
             </div>
             <div className="roles-filter-group">
                <label htmlFor="status-filter">Status</label>
                <select 
                   id="status-filter"
                   className="roles-filter-input"
                   value={statusFilter}
                   onChange={e => setStatusFilter(e.target.value)}
                   data-testid="select-roles-status"
                >
                   {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
          </div>
        </section>

        <section className="roles-list larkin2-section">
          <div className="roles-count" data-testid="text-roles-count">
            {filteredRoles.length} {filteredRoles.length === 1 ? "Result" : "Results"}
          </div>

          {filteredRoles.length === 0 ? (
            <div className="roles-empty" data-testid="container-roles-empty">
              <h3 className="roles-empty-title">No roles match your criteria</h3>
              <p>Try adjusting your filters or search term to see more results.</p>
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
                    <MaskedLink href={role.url} testId={`link-role-${role.id}`} target="_blank" rel="noopener noreferrer">
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
