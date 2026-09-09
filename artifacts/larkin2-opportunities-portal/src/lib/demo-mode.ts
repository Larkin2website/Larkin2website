export const portalDemoMode =
  import.meta.env.VITE_PORTAL_DEMO_MODE === "true" ||
  (import.meta.env.DEV && import.meta.env.VITE_PORTAL_DEMO_MODE !== "false");