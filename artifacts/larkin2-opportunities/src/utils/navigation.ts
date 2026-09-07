export function scrollToHash(hash: string) {
  const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";

  if (!hash) {
    window.scrollTo({ top: 0, behavior });
    return;
  }
  
  requestAnimationFrame(() => {
    setTimeout(() => {
      const target = document.querySelector(hash);
      if (!target) return;
      
      const header = document.querySelector('header.larkin2-top');
      // Measure actual header height dynamically, fallback to 80 if missing
      const headerHeight = header ? header.getBoundingClientRect().height : 80;
      
      const rect = target.getBoundingClientRect();
      const targetPosition = rect.top + window.scrollY;
      
      window.scrollTo({
        top: Math.max(0, targetPosition - headerHeight - 16),
        behavior
      });
    }, 50);
  });
}