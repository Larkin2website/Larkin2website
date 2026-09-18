export function programmeRouteForHash(pathname: string, hash: string) {
  if (pathname !== "/" && pathname !== "") return undefined;
  let id: string;
  try { id = decodeURIComponent(hash.replace(/^#/, "")); }
  catch { return undefined; }
  if (id === "training") return "/training";
  if (id === "development") return "/development";
  return undefined;
}

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
      // Hashes may contain private management tokens, not CSS selectors.
      // Resolve only actual element IDs and ignore unknown/malformed fragments.
      let id: string;
      try { id = decodeURIComponent(hash.replace(/^#/, "")); }
      catch { return; }
      const target = document.getElementById(id);
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