import { useEffect, useRef, useState } from "react";
import {
  getGetPublicOpportunityQueryKey,
  useGetPublicOpportunity,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { MobileMenu, SiteFooter, SiteHeader, MaskedLink } from "../components/layout";
import { publicOpportunityToRole } from "../data/role-api";
import NotFound from "./not-found";

export function RoleDetailPage({ id }: { id: string }) {
  const {
    data: publicOpportunity,
    isLoading: roleLoading,
    isError: roleFailed,
  } = useGetPublicOpportunity(id, {
    query: {
      queryKey: getGetPublicOpportunityQueryKey(id),
      retry: 1,
      staleTime: 60_000,
    },
  });
  const role = publicOpportunity
    ? publicOpportunityToRole(publicOpportunity)
    : undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!role) return;
    document.title = `${role.title} | HETV Opportunities Hub`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", role.summary);
  }, [role]);

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

  if (roleLoading) {
    return (
      <div className="larkin2-page roles-detail-page">
        <main id="content">
          <section className="roles-detail-hero larkin2-section" role="status">
            <div className="larkin2-eyebrow">HETV Hub opportunities</div>
            <h1 className="roles-detail-title">Loading role</h1>
            <p className="roles-detail-summary">Fetching the latest details.</p>
          </section>
        </main>
      </div>
    );
  }

  if (roleFailed || !role) return <NotFound />;

  const acceptingApplications = role.status === "Open";

  return (
    <div className="larkin2-page roles-detail-page" id="top">
      <SiteHeader
        scrolled={scrolled}
        headerHidden={headerHidden}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        headerRef={headerRef}
        menuButtonRef={menuButtonRef}
      />
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuButtonRef={menuButtonRef} />

      <main id="content">
        <section className="roles-detail-hero larkin2-section">
          <Link href="/roles" className="roles-detail-back" data-testid="link-role-back">← All roles</Link>
          <div className="roles-detail-hero-grid">
            <div>
              <div className="larkin2-eyebrow">Role / {role.department}</div>
              <div className="roles-card-badges roles-detail-badges">
                {role.deadlineExtended && <span className="roles-badge is-urgent">Deadline extended</span>}
                {role.urgent && <span className="roles-badge is-urgent">Urgent</span>}
                {role.featured && <span className="roles-badge is-featured">Featured</span>}
              </div>
              <h1 className="roles-detail-title">{role.title}</h1>
              <p className="roles-detail-summary">{role.summary}</p>
              <div className="roles-card-action roles-detail-apply">
                {role.applicationUrl ? (
                  <MaskedLink
                    href={role.applicationUrl}
                    testId="link-role-apply-now"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apply now
                  </MaskedLink>
                ) : (
                  <>
                    <button
                      type="button"
                      className="larkin2-link"
                      data-testid="button-role-apply-now-disabled"
                      disabled
                      aria-describedby="role-application-unavailable"
                    >
                      Apply now
                    </button>
                    <p id="role-application-unavailable" className="roles-detail-apply-note">
                      Application link unavailable.
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="roles-detail-meta" aria-label="Role summary">
              <div><span>Status</span><strong><i className={`roles-status-indicator is-${role.status.toLowerCase()}`} />{role.status}</strong></div>
              <div><span>Department</span><strong>{role.department}</strong></div>
              <div><span>Role type</span><strong>{role.roleType}</strong></div>
              <div><span>Published</span><strong>{role.date}</strong></div>
            </div>
          </div>
        </section>

        <section className="roles-detail-content larkin2-section">
          <aside className="roles-detail-sidebar">
            <div className={`roles-detail-status ${acceptingApplications ? "is-open" : ""}`}>
              <span className="larkin2-eyebrow">{acceptingApplications ? "Applications open" : "Applications unavailable"}</span>
              <h2>{acceptingApplications ? "This role is accepting applications." : `This role is ${role.status.toLowerCase()}.`}</h2>
              <p>{role.applicationDeadline}</p>
              {role.responseDate && <p>{role.responseDate}</p>}
              {acceptingApplications && role.applicationUrl ? (
                <MaskedLink
                  href={role.applicationUrl}
                  className="roles-detail-alert-link"
                  testId="link-role-apply"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apply for this role
                </MaskedLink>
              ) : (
                <MaskedLink href="/#signup" className="roles-detail-alert-link" testId="link-role-alerts">Sign up for updates</MaskedLink>
              )}
            </div>
          </aside>

          <div className="roles-detail-main">
            <section className="roles-detail-block">
              <h2>About the role</h2>
              <ul>{role.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>

            {role.essential && (
              <section className="roles-detail-block">
                <h2>Essential experience</h2>
                <ul>{role.essential.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            )}

            {role.desired && (
              <section className="roles-detail-block">
                <h2>Desired experience</h2>
                <ul>{role.desired.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            )}

            <section className="roles-detail-block">
              <h2>Role details</h2>
              <dl className="roles-detail-list">
                {role.details.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </section>

        <section className="roles-detail-footer larkin2-section">
          <p className="larkin2-eyebrow">HETV Hub opportunities</p>
          <h2>Explore every role connected to the production.</h2>
          <MaskedLink href="/roles" className="larkin2-btn roles-detail-footer-link" testId="link-role-return">All roles</MaskedLink>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}