import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { scrollToHash } from "../utils/navigation";
import { pausePageScroll, resumePageScroll } from "../utils/smooth-scroll";

function focusHashTarget(href: string) {
  if (!href.startsWith("#")) return;
  let id: string;
  try {
    id = decodeURIComponent(href.slice(1));
  } catch {
    return;
  }
  window.setTimeout(() => {
    const target = document.getElementById(id);
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }, 100);
}

export function MaskedLink({ href, children, className = "", testId, onClick, target, rel }: any) {
  const [location] = useLocation();
  const isHash = href.startsWith("#");
  const isInternal = href.startsWith("/");

  const handleHashClick = (e: React.MouseEvent) => {
    if (onClick) onClick(e);
    if (isHash && location === "/") {
      e.preventDefault();
      history.pushState(null, '', href);
      scrollToHash(href);
      if (e.detail === 0) focusHashTarget(href);
    }
  };

  const content = (
    <>
      <span className="larkin2-link-label">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
      <span className="larkin2-link-arrow" aria-hidden="true">↗</span>
    </>
  );

  if (isInternal) {
    return (
      <Link href={href} className={`larkin2-link ${className}`} onClick={onClick} data-testid={testId}>
        {content}
      </Link>
    );
  }

  if (isHash) {
    if (location === "/") {
      return (
        <a className={`larkin2-link ${className}`} href={href} onClick={handleHashClick} data-testid={testId}>
          {content}
        </a>
      );
    } else {
      return (
        <Link href={`/${href}`} className={`larkin2-link ${className}`} onClick={(event) => {
          onClick?.(event);
          if (event.detail === 0) focusHashTarget(href);
        }} data-testid={testId}>
          {content}
        </Link>
      );
    }
  }

  return (
    <a className={`larkin2-link ${className}`} href={href} onClick={onClick} data-testid={testId} target={target} rel={rel}>
      {content}
    </a>
  );
}

export function SiteHeader({ scrolled, headerHidden, menuOpen, setMenuOpen, headerRef, menuButtonRef }: any) {
  const [location] = useLocation();
  
  const NavLink = ({ href, children, testId }: any) => {
    const handleHashClick = (e: React.MouseEvent) => {
      if (href.startsWith("#") && location === "/") {
        e.preventDefault();
        history.pushState(null, '', href);
        scrollToHash(href);
        if (e.detail === 0) focusHashTarget(href);
      }
    };

    if (href.startsWith("#") && location !== "/") {
      return <Link href={`/${href}`} className="larkin2-nav-link" onClick={(event) => {
        if (event.detail === 0) focusHashTarget(href);
      }} data-testid={testId}>{children}</Link>;
    }
    if (href.startsWith("/")) {
      return <Link href={href} className="larkin2-nav-link" data-testid={testId}>{children}</Link>;
    }
    return <a href={href} className="larkin2-nav-link" onClick={handleHashClick} data-testid={testId}>{children}</a>;
  };

  const LogoLink = () => {
    const handleHashClick = (e: React.MouseEvent) => {
      if (location === "/") {
        e.preventDefault();
        history.pushState(null, '', "#top");
        scrollToHash("#top");
        if (e.detail === 0) focusHashTarget("#top");
      }
    };

    if (location === "/") {
      return <a href="#top" className="larkin2-mark" onClick={handleHashClick} aria-label="HETV Opportunities Hub home" data-testid="link-home">HETV Opportunities Hub<span aria-hidden="true">.</span></a>;
    }
    return <Link href="/" className="larkin2-mark" aria-label="HETV Opportunities Hub home" data-testid="link-home">HETV Opportunities Hub<span aria-hidden="true">.</span></Link>;
  };

  return (
    <header ref={headerRef} className={`larkin2-top ${scrolled ? "is-scrolled" : ""} ${headerHidden ? "is-hidden" : ""}`}>
      <LogoLink />
      <nav className="larkin2-nav" aria-label="Main navigation">
        <NavLink href="#about" testId="link-nav-about">About</NavLink>
        <NavLink href="/roles" testId="link-nav-roles">Roles</NavLink>
        <NavLink href="/development" testId="link-nav-development">Development Programmes</NavLink>
        <NavLink href="/training" testId="link-nav-training">Training Courses</NavLink>
      </nav>
      <MaskedLink href="/contact" className="larkin2-header-cta" testId="link-nav-contact">Contact Us</MaskedLink>
      <button
        ref={menuButtonRef}
        type="button"
        className="larkin2-menu-toggle"
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setMenuOpen(!menuOpen)}
        data-testid="button-menu-toggle"
      >
        <span>{menuOpen ? "Close" : "Menu"}</span><i aria-hidden="true" />
      </button>
    </header>
  );
}

export function SiteFooter() {
  const [location] = useLocation();
  
  const FooterLink = ({ href, children, testId }: any) => {
    if (href.startsWith("#") && location !== "/") {
      return <Link href={`/${href}`} onClick={(event) => {
        if (event.detail === 0) focusHashTarget(href);
      }} data-testid={testId}>{children}</Link>;
    }
    if (href.startsWith("/")) {
      return <Link href={href} data-testid={testId}>{children}</Link>;
    }
    if (href.startsWith("#")) {
      return <a href={href} data-testid={testId} onClick={(event) => {
        event.preventDefault();
        history.pushState(null, "", href);
        scrollToHash(href);
        if (event.detail === 0) focusHashTarget(href);
      }}>{children}</a>;
    }
    return <a href={href} data-testid={testId}>{children}</a>;
  };

  return (
    <footer className="larkin2-foot">
      <div className="larkin2-foot-brand"><span className="larkin2-mark">HETV Opportunities Hub<span aria-hidden="true">.</span></span><p>Roles, training and development across high-end television.</p></div>
      <div className="larkin2-foot-col" role="group" aria-labelledby="footer-explore-heading">
        <span id="footer-explore-heading" role="heading" aria-level={2}>Explore</span>
        <FooterLink href="#production-culture" testId="link-footer-production-culture">Production Culture Statement</FooterLink>
        <FooterLink href="/roles" testId="link-footer-roles">Roles</FooterLink>
        <FooterLink href="/opportunities" testId="link-footer-opportunities">Opportunities</FooterLink>
        <FooterLink href="#commitments" testId="link-footer-commitments">Commitments</FooterLink>
        <FooterLink href="/faqs" testId="link-footer-faqs">FAQs</FooterLink>
      </div>
      <div className="larkin2-foot-col" role="group" aria-labelledby="footer-updates-heading">
        <span id="footer-updates-heading" role="heading" aria-level={2}>Manage Hub Updates</span>
        <FooterLink href="#signup" testId="link-footer-signup">Sign Up for Updates</FooterLink>
        <FooterLink href="/unsubscribe" testId="link-footer-unsubscribe">Unsubscribe</FooterLink>
        <FooterLink href="/contact" testId="link-footer-contact">Contact Us</FooterLink>
      </div>
      <div className="larkin2-foot-col" role="group" aria-labelledby="footer-legal-heading">
        <span id="footer-legal-heading" role="heading" aria-level={2}>Legal</span>
        <FooterLink href="/privacy" testId="link-footer-privacy">Privacy Notice</FooterLink>
        <FooterLink href="/terms" testId="link-footer-terms">Terms &amp; Conditions</FooterLink>
      </div>
      <div className="larkin2-foot-bottom"><span>London / UK</span><span>HETV Opportunities Hub</span></div>
    </footer>
  );
}

export function MobileMenu({ menuOpen, setMenuOpen, menuButtonRef }: any) {
  const [location] = useLocation();
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lockedScrollY = useRef(0);
  const restoreFocusRef = useRef(true);
  
  const closeMenu = (restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus;
    setMenuOpen(false);
  };

  const MobileLink = ({ href, children, testId, num }: any) => {
    const handleClick = (e: React.MouseEvent) => {
      if (href.startsWith("#") && location === "/") {
        e.preventDefault();
        
        closeMenu();
        
        history.pushState(null, '', href);
        scrollToHash(href);
        if (e.detail === 0) focusHashTarget(href);
      } else {
        closeMenu();
      }
    };

    if (href.startsWith("#") && location !== "/") {
      return <Link href={`/${href}`} onClick={(event) => {
        closeMenu(true);
        if (event.detail === 0) focusHashTarget(href);
      }} data-testid={testId}>{children} {num && <span aria-hidden="true">{num}</span>}</Link>;
    }
    if (href.startsWith("/")) {
      return <Link href={href} onClick={() => closeMenu(true)} data-testid={testId}>{children} {num && <span aria-hidden="true">{num}</span>}</Link>;
    }
    return <a href={href} onClick={handleClick} data-testid={testId}>{children} {num && <span aria-hidden="true">{num}</span>}</a>;
  };

  useEffect(() => {
    if (!menuOpen) return;

    restoreFocusRef.current = true;
    lockedScrollY.current = window.scrollY;
    pausePageScroll();
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY.current}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    
    // A hidden panel cannot receive focus during its entrance transition.
    // Move focus as soon as its close button becomes visible.
    const focusTimer = window.setInterval(() => {
      const close = closeButtonRef.current;
      if (close && getComputedStyle(close).visibility === "visible") {
        close.focus();
        window.clearInterval(focusTimer);
      }
    }, 20);
    
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu(true);
        return;
      }
      if (event.key !== "Tab" || !menuPanelRef.current) return;
      const focusable = Array.from(menuPanelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((element) => element.tabIndex >= 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focusIsInside = menuPanelRef.current.contains(document.activeElement);
      if (!focusIsInside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearInterval(focusTimer);
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      // Restore the native viewport after removing body:fixed, then let Lenis
      // reset its internal position from the restored scroll offset.
      window.scrollTo({ top: lockedScrollY.current, behavior: "instant" });
      resumePageScroll();
      document.removeEventListener("keydown", onKeyDown);
      if (restoreFocusRef.current && menuButtonRef?.current?.isConnected) menuButtonRef.current.focus();
    };
  }, [menuOpen, setMenuOpen, menuButtonRef]);

  return (
    <div
      ref={menuPanelRef}
      id="mobile-menu"
      data-lenis-prevent
      className={`larkin2-mobile-menu ${menuOpen ? "is-open" : ""}`}
      aria-labelledby="mobile-menu-title"
      aria-hidden={!menuOpen}
      role="dialog"
      aria-modal={menuOpen ? true : undefined}
      inert={!menuOpen}
    >
      <div className="larkin2-mobile-menu-head">
        <span className="larkin2-mobile-label" id="mobile-menu-title">HETV Opportunities Hub / navigation</span>
        <button ref={closeButtonRef} type="button" className="larkin2-menu-close" onClick={() => closeMenu(true)} aria-label="Close menu" data-testid="button-menu-close">
          Close <span aria-hidden="true">×</span>
        </button>
      </div>
      <nav className="larkin2-mobile-nav" aria-label="Mobile main navigation">
        <MobileLink href="#about" testId="link-mobile-about" num="01">About</MobileLink>
        <MobileLink href="/roles" testId="link-mobile-roles" num="02">Roles</MobileLink>
        <MobileLink href="/development" testId="link-mobile-development" num="03">Development Programmes</MobileLink>
        <MobileLink href="/training" testId="link-mobile-training" num="04">Training Courses</MobileLink>
        <MobileLink href="/contact" testId="link-mobile-contact" num="05">Contact Us</MobileLink>
      </nav>
      <div className="larkin2-mobile-contact">
        <span>Questions about an opportunity?</span>
        <Link href="/faqs" onClick={() => closeMenu()} data-testid="link-mobile-faqs">Read the FAQs <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
  );
}
