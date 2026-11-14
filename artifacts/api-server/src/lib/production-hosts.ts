import type { RequestHandler } from "express";

const LIVENESS_PATH = "/api/healthz";

// Use only the direct Host header, not caller-supplied forwarded hostnames.
export function allowedProductionHosts(env: NodeJS.ProcessEnv = process.env): RequestHandler {
  const names = [env.RENDER_EXTERNAL_HOSTNAME, ...(env.ALLOWED_HOSTS ?? "").split(",")]
    .map(value => value?.trim().toLowerCase()).filter((value): value is string => Boolean(value));
  if (!names.length) return (_req, _res, next) => next();
  return (req, res, next) => {
    // Render's health checker calls the instance over its private network with an
    // internal Host header. Process liveness exposes no data, so only it is exempt.
    if ((req.method === "GET" || req.method === "HEAD") && req.path === LIVENESS_PATH) { next(); return; }
    const host = req.headers.host?.toLowerCase().replace(/:\d+$/, "");
    if (!host || !names.includes(host)) { res.status(400).json({ error: "Unrecognized host" }); return; }
    next();
  };
}
