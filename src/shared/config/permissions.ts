/**
 * Menu Permissions Configuration
 * Maps menu items and routes to required permissions
 */

import type { PermissionType } from '@/shared/types/rbac.types';
import { PERMISSIONS } from '@/shared/types/rbac.types';

export interface MenuPermissionConfig {
  path: string;
  requiredPermission?: PermissionType | PermissionType[];
  requireAll?: boolean;
  visibleToPermissions?: PermissionType[];
}

/**
 * Permission mapping for protected routes
 * If a route is not in this map, it's accessible to authenticated users
 */
export const routePermissions: Record<string, MenuPermissionConfig> = {
  // Admin routes
  '/admin/users': {
    path: '/admin/users',
    requiredPermission: PERMISSIONS.USER_VIEW,
  },
  '/admin/roles': {
    path: '/admin/roles',
    requiredPermission: PERMISSIONS.ROLE_VIEW,
  },
  '/admin/permissions': {
    path: '/admin/permissions',
    requiredPermission: PERMISSIONS.PERMISSION_VIEW,
  },
  
  // Admin management routes
  '/settings/user-role': {
    path: '/settings/user-role',
    requiredPermission: [PERMISSIONS.USER_ASSIGN_ROLE, PERMISSIONS.ROLE_ASSIGN_PERMISSION],
  },
  '/settings/permissions': {
    path: '/settings/permissions',
    requiredPermission: PERMISSIONS.PERMISSION_VIEW,
  },
};

/**
 * Check if a user can access a route based on permissions
 */
export const canAccessRoute = (
  userPermissions: PermissionType[] | undefined,
  config: MenuPermissionConfig
): boolean => {
  const permissions = userPermissions ?? [];

  if (config.requiredPermission) {
    const requiredPerms = Array.isArray(config.requiredPermission)
      ? config.requiredPermission
      : [config.requiredPermission];

    const hasPermission = config.requireAll
      ? requiredPerms.every((p) => permissions.includes(p))
      : requiredPerms.some((p) => permissions.includes(p));

    if (!hasPermission) {
      return false;
    }
  }

  return true;
};

/**
 * Get visible menu items from backend-granted menu keys.
 */
export const getVisibleMenuItems = (allowedMenuKeys: string[] | undefined) => allowedMenuKeys ?? [];
