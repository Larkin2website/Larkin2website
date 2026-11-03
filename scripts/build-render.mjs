import { execFileSync } from "node:child_process";

// Deliberately excludes the canvas, seeds, and workspace-only scripts.
const apps = ["larkin2-opportunities", "larkin2-opportunities-portal", "hetv-audience-crm"];
const env = {
  ...process.env, NODE_ENV: "production", VITE_AUTH_PROVIDER: "external",
  VITE_CLERK_PROXY_URL: "", VITE_PUBLIC_TEST_LOGIN_ENABLED: "false",
  VITE_DEV_DEMO_LOGIN_ENABLED: "false", VITE_PORTAL_DEMO_MODE: "false",
};
const run = (args, extra = {}) => execFileSync("pnpm", args, {
  stdio: "inherit", env: { ...env, ...extra },
});
run(["run", "typecheck:libs"]);
for (const app of [...apps, "api-server"]) {
  run(["--filter", `@workspace/${app}`, "run", "typecheck"]);
}
for (const app of apps) {
  run(["--filter", `@workspace/${app}`, "run", "build"], { BASE_PATH: `/${app}/` });
}
run(["--filter", "@workspace/api-server", "run", "build"]);
