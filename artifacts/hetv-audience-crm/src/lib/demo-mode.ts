export const crmDemoMode =
  import.meta.env.PROD
    ? import.meta.env.VITE_PUBLIC_TEST_LOGIN_ENABLED === 'true'
    : import.meta.env.VITE_DEV_DEMO_LOGIN_ENABLED === 'true';

export const crmTestAccessLabel = import.meta.env.PROD ? 'PUBLIC TESTING ACCESS' : 'DEVELOPMENT ACCESS ONLY';