import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("optional repository .env loads before runtime with injected variables taking precedence", () => {
  const root = mkdtempSync(join(tmpdir(), "email-env-test-"));
  try {
    mkdirSync(join(root, "artifacts", "api-server"), { recursive: true });
    writeFileSync(join(root, "pnpm-workspace.yaml"), "packages: []");
    writeFileSync(join(root, ".env"), "PORTABLE_TEST_FROM_FILE=file-value\nPORTABLE_TEST_OVERRIDE=file-value\n");
    const result = spawnSync(process.execPath, [
      "--import", import.meta.resolve("tsx"), "--input-type=module", "-e",
      `await import(${JSON.stringify(new URL("./load-env.ts", import.meta.url).href)}); console.log(JSON.stringify([process.env.PORTABLE_TEST_FROM_FILE,process.env.PORTABLE_TEST_OVERRIDE]));`,
    ], { cwd: join(root, "artifacts", "api-server"), env: { PORTABLE_TEST_OVERRIDE: "host-value" }, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), ["file-value", "host-value"]);
    rmSync(join(root, ".env"));
    const absent = spawnSync(process.execPath, [
      "--import", import.meta.resolve("tsx"), "--input-type=module", "-e",
      `await import(${JSON.stringify(new URL("./load-env.ts", import.meta.url).href)});`,
    ], { cwd: root, env: {}, encoding: "utf8" });
    assert.equal(absent.status, 0, absent.stderr);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
