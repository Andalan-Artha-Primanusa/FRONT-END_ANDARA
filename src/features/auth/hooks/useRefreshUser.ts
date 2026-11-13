/**
 * 🔄 Hook untuk refresh user data dari server
 * Helps sync local user state dengan server (roles, permissions, profile updates)
 */
import { useAuthStore } from "@/app/store/auth.store";
import { api } from "@/shared/api/httpClient";
import type { AuthUser, Permission, Role } from "@/shared/types/rbac.types";

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

export const useRefreshUser = () => {
  const updateUser = useAuthStore((state) => state.updateUser);
  const user = useAuthStore((state) => state.user);

  const normalizeSingleRole = (role: unknown): Role | null => {
    const roleRecord = toRecord(role);

    if (typeof role === "string" && role.trim().length > 0) {
      return { id: 0, name: role.trim().toLowerCase(), display_name: role.trim() };
    }

    const roleName = roleRecord.name || roleRecord.slug || roleRecord.role_name;
    if (typeof roleName === "string" && roleName.trim().length > 0) {
      return {
        id: typeof roleRecord.id === "number" ? roleRecord.id : 0,
        name: roleName.trim().toLowerCase(),
        display_name: typeof roleRecord.display_name === "string" ? roleRecord.display_name : roleName,
        permissions: Array.isArray(roleRecord.permissions)
          ? normalizePermissions(roleRecord.permissions)
          : undefined,
      };
    }

    return null;
  };

  const normalizeRoles = (roles: unknown): Role[] =>
    Array.isArray(roles)
      ? roles.map(normalizeSingleRole).filter((role): role is Role => Boolean(role))
      : [];

  const normalizePermissions = (permissions: unknown): Permission[] =>
    Array.isArray(permissions)
      ? permissions
          .map((permission): Permission | null => {
            const perm = toRecord(permission);
            const name = typeof perm.name === "string" ? perm.name : "";
            if (!name) return null;
            return {
              id: typeof perm.id === "number" ? perm.id : 0,
              name,
              display_name: typeof perm.display_name === "string" ? perm.display_name : name,
              description: typeof perm.description === "string" ? perm.description : undefined,
            };
          })
          .filter((permission): permission is Permission => Boolean(permission))
      : [];

  const refreshUserData = async () => {
    try {
      // Try multiple endpoints for getting user data
      const endpoints = ["/me", "/user", "/auth/me", "/profile"];
      let response = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          response = await api.get(endpoint);
          if (response?.data) break;
        } catch (err) {
          lastError = err;
          continue;
        }
      }

      if (!response?.data) {
        throw lastError || new Error("No endpoint found");
      }

      const userData = response.data?.data ?? response.data;
      
      if (userData && typeof userData === "object") {
        const userRecord = toRecord(userData);
        const incomingRoles = normalizeRoles(userRecord.roles);
        const fallbackRole =
          normalizeSingleRole(userRecord.role) ||
          normalizeSingleRole(userRecord.role_name) ||
          normalizeSingleRole(userRecord.position);
        if (incomingRoles.length === 0 && fallbackRole) {
          incomingRoles.push(fallbackRole);
        }
        const incomingPermissions = normalizePermissions(userRecord.permissions);
        const fallbackRoles = Array.isArray(user?.roles) ? user.roles : [];
        const fallbackPermissions = Array.isArray(user?.permissions) ? user.permissions : [];

        // Sumber kebenaran permission = `effective_permissions` dari backend
        // (flat array nama permission hasil resolveEffectivePermissions).
        // Dipakai sebagai basis `user.permissions` agar RBACUtils.hasPermission
        // akurat segera setelah refresh (tanpa menunggu aggregate dari roles).
        const effectivePermissions: Permission[] = Array.isArray(userRecord.effective_permissions)
          ? (userRecord.effective_permissions as unknown[])
              .filter((p): p is string => typeof p === "string" && p.length > 0)
              .map((name) => ({ id: 0, name, display_name: name }))
          : [];

        const mergedPermissions = effectivePermissions.length > 0
          ? effectivePermissions
          : incomingPermissions.length > 0
            ? incomingPermissions
            : fallbackPermissions;

        const updatedUser: AuthUser = {
          ...(user || {}),
          ...(userRecord as Partial<AuthUser>),
          id: typeof userRecord.id === "number" ? userRecord.id : user?.id ?? 0,
          name: typeof userRecord.name === "string" ? userRecord.name : user?.name ?? "",
          email: typeof userRecord.email === "string" ? userRecord.email : user?.email ?? "",
          roles: incomingRoles.length > 0 ? incomingRoles : fallbackRoles,
          permissions: mergedPermissions,
        };
        
        // Update stored user dengan data terbaru
        updateUser(updatedUser);
        console.log("[RefreshUser] User data refreshed:", updatedUser);
        return updatedUser;
      }
    } catch (error) {
      console.warn("[RefreshUser] Failed to refresh user data:", error);
      // Fallback: try re-fetch auth info
      return null;
    }
  };

  return { refreshUserData, currentUser: user };
};
