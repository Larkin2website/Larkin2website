export type PortalRole = "super_admin" | "opportunity_manager" | "viewer";
export type Permission =
  | "opportunities:read" | "opportunities:write" | "opportunities:publish"
  | "opportunities:delete" | "opportunity-options:manage" | "opportunity-options:lifecycle" | "members:manage";

const rolePermissions: Record<PortalRole, Permission[]> = {
  super_admin: ["opportunities:read", "opportunities:write", "opportunities:publish", "opportunities:delete", "opportunity-options:manage", "opportunity-options:lifecycle", "members:manage"],
  opportunity_manager: ["opportunities:read", "opportunities:write", "opportunities:publish", "opportunity-options:manage"],
  viewer: ["opportunities:read"],
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