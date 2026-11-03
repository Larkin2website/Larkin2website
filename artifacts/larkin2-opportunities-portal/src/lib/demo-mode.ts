export const portalDemoMode =
  import.meta.env.VITE_AUTH_PROVIDER === "external" ? false : import.meta.env.PROD
    ? import.meta.env.VITE_PUBLIC_TEST_LOGIN_ENABLED === "true"
    : import.meta.env.VITE_DEV_DEMO_LOGIN_ENABLED === "true" &&
      import.meta.env.VITE_PORTAL_DEMO_MODE !== "false";

export const portalTestAccessLabel = import.meta.env.PROD ? "Public testing access" : "Development access only";