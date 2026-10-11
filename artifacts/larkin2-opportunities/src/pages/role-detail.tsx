import { useEffect, useRef, useState } from "react";
import {
  PRODUCTION_COMMITMENTS,
  PRODUCTION_CULTURE,
  getGetPublicOpportunityQueryKey,
  roleApplicationTarget,
  recordPublicEngagement,
  useGetPublicOpportunity,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { MobileMenu, SiteFooter, SiteHeader, MaskedLink } from "../components/layout";
import { publicOpportunityToRole } from "../data/role-api";
import { SAMPLE_ROLE, SAMPLE_ROLE_ID } from "../data/sample-listings";
import NotFound from "./not-found";

const PSI_LINK = "https://www.pact.co.uk/resource/production-support-initiative-updated-and-now-online.html";
const WORK_ARRANGEMENT: Record<string, string> = { in_person: "In person", hybrid: "Hybrid", work_from_home: "Work from home" };

function formatClosing(date?: string | null, time?: string | null) {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return time ? `${label} at ${time}` : label;
}

export function RoleDetailPage({ id }: { id: string }) {
  const isSample = import.meta.env.DEV && id === SAMPLE_ROLE_ID;
  const {
    data: publicOpportunity,
    isLoading: roleLoading,
    isError: roleFailed,
  } = useGetPublicOpportunity(id, {
    query: {
      queryKey: getGetPublicOpportunityQueryKey(id),
      retry: 1,
      staleTime: 60_000,
      enabled: !isSample,
    },
  });
  const role = isSample
    ? SAMPLE_ROLE
    : publicOpportunity
    ? publicOpportunityToRole(publicOpportunity)
    : undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const trackedViewId = useRef("");
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!role) return;
    document.title = `${role.title} | HETV Opportunities Hub`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", role.summary);
  }, [role]);

  useEffect(() => {
    if (isSample || !publicOpportunity || trackedViewId.current === publicOpportunity.id) return;
    trackedViewId.current = publicOpportunity.id;
    void recordPublicEngagement({ kind: "role", id: publicOpportunity.id, event: "view" }).catch(() => undefined);
  }, [isSample, publicOpportunity]);

  function trackApply() {
    if (!isSample && publicOpportunity) {
      void recordPublicEngagement({ kind: "role", id: publicOpportunity.id, event: "apply" }).catch(() => undefined);
    }
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

  if (!isSample && roleLoading) {
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

  if (!isSample && (roleFailed || !role)) return <NotFound />;
  if (!role) return <NotFound />;

  const acceptingApplications = !isSample && role.status === "Open";
  const applyTarget = isSample ? undefined : roleApplicationTarget(role);
  const canApply = acceptingApplications && !!applyTarget;
  const isEmailTarget = !!applyTarget?.startsWith("mailto:");
  const linkProps = isEmailTarget ? {} : { target: "_blank", rel: "noopener noreferrer" };
  const closing = formatClosing(role.applicationClosingDate, role.applicationClosingTime);
  const profileRows = [
    role.accountableTo ? { label: "Accountable to", value: role.accountableTo } : null,
    role.contractDatesHours ? { label: "Contract dates / hours", value: role.contractDatesHours } : null,
    role.workArrangement ? { label: "Work arrangement", value: WORK_ARRANGEMENT[role.workArrangement] } : null,
  ].filter((r): r is { label: string; value: string } => r !== null);
  const detailRows = [...profileRows, ...role.details];
  const worksWith = role.worksCloselyWith ?? [];
  const hasApplySection = !!(closing || applyTarget || role.applicationInstructions || role.trainingApplicationInstructions);
  const unavailableNote = isSample
    ? "Example only — no application link is available."
    : !acceptingApplications
    ? `Applications are not being accepted — this role is ${role.status.toLowerCase()}.`
    : "Application link unavailable.";

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
              {isSample && <p className="roles-badge is-featured" role="note">SAMPLE — NOT A REAL OPENING</p>}
              <div className="roles-card-badges roles-detail-badges">
                {role.deadlineExtended && <span className="roles-badge is-urgent">Deadline extended</span>}
                {role.urgent && <span className="roles-badge is-urgent">Urgent</span>}
                {role.featured && <span className="roles-badge is-featured">Featured</span>}
              </div>
              <h1 className="roles-detail-title">{role.title}</h1>
              <p className="roles-detail-summary">{role.summary}</p>
              <div className="roles-card-action roles-detail-apply">
                {canApply ? (
                  <MaskedLink
                    href={applyTarget!}
                    testId="link-role-apply-now"
                    {...linkProps}
                    onClick={trackApply}
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
                      {unavailableNote}
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
              {closing && <p data-testid="text-role-closing">Applications close {closing}.</p>}
              {canApply ? (
                <MaskedLink
                  href={applyTarget!}
                  className="roles-detail-alert-link"
                  testId="link-role-apply"
                  {...linkProps}
                  onClick={trackApply}
                >
                  Apply for this role
                </MaskedLink>
              ) : isSample ? (
                <p>Example only — this sample has no application link.</p>
              ) : (
                <MaskedLink href="/#signup" className="roles-detail-alert-link" testId="link-role-alerts">Sign up for updates</MaskedLink>
              )}
            </div>
          </aside>

          <div className="roles-detail-main">
            {role.responsibilities.length > 0 && (
              <section className="roles-detail-block" data-testid="section-role-scope">
                <h2>Scope of role</h2>
                <ul>{role.responsibilities.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </section>
            )}

            {worksWith.length > 0 && (
              <section className="roles-detail-block" data-testid="section-role-works-with">
                <h2>Works closely with</h2>
                <ul>{worksWith.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </section>
            )}

            {!!role.essential?.length && (
              <section className="roles-detail-block" data-testid="section-role-essential">
                <h2>Essential experience</h2>
                <ul>{role.essential.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </section>
            )}

            {!!role.desired?.length && (
              <section className="roles-detail-block" data-testid="section-role-desired">
                <h2>Desired experience</h2>
                <ul>{role.desired.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </section>
            )}

            {detailRows.length > 0 && (
              <section className="roles-detail-block" data-testid="section-role-details">
                <h2>Role details</h2>
                <dl className="roles-detail-list">
                  {detailRows.map((detail, i) => (
                    <div key={`${detail.label}-${i}`}>
                      <dt>{detail.label}</dt>
                      <dd style={{ whiteSpace: "pre-line" }}>{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {role.additionalInformation && (
              <section className="roles-detail-block" data-testid="section-role-additional">
                <h2>Additional information</h2>
                <p style={{ whiteSpace: "pre-line", lineHeight: 1.65, fontSize: 17 }}>{role.additionalInformation}</p>
              </section>
            )}

            {hasApplySection && (
              <section className="roles-detail-block" data-testid="section-role-how-to-apply">
                <h2>How to apply</h2>
                <div style={{ display: "grid", gap: 14, fontSize: 17, lineHeight: 1.65, overflowWrap: "anywhere" }}>
                  {closing && <p>Applications close {closing}.</p>}
                  {applyTarget && (
                    <p>
                      {isEmailTarget ? "Apply by email: " : "Apply via: "}
                      {canApply ? (
                        <a href={applyTarget} {...linkProps} onClick={trackApply} data-testid="link-role-apply-destination" style={{ textDecoration: "underline" }}>
                          {isEmailTarget ? role.applicationEmail : role.applicationUrl}
                        </a>
                      ) : (
                        <span>{isEmailTarget ? role.applicationEmail : role.applicationUrl}</span>
                      )}
                    </p>
                  )}
                  {role.applicationInstructions && <p style={{ whiteSpace: "pre-line" }}>{role.applicationInstructions}</p>}
                  {role.trainingApplicationInstructions && <p style={{ whiteSpace: "pre-line" }}>{role.trainingApplicationInstructions}</p>}
                </div>
              </section>
            )}

            <section className="roles-detail-block" data-testid="section-role-culture">
              <h2>Our production culture</h2>
              <div style={{ display: "grid", gap: 14, fontSize: 17, lineHeight: 1.65 }}>
                {PRODUCTION_CULTURE.map((p) => <p key={p}>{p}</p>)}
                <p>
                  <a href={PSI_LINK} target="_blank" rel="noopener noreferrer" data-testid="link-role-psi" style={{ textDecoration: "underline" }}>
                    More information on this Production Support led approach can be found here
                  </a>
                </p>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 500, margin: "12px 0 0" }}>What does this mean for you?</h3>
                <p>This means, we ask everyone working on the production to:</p>
                <div role="list" style={{ display: "grid", gap: 12 }}>
                  {PRODUCTION_COMMITMENTS.map((c, i) => (
                    <div key={c} role="listitem" style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 8 }}>
                      <span aria-hidden="true">{i + 1}.</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="roles-detail-footer larkin2-section">
          <p className="larkin2-eyebrow">HETV Hub opportunities</p>
          <h2>Explore all roles</h2>
          <MaskedLink href="/roles" className="larkin2-btn roles-detail-footer-link" testId="link-role-return">All roles</MaskedLink>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}