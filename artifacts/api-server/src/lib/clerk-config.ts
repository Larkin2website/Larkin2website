export function externalClerk(env: NodeJS.ProcessEnv = process.env) {
  return env.AUTH_PROVIDER === "external" || env.RENDER === "true";
}

export function clerkConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.CLERK_PUBLISHABLE_KEY?.trim() && env.CLERK_SECRET_KEY?.trim());
}
