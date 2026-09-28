import type { RequestHandler } from "express";

const CUSTOM_DOMAIN_DESTINATIONS: Readonly<Record<string, string>> = {
  "larkin2opportunities.gentraxtech.com": "/larkin2-opportunities/",
  "larkin2portal.gentraxtech.com": "/larkin2-opportunities-portal/",
  "hetvcrm.gentraxtech.com": "/hetv-audience-crm/",
};

export function getCustomDomainDestination(
  hostname: string,
  pathname: string,
): string | undefined {
  if (pathname !== "/") {
    return undefined;
  }

  const normalizedHostname = hostname.toLowerCase().replace(/:\d+$/, "");
  return CUSTOM_DOMAIN_DESTINATIONS[normalizedHostname];
}

export const customDomainRedirect: RequestHandler = (req, res, next) => {
  const forwardedHostname = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const destination = getCustomDomainDestination(
    forwardedHostname ?? req.hostname,
    req.path,
  );

  if (!destination) {
    next();
    return;
  }

  const queryIndex = req.originalUrl.indexOf("?");
  const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
  res.redirect(302, `${destination}${query}`);
};