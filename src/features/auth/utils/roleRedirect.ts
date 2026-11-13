import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS, type AuthUser } from "@/shared/types/rbac.types";

const getAuthUser = (user: unknown): AuthUser | null => {
  if (!user || typeof user !== "object") return null;
  const u = user as Record<string, unknown>;
  if (!Array.isArray(u.roles) || !Array.isArray(u.permissions)) return null;
  return u as AuthUser;
};

export const getRoleBasedDashboardPath = (user: unknown): string => {
  const authUser = getAuthUser(user);
  if (!authUser) return "/dashboard";

  if (RBACUtils.isSuperAdmin(authUser)) return "/dashboard";

  // Legacy SQL Server login currently supplies no application RBAC roles.
  // Send that read-only presentation session directly to employees.
  if (authUser.roles.length === 0 && authUser.permissions.length === 0) {
    return "/employees";
  }

  if (
    RBACUtils.canManageUsers(authUser) ||
    RBACUtils.canViewRoles(authUser) ||
    RBACUtils.hasPermission(authUser, PERMISSIONS.ADMIN_AUDIT_VIEW)
  ) {
    return "/dashboard";
  }

  if (RBACUtils.hasPermission(authUser, PERMISSIONS.PAYROLL_VIEW)) return "/payroll";

  if (RBACUtils.hasPermission(authUser, PERMISSIONS.EMPLOYEE_CREATE)) {
    return "/employees";
  }

  return "/employee-dashboard";
};

export const getRoleBasedDashboardPathFromStorage = (): string => {
  const rawUser = sessionStorage.getItem("user");
  if (!rawUser) return "/dashboard";
  try {
    return getRoleBasedDashboardPath(JSON.parse(rawUser));
  } catch {
    return "/dashboard";
  }
};
