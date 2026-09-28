export const portalDemoMode =
  import.meta.env.DEV &&
  import.meta.env.VITE_DEV_DEMO_LOGIN_ENABLED === "true" &&
  import.meta.env.VITE_PORTAL_DEMO_MODE !== "false";