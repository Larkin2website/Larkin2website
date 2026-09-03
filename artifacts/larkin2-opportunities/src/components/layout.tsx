import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";

export function MaskedLink({ href, children, className = "", testId, onClick }: any) {
  const [location] = useLocation();
  const isHash = href.startsWith("#");
  const isInternal = href.startsWith("/");

  const content = (
    <>
      <span className="larkin2-link-label" aria-hidden="true">
        <span>{children}</span>
        <span>{children}</span>
      </span>
      <span className="larkin2-link-arrow" aria-hidden="true">↗</span>
    </>
  );

  if (isInternal) {
    return (
      <Link href={href} className={`larkin2-link ${className}`} onClick={onClick} aria-label={children} data-testid={testId}>
        {content}
      </Link>
    );
  }

  if (isHash) {
    if (location === "/") {
      return (
        <a className={`larkin2-link ${className}`} href={href} onClick={onClick} aria-label={children} data-testid={testId}>
          {content}
        </a>
      );
    } else {
      return (
        <Link href={`/${href}`} className={`larkin2-link ${className}`} onClick={onClick} aria-label={children} data-testid={testId}>
          {content}
        </Link>
      );
    }
  }

  return (
    <a className={`larkin2-link ${className}`} href={href} onClick={onClick} aria-label={children} data-testid={testId}>
      {content}
    </a>
  );
}

export function SiteHeader({ scrolled, headerHidden, menuOpen, setMenuOpen, headerRef, menuButtonRef }: any) {
  const [location] = useLocation();
  
  const NavLink = ({ href, children, testId }: any) => {
    if (href.startsWith("#") && location !== "/") {
      return <Link href={`/${href}`} className="larkin2-nav-link" data-testid={testId}>{children}</Link>;
    }
    return <a href={href} className="larkin2-nav-link" data-testid={testId}>{children}</a>;
  };

  const LogoLink = () => {
    if (location === "/") {
      return <a href="#top" className="larkin2-mark" aria-label="Larkin2 home" data-testid="link-home">Larkin2<span aria-hidden="true">.</span></a>;
    }
    return <Link href="/" className="larkin2-mark" aria-label="Larkin2 home" data-testid="link-home">Larkin2<span aria-hidden="true">.</span></Link>;
  }

  return (
    <header ref={headerRef} className={`larkin2-top ${scrolled ? "is-scrolled" : ""} ${headerHidden ? "is-hidden" : ""}`}>
      <LogoLink />
      <nav className="larkin2-nav" aria-label="Main navigation">
        <NavLink href="#paths" testId="link-opportunities">Opportunities</NavLink>
        <NavLink href="#commitments" testId="link-commitments">Commitments</NavLink>
        <NavLink href="#about" testId="link-about">About</NavLink>
      </nav>
      <MaskedLink href="#signup" className="larkin2-header-cta" testId="link-signup-nav">Sign up</MaskedLink>
      <button
        ref={menuButtonRef}
        type="button"
        className="larkin2-menu-toggle"
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setMenuOpen(true)}
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
      return <Link href={`/${href}`} data-testid={testId}>{children}</Link>;
    }
    return <a href={href} data-testid={testId}>{children}</a>;
  };

  return (
    <footer className="larkin2-foot">
      <div className="larkin2-foot-brand"><span className="larkin2-mark">Larkin2<span aria-hidden="true">.</span></span><p>Official production opportunities.</p></div>
      <div className="larkin2-foot-col">
        <span>Explore</span>
        <FooterLink href="#paths" testId="link-footer-opportunities">Opportunities</FooterLink>
        <FooterLink href="#commitments" testId="link-footer-commitments">Commitments</FooterLink>
        <FooterLink href="#about" testId="link-footer-about">About Larkin2</FooterLink>
      </div>
      <div className="larkin2-foot-col">
        <span>Contact</span>
        <FooterLink href="#signup" testId="link-footer-signup">Sign up for updates</FooterLink>
        <a href="mailto:opportunities@baileyopportunities.com" data-testid="link-footer-contact">Contact us ↗</a>
      </div>
      <div className="larkin2-foot-bottom"><span>London / UK</span><span>© 60Forty Films</span><span>Official Larkin2 opportunities</span></div>
    </footer>
  );
}

export function MobileMenu({ menuOpen, setMenuOpen, menuButtonRef }: any) {
  const [location] = useLocation();
  const menuPanelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  
  const closeMenu = () => setMenuOpen(false);

  const MobileLink = ({ href, children, testId, num }: any) => {
    if (href.startsWith("#") && location !== "/") {
      return <Link href={`/${href}`} onClick={closeMenu} data-testid={testId}>{children} <span>{num}</span></Link>;
    }
    return <a href={href} onClick={closeMenu} data-testid={testId}>{children} <span>{num}</span></a>;
  };

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = "";
      if (wasOpen.current) menuButtonRef?.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !menuPanelRef.current) return;
      const focusable = Array.from(menuPanelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, setMenuOpen, menuButtonRef]);

  return (
    <aside
      ref={menuPanelRef}
      id="mobile-menu"
      className={`larkin2-mobile-menu ${menuOpen ? "is-open" : ""}`}
      aria-label="Mobile navigation"
      aria-hidden={!menuOpen}
    >
      <div className="larkin2-mobile-menu-head">
        <span className="larkin2-mobile-label">Larkin2 / navigation</span>
        <button ref={closeButtonRef} type="button" className="larkin2-menu-close" onClick={closeMenu} aria-label="Close menu" data-testid="button-menu-close">
          Close <span aria-hidden="true">×</span>
        </button>
      </div>
      <nav className="larkin2-mobile-nav" aria-label="Mobile main navigation">
        <MobileLink href="#top" testId="link-mobile-home" num="01">Home</MobileLink>
        <MobileLink href="#paths" testId="link-mobile-opportunities" num="02">Opportunities</MobileLink>
        <MobileLink href="#commitments" testId="link-mobile-commitments" num="03">Our commitments</MobileLink>
        <MobileLink href="#about" testId="link-mobile-about" num="04">About Larkin2</MobileLink>
        <MobileLink href="#signup" testId="link-mobile-signup" num="05">Sign up</MobileLink>
      </nav>
      <div className="larkin2-mobile-contact">
        <span>Questions about an opportunity?</span>
        <a href="mailto:opportunities@baileyopportunities.com" onClick={closeMenu} data-testid="link-mobile-contact">Contact us ↗</a>
      </div>
    </aside>
  );
}
