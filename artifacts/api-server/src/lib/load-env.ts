import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadEnvFile } from "node:process";

// pnpm starts in the package directory; direct production commands start at repo root.
// Load before app/database modules. Node preserves variables injected by the host.
let root = process.cwd();
while (!existsSync(join(root, "pnpm-workspace.yaml")) && dirname(root) !== root) {
  root = dirname(root);
}
const envPath = join(root, ".env");
if (existsSync(join(root, "pnpm-workspace.yaml")) && existsSync(envPath)) loadEnvFile(envPath);
