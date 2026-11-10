import type { Request, RequestHandler } from "express";
import { can, type Permission, type PortalRole } from "./permissions";

export type PortalActor = {
  userId: string; displayName: string; email: string; role: PortalRole;
  permissions: Permission[];
};
declare global {
  namespace Express { interface Request { portalActor?: PortalActor } }
}
// The only live identity source is the server-side credential/session join.
// A factory permits isolated tests without providing any HTTP/runtime bypass.
export function createRequirePortal(dependencies: { actorForRequest?: (req: Request) => PortalActor | undefined } = {}) {
  return (permission?: Permission): RequestHandler => (req, res, next) => {
    const actor = dependencies.actorForRequest ? dependencies.actorForRequest(req) : req.staffActor;
    if (!actor) { res.status(401).json({ error: "Authentication required" }); return; }
    if (permission && !can(actor.role, permission)) { res.status(403).json({ error: "Insufficient permission" }); return; }
    req.portalActor = actor;
    next();
  };
}
export const requirePortal = createRequirePortal();
export const requireCrmAccess: RequestHandler = (req, res, next) => {
  const actor = req.staffActor;
  if (!actor) { res.status(401).json({ error: "Authentication required" }); return; }
  if (actor.role !== "super_admin") { res.status(403).json({ error: "CRM access requires an active super admin" }); return; }
  req.portalActor = actor;
  next();
};
