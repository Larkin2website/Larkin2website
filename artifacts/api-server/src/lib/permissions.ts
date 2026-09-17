export type PortalRole = "super_admin" | "opportunity_manager" | "viewer";
export type Permission =
  | "opportunities:read" | "opportunities:write" | "opportunities:publish"
  | "opportunities:delete" | "opportunity-options:manage" | "opportunity-options:lifecycle" | "members:manage"
  | "programmes:read" | "programmes:write" | "programmes:publish" | "programmes:delete";
  // Programme permissions intentionally mirror role permissions without granting member access.

const rolePermissions: Record<PortalRole, Permission[]> = {
  super_admin: ["opportunities:read", "opportunities:write", "opportunities:publish", "opportunities:delete", "opportunity-options:manage", "opportunity-options:lifecycle", "members:manage", "programmes:read", "programmes:write", "programmes:publish", "programmes:delete"],
  opportunity_manager: ["opportunities:read", "opportunities:write", "opportunities:publish", "opportunity-options:manage", "programmes:read", "programmes:write", "programmes:publish"],
  viewer: ["opportunities:read", "programmes:read"],
};

export function permissionsForRole(role: PortalRole): Permission[] {
  return rolePermissions[role];
}
export function can(role: PortalRole, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
export function canTransition(role: PortalRole, status: string): boolean {
  return can(role, status === "published" || status === "closed" || status === "filled" || status === "archived"
    ? "opportunities:publish" : "opportunities:write");
}
export function canTransitionProgramme(role: PortalRole, status: string): boolean {
  const required: Permission = status === "published" || status === "closed" || status === "archived"
    ? "programmes:publish" : "programmes:write";
  return can(role, required);
}