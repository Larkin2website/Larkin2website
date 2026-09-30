import Lenis from "lenis";

let scroll: Lenis | null = null;
let menuLocked = false;

const motionPreference = () => window.matchMedia("(prefers-reduced-motion: reduce)");

/** One controller for the public site; touch, keyboard, and reduced-motion use native scrolling. */
export function startSmoothScroll() {
  const motion = motionPreference();

  const update = () => {
    scroll?.destroy();
    scroll = null;
    if (motion.matches) return;

    scroll = new Lenis({
      duration: 2.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.5,
      smoothWheel: true,
      syncTouch: false,
      allowNestedScroll: true,
      autoRaf: true,
    });
    if (menuLocked) scroll.stop();
  };

  // Cancel pending wheel momentum before a native keyboard or focus jump.
  const cancelMomentum = () => {
    if (scroll?.isScrolling === "smooth") {
      scroll.stop();
      if (!menuLocked) scroll.start();
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
      cancelMomentum();
    }
  };

  update();
  motion.addEventListener("change", update);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("focusin", cancelMomentum);
  return () => {
    motion.removeEventListener("change", update);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("focusin", cancelMomentum);
    scroll?.destroy();
    scroll = null;
  };
}

export function scrollPageTo(top: number, behavior: "smooth" | "instant" = "smooth") {
  if (scroll) {
    scroll.scrollTo(top, { immediate: behavior === "instant", force: menuLocked });
  } else {
    window.scrollTo({
      top,
      behavior: behavior === "instant" || motionPreference().matches ? "instant" : "smooth",
    });
  }
}

export function pausePageScroll() {
  menuLocked = true;
  scroll?.stop();
}

export function resumePageScroll() {
  menuLocked = false;
  scroll?.start();
}