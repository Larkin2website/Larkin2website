import { useEffect, useRef } from "react";
import { SiteFooter } from "./layout";

/** Keeps the homepage footer stationary as the FAQ section scrolls off it. */
export function HomeFooterReveal() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const spacer = spacerRef.current;
    const panel = panelRef.current;
    if (!spacer || !panel) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const measure = () => {
      const height = Math.ceil(panel.getBoundingClientRect().height);
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      // A tall footer must scroll normally so none of its links get trapped.
      const enabled = !motionQuery.matches && height > 0 && height <= viewportHeight - 24;
      spacer.style.setProperty("--home-footer-height", `${height}px`);
      spacer.dataset.revealEnabled = String(enabled);
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(panel);
    window.addEventListener("resize", scheduleMeasure);
    window.visualViewport?.addEventListener("resize", scheduleMeasure);
    motionQuery.addEventListener("change", scheduleMeasure);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.visualViewport?.removeEventListener("resize", scheduleMeasure);
      motionQuery.removeEventListener("change", scheduleMeasure);
    };
  }, []);

  const revealFocusedLink = () => {
    const spacer = spacerRef.current;
    if (!spacer || spacer.dataset.revealEnabled !== "true") return;
    const bottom = spacer.getBoundingClientRect().bottom;
    if (bottom > window.innerHeight) {
      // Keyboard navigation should reveal the footer before focusing its links.
      window.scrollTo({
        top: window.scrollY + bottom - window.innerHeight,
        behavior: "instant",
      });
    }
  };

  return (
    <div className="home-footer-reveal" ref={spacerRef} onFocusCapture={revealFocusedLink}>
      <div className="home-footer-reveal-panel" ref={panelRef}>
        <SiteFooter />
      </div>
    </div>
  );
}