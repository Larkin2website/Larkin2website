import type { RequestHandler } from "express";

// Use only the direct Host header, not caller-supplied forwarded hostnames.
export function allowedProductionHosts(env: NodeJS.ProcessEnv = process.env): RequestHandler {
  const names = [env.RENDER_EXTERNAL_HOSTNAME, ...(env.ALLOWED_HOSTS ?? "").split(",")]
    .map(value => value?.trim().toLowerCase()).filter((value): value is string => Boolean(value));
  if (!names.length) return (_req, _res, next) => next();
  return (req, res, next) => {
    const host = req.headers.host?.toLowerCase().replace(/:\d+$/, "");
    if (!host || !names.includes(host)) { res.status(400).json({ error: "Unrecognized host" }); return; }
    next();
  };
}
