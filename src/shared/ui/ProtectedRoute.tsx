/**
 * Protected Route Component
 * Wraps routes to enforce RBAC permissions
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import type { AuthUser, PermissionType, RoleType } from '@/shared/types/rbac.types';
import { RBACUtils } from '@/shared/hooks/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  user: AuthUser | null;
  permission?: PermissionType | PermissionType[];
  role?: RoleType | RoleType[];
  requireAll?: boolean;
  allowSuperAdmin?: boolean;
  fallbackPath?: string;
}

/**
 * Route wrapper that redirects to fallback if user lacks permissions
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  user,
  permission,
  role,
  requireAll = false,
  allowSuperAdmin = true,
  fallbackPath = '/dashboard',
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
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

interface AccessDeniedProps {
  requestedPage?: string;
  requiredPermission?: string;
  requiredRole?: string;
}

/**
 * Access Denied page
 */
export const AccessDenied: React.FC<AccessDeniedProps> = ({
  requestedPage = 'Halaman yang diminta',
  requiredPermission,
  requiredRole,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1 style={{ fontSize: '48px', margin: '0 0 20px 0', color: '#dc2626' }}>403</h1>
        <h2 style={{ margin: '0 0 20px 0' }}>Akses Ditolak</h2>
        <p style={{ margin: '0 0 20px 0', color: '#666' }}>
          Anda tidak memiliki izin untuk mengakses {requestedPage}.
        </p>
        {requiredPermission && (
          <p style={{ margin: '10px 0', color: '#666', fontSize: '14px' }}>
            <strong>Izin yang diperlukan:</strong> {requiredPermission}
          </p>
        )}
        {requiredRole && (
          <p style={{ margin: '10px 0', color: '#666', fontSize: '14px' }}>
            <strong>Role yang diperlukan:</strong> {requiredRole}
          </p>
        )}
        <a
          href="/dashboard"
          style={{
            display: 'inline-block',
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: 'var(--hero-bg-start)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          Kembali ke Dashboard
        </a>
      </div>
    </div>
  );
};
