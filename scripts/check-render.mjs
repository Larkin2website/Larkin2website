import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import Ajv from "ajv/dist/2020.js";

const root = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(root.packageManager, "pnpm@10.26.1");
assert.equal(readFileSync(".node-version", "utf8").trim(), "24.22.1");
assert.equal(root.scripts.start, "node artifacts/api-server/dist/index.mjs");
for (const name of ["larkin2-opportunities", "larkin2-opportunities-portal", "hetv-audience-crm"]) {
  const dir = path.join("artifacts", name, "dist/public");
  const index = readFileSync(path.join(dir, "index.html"), "utf8");
  assert(index.includes(`/${name}/assets/`), `${name}: incorrect asset base`);
  assert(!index.includes("@replit"), `${name}: workspace script injected`);
}
assert(existsSync("artifacts/api-server/dist/index.mjs"));
const blueprint = parse(readFileSync("render.yaml", "utf8"));
assert.equal(blueprint.services.length, 1);
assert.equal(blueprint.services[0].autoDeployTrigger, "off");
assert.equal(blueprint.services[0].healthCheckPath, "/api/healthz");
assert.equal(blueprint.services[0].numInstances, 1);
assert.equal(blueprint.databases[0].postgresMajorVersion, "16");
for (const variable of blueprint.services[0].envVars) {
  assert(!/(SECRET|API_KEY)$/.test(variable.key), `Secret must be supplied only on destination: ${variable.key}`);
}
// Optional offline validation against the official schema downloaded by the
// reviewer. Ordinary builds never make network calls or create cloud resources.
if (process.argv[2]) {
  const schema = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const validate = new Ajv({ strict: false, validateFormats: false }).compile(schema);
  assert(validate(blueprint), JSON.stringify(validate.errors));
  console.info("Blueprint checked against supplied official JSON schema.");
}
console.info("Render build artifacts, toolchain pins and frontend prefixes checked.");
console.info("No resources provisioned.");
