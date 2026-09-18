import type { RequestHandler } from "express";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  maxKeys?: number;
};

type Window = {
  count: number;
  resetAt: number;
};

export function createFixedWindowRateLimit({
  limit,
  windowMs,
  maxKeys = 10_000,
}: RateLimitOptions): RequestHandler {
  const windows = new Map<string, Window>();

  return (req, res, next) => {
    const currentTime = Date.now();
    const key = req.ip || "unknown";
    let window = windows.get(key);

    if (!window || window.resetAt <= currentTime) {
      if (!window && windows.size >= maxKeys) {
        const oldestKey = windows.keys().next().value as string | undefined;
        if (oldestKey) windows.delete(oldestKey);
      }
      window = { count: 0, resetAt: currentTime + windowMs };
      windows.set(key, window);
    }

    window.count += 1;
    if (window.count > limit) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil((window.resetAt - currentTime) / 1000)));
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    next();
  };
}