import type { RequestHandler } from "express";
import { staffConfig } from "../lib/staff-security";

export const productionSecurity: RequestHandler = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (/^\/api\/(?:auth|portal|crm)(?:\/|$)/.test(req.path)) res.setHeader("Cache-Control", "no-store");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", [
      "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com", "img-src 'self' data: https:",
      "media-src 'self' blob: https:", "connect-src 'self'", "object-src 'none'",
      "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ].join("; "));
    if (req.secure) res.setHeader("Strict-Transport-Security", "max-age=31536000");
    // Staff sessions are host-only. All staff pages use one explicit origin;
    // legacy public subscriber links are deliberately not redirected here.
    if (["GET", "HEAD"].includes(req.method) && /^\/(?:larkin2-opportunities-portal|hetv-audience-crm)(?:\/|$)/.test(req.path)) {
      try {
        const { origin } = staffConfig();
        if (req.get("host")?.toLowerCase() !== new URL(origin).host) { res.redirect(308, `${origin}${req.originalUrl}`); return; }
      } catch { /* Missing destination setup remains closed at the auth boundary. */ }
    }
  }
  next();
};
