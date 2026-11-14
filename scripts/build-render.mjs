import { execFileSync } from "node:child_process";

// Deliberately excludes the canvas, seeds, and workspace-only scripts.
const apps = ["larkin2-opportunities", "larkin2-opportunities-portal", "hetv-audience-crm"];
const env = {
  ...process.env, NODE_ENV: "production",
};
// Reuse the exact pnpm that launched this script (pnpm sets npm_execpath). A bare
// "pnpm" lookup can find a different host-installed version first on PATH (Render
// ships its own pnpm beside Node), which the pinned engines.pnpm then rejects.
const pnpmEntry = process.env.npm_execpath;
const [command, prefix] = pnpmEntry && /\.[cm]?js$/.test(pnpmEntry)
  ? [process.execPath, [pnpmEntry]]
  : [pnpmEntry || "pnpm", []];
const run = (args, extra = {}) => execFileSync(command, [...prefix, ...args], {
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
