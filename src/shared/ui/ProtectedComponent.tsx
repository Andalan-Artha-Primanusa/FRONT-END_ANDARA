/**
 * Protected Component Wrapper
 * Conditionally renders content based on user permissions and roles
 */

import React from 'react';
import type { AuthUser, PermissionType, RoleType } from '@/shared/types/rbac.types';
import { RBACUtils } from '@/shared/hooks/rbac';

interface ProtectedProps {
  children: React.ReactNode;
  user: AuthUser | null;
  permission?: PermissionType | PermissionType[];
  role?: RoleType | RoleType[];
  requireAll?: boolean; // For multiple permissions/roles: require ALL or ANY
  fallback?: React.ReactNode;
  allowSuperAdmin?: boolean; // Super Admin can always access (default: true)
}

/**
 * Render children only if user has required permission(s)
 */
export const CanAccess: React.FC<ProtectedProps> = ({
  children,
  user,
  permission,
  role,
  requireAll = false,
  fallback = null,
  allowSuperAdmin = true,
}) => {
  let hasAccess = false;

  // Check role-based access
  if (role) {
    hasAccess = RBACUtils.hasRole(user, role);
  }

  // Check permission-based access
  if (permission && !hasAccess) {
    hasAccess = RBACUtils.hasPermission(user, permission, requireAll);
  }

  // Super admin bypass
  if (allowSuperAdmin && RBACUtils.isSuperAdmin(user)) {
    hasAccess = true;
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

interface ProtectedElementProps {
  children: React.ReactNode;
  user: AuthUser | null;
  permission?: PermissionType | PermissionType[];
  role?: RoleType | RoleType[];
  className?: string;
  style?: React.CSSProperties;
  requireAll?: boolean;
  allowSuperAdmin?: boolean;
  disabled?: boolean;
}

/**
 * Render element but disable it if user doesn't have permission
 */
export const ProtectedElement: React.FC<ProtectedElementProps> = ({
  children,
  user,
  permission,
  role,
  className,
  style,
  requireAll = false,
  allowSuperAdmin = true,
  disabled = false,
}) => {
  let hasAccess = false;

  // Check role-based access
  if (role) {
    hasAccess = RBACUtils.hasRole(user, role);
  }

  // Check permission-based access
  if (permission && !hasAccess) {
    hasAccess = RBACUtils.hasPermission(user, permission, requireAll);
  }

  // Super admin bypass
  if (allowSuperAdmin && RBACUtils.isSuperAdmin(user)) {
    hasAccess = true;
  }

  return (
    <div
      className={className}
      style={{
        ...style,
        opacity: hasAccess && !disabled ? 1 : 0.6,
        pointerEvents: hasAccess && !disabled ? 'auto' : 'none',
      }}
      title={!hasAccess ? 'You do not have permission to access this' : undefined}
    >
      {children}
    </div>
  );
};

interface IfPermissionProps {
  children: React.ReactNode;
  user: AuthUser | null;
  permission: PermissionType | PermissionType[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  allowSuperAdmin?: boolean;
}

/**
 * Convenience component for checking permissions only
 */
export const IfPermission: React.FC<IfPermissionProps> = ({
  children,
  user,
  permission,
  requireAll = false,
  fallback = null,
  allowSuperAdmin = true,
}) => {
  return (
    <CanAccess
      user={user}
      permission={permission}
      requireAll={requireAll}
      fallback={fallback}
      allowSuperAdmin={allowSuperAdmin}
    >
      {children}
    </CanAccess>
  );
};

interface IfRoleProps {
  children: React.ReactNode;
  user: AuthUser | null;
  role: RoleType | RoleType[];
  fallback?: React.ReactNode;
  allowSuperAdmin?: boolean;
}

/**
 * Convenience component for checking roles only
 */
export const IfRole: React.FC<IfRoleProps> = ({
  children,
  user,
  role,
  fallback = null,
  allowSuperAdmin = true,
}) => {
  return (
    <CanAccess
      user={user}
      role={role}
      fallback={fallback}
      allowSuperAdmin={allowSuperAdmin}
    >
      {children}
    </CanAccess>
  );
};
