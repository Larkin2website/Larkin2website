import express, { type Express } from "express";
import path from "node:path";
import { existsSync } from "node:fs";

export const frontendNames = ["larkin2-opportunities", "larkin2-opportunities-portal", "hetv-audience-crm"] as const;

/** Only mounted by the production entry point when SERVE_STATIC_APPS=true. */
export function mountProductionFrontends(app: Express, artifactsDir = path.resolve("artifacts")) {
  for (const name of frontendNames) {
    const directory = path.join(artifactsDir, name, "dist/public");
    if (!existsSync(path.join(directory, "index.html"))) {
      throw new Error(`Missing production frontend: ${name}. Run pnpm build:render from the repository root.`);
    }
    const prefix = `/${name}`;
    app.get(prefix, (req, res, next) => {
      if (req.path.endsWith("/")) return next();
      const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
      res.redirect(308, `${prefix}/${query}`);
    });
    app.use(prefix, express.static(directory, {
      index: false, dotfiles: "deny", redirect: false,
      setHeaders(res, file) {
        res.setHeader("Cache-Control", file.includes(`${path.sep}assets${path.sep}`)
          ? "public, max-age=31536000, immutable" : "public, max-age=3600");
      },
    }));
    app.use(prefix, (req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path === "/assets" || req.path.startsWith("/assets/") || path.extname(req.path)
        || req.path.split("/").some(segment => segment.startsWith("."))) {
        res.status(404).json({ error: "Asset not found" }); return;
      }
      if (!req.accepts("html")) { res.status(404).json({ error: "Not found" }); return; }
      res.setHeader("Cache-Control", "no-store");
      res.sendFile(path.join(directory, "index.html"));
    });
  }
  app.get("/", (req, res) => {
    const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    res.redirect(302, `/larkin2-opportunities/${query}`);
  });
}
