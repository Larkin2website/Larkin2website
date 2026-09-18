import { useEffect, useState, useRef, useMemo } from "react";
import {
  getListPublicOpportunityOptionsQueryKey,
  getListPublicOpportunitiesQueryKey,
  useListPublicOpportunityOptions,
  useListPublicOpportunities,
} from "@workspace/api-client-react";
import { SiteHeader, MobileMenu, SiteFooter, MaskedLink } from "../components/layout";
import { publicOpportunityToRole } from "../data/role-api";

export function RolesPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleTypeFilter, setRoleTypeFilter] = useState("");
  const {
    data: publicOpportunities = [],
    isLoading: rolesLoading,
    isError: rolesFailed,
  } = useListPublicOpportunities(undefined, {
    query: {
      queryKey: getListPublicOpportunitiesQueryKey(),
      staleTime: 60_000,
      retry: 2,
    },
  });
  const { data: publicOpportunityOptions } = useListPublicOpportunityOptions({
    query: {
      queryKey: getListPublicOpportunityOptionsQueryKey(),
      staleTime: 60_000,
      retry: 2,
    },
  });
  const roles = useMemo(
    () => publicOpportunities.map(publicOpportunityToRole),
    [publicOpportunities],
  );
  const filterOptions = useMemo(() => ({
    statuses: [...new Set(roles.map(role => role.status))].sort(),
    departments: [...new Set([
      ...(publicOpportunityOptions?.departments ?? []),
      ...roles.map(role => role.department),
    ])].sort(),
    roleTypes: [...new Set([
      ...(publicOpportunityOptions?.roleTypes ?? []),
      ...roles.map(role => role.roleType),
    ])].sort(),
  }), [publicOpportunityOptions, roles]);
  const hasActiveFilters = Boolean(search.trim() || statusFilter || departmentFilter || roleTypeFilter);

  useEffect(() => {
    document.title = "Roles | HETV Opportunities Hub";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Find Jobs, Employment & Career Opportunities | HETV Opportunities Hub");
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
    return roles.filter(r => {
      const searchableRole = [r.title, r.department, r.roleType, r.status].join(" ").toLowerCase();
      return terms.every(term => searchableRole.includes(term))
        && (!statusFilter || r.status === statusFilter)
        && (!departmentFilter || r.department === departmentFilter)
        && (!roleTypeFilter || r.roleType === roleTypeFilter);
    });
  }, [roles, search, statusFilter, departmentFilter, roleTypeFilter]);

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDepartmentFilter("");
    setRoleTypeFilter("");
  };

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
          <h1 className="roles-title">Search Available roles here</h1>
          <p className="roles-intro">Find Jobs, Employment &amp; Career Opportunities</p>
        </section>

        <section className="roles-filters larkin2-section">
          <div className="roles-classic-filters" aria-label="Filter roles">
            <div className="roles-filter-field">
              <label htmlFor="filter-status">Status</label>
              <select id="filter-status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} data-testid="select-role-status">
                <option value="">All statuses</option>
                {filterOptions.statuses.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div className="roles-filter-field">
              <label htmlFor="filter-department">Department</label>
              <select id="filter-department" value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} data-testid="select-role-department">
                <option value="">All departments</option>
                {filterOptions.departments.map(department => <option key={department} value={department}>{department}</option>)}
              </select>
            </div>
            <div className="roles-filter-field">
              <label htmlFor="filter-role-type">Role type</label>
              <select id="filter-role-type" value={roleTypeFilter} onChange={event => setRoleTypeFilter(event.target.value)} data-testid="select-role-type">
                <option value="">All role types</option>
                {filterOptions.roleTypes.map(roleType => <option key={roleType} value={roleType}>{roleType}</option>)}
              </select>
            </div>
            <button
              type="button"
              className="roles-filter-reset"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
              data-testid="button-clear-role-filters"
            >
              Clear all
            </button>
          </div>
        </section>

        <section className="roles-list larkin2-section">
          <div className="roles-count" aria-live="polite" data-testid="text-roles-count">
            {filteredRoles.length} {filteredRoles.length === 1 ? "Result" : "Results"}
          </div>

          {rolesLoading ? (
            <div className="roles-empty" role="status" aria-live="polite">
              <h3 className="roles-empty-title">Loading roles</h3>
              <p>Fetching the latest HETV Opportunities Hub roles.</p>
            </div>
          ) : rolesFailed ? (
            <div className="roles-empty" role="alert">
              <h3 className="roles-empty-title">Roles are temporarily unavailable</h3>
              <p>Please refresh the page or try again shortly.</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="roles-empty" data-testid="container-roles-empty">
              <h3 className="roles-empty-title">No roles match those filters</h3>
              <p>Try broadening your keyword search or clearing one of the selected filters.</p>
              {hasActiveFilters && <button type="button" className="roles-empty-reset" onClick={clearAllFilters}>Clear all filters</button>}
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