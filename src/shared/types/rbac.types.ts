/**
 * RBAC Types Definition
 * Defines all types for Role-Based Access Control dynamic architecture
 */

export type RoleType = string;
export type PermissionType = string;

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
} as const;

export const PERMISSIONS = {
  EMPLOYEE_VIEW: 'employee.view',
  EMPLOYEE_CREATE: 'employee.create',
  EMPLOYEE_UPDATE: 'employee.update',
  EMPLOYEE_DELETE: 'employee.delete',
  LEAVE_VIEW: 'leave.view',
  LEAVE_CREATE: 'leave.create',
  LEAVE_APPROVE: 'leave.approve',
  ATTENDANCE_VIEW_ALL: 'attendance.view_all',
  ATTENDANCE_DELETE: 'attendance.delete',
  ATTENDANCE_CHECK_IN: 'attendance.check_in',
  ATTENDANCE_CHECK_OUT: 'attendance.check_out',
  ATTENDANCE_VIEW_OWN: 'attendance.view_own',
  ATTENDANCE_QR_GENERATE: 'attendance.qr.generate',
  ATTENDANCE_QR_SCAN: 'attendance.qr.scan',
  ATTENDANCE_MANUAL_ADJUST: 'attendance.manual_adjust',
  PATROL_SCAN: 'patrol.scan',
  PATROL_VIEW: 'patrol.view',
  PATROL_MANAGE: 'patrol.manage',
  PATROL_REPORT: 'patrol.report',
  DASHBOARD_CUSTOMIZE_SELF: 'dashboard.customize_self',
  DASHBOARD_MANAGE_DEFAULT: 'dashboard.manage_default',
  DASHBOARD_VIEW_ALL_COMPANY: 'dashboard.view_all_company',
  COMPANY_VIEW: 'company.view',
  COMPANY_CREATE: 'company.create',
  COMPANY_UPDATE: 'company.update',
  COMPANY_DEACTIVATE: 'company.deactivate',
  COMPANY_VIEW_ALL: 'company.view_all',
  COMPANY_ASSIGN_USER: 'company.assign_user',
  LOCATION_VIEW: 'location.view',
  LOCATION_CREATE: 'location.create',
  LOCATION_UPDATE: 'location.update',
  LOCATION_DELETE: 'location.delete',
  PROFILE_VIEW_ALL: 'profile.view_all',
  PROFILE_UPDATE: 'profile.update',
  PROFILE_DELETE: 'profile.delete',
  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_CREATE: 'payroll.create',
  PAYROLL_UPDATE: 'payroll.update',
  PAYROLL_DELETE: 'payroll.delete',
  PAYROLL_GENERATE: 'payroll.generate',
  PAYROLL_APPROVE: 'payroll.approve',
  PAYROLL_PAY: 'payroll.pay',
  PAYROLL_EXPORT: 'payroll.export',
  REIMBURSEMENT_VIEW: 'reimbursement.view',
  REIMBURSEMENT_APPROVE: 'reimbursement.approve',
  REIMBURSEMENT_PAY: 'reimbursement.pay',
  ASSET_VIEW: 'asset.view',
  ASSET_CREATE: 'asset.create',
  ASSET_UPDATE: 'asset.update',
  ASSET_DELETE: 'asset.delete',
  ASSET_ASSIGN: 'asset.assign',
  TRAINING_VIEW: 'training.view',
  TRAINING_CREATE: 'training.create',
  TRAINING_UPDATE: 'training.update',
  TRAINING_DELETE: 'training.delete',
  TRAINING_ENROLL: 'training.enroll',
  KPI_VIEW: 'kpi.view',
  KPI_CREATE: 'kpi.create',
  KPI_UPDATE: 'kpi.update',
  KPI_DELETE: 'kpi.delete',
  KPI_APPROVE: 'kpi.approve',
  REPORTING_DASHBOARD: 'reporting.dashboard',
  REPORTING_ATTENDANCE: 'reporting.attendance',
  REPORTING_PAYROLL: 'reporting.payroll',
  COMPLIANCE_VIEW: 'compliance.view',
  TEAM_VIEW: 'team.view',
  ADMIN_ACCESS: 'admin.access',
  ADMIN_COMPANY_VIEW: 'admin.company.view',
  ADMIN_COMPANY_UPDATE: 'admin.company.update',
  ADMIN_AUDIT_VIEW: 'admin.audit.view',
  AUDIT_LOGS_VIEW: 'audit.logs.view',
  ADMIN_EMAIL_MANAGE: 'admin.email.manage',
  OVERTIME_VIEW: 'overtime.view',
  OVERTIME_APPROVE: 'overtime.approve',
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ASSIGN_ROLE: 'user.assign_role',
  ROLE_VIEW: 'role.view',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_ASSIGN_PERMISSION: 'role.assign_permission',
  PERMISSION_VIEW: 'permission.view',
} as const;

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  permissions_count?: number;
  permissions?: Permission[];
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  guard_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  must_change_password?: boolean;
  password_changed_at?: string | null;
  employee?: unknown;
  roles?: Role[];
  permissions?: Permission[];
  role_ids?: number[];
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type CompanyRef = {
  id: number;
  code?: string | null;
  name: string;
  status?: string | null;
};

export type UserCompanyAccess = {
  id?: number;
  user_id?: number;
  company_id: number;
  is_default?: boolean;
  company?: CompanyRef | null;
};

export type CompanyContext = {
  mode: "all" | "company";
  can_view_all: boolean;
  selected_company_id: number | null;
  default_company_id: number | null;
  companies: CompanyRef[];
};

export interface AuthUser extends User {
  roles: Role[];
  permissions: Permission[];
  companies?: CompanyRef[];
  company_accesses?: UserCompanyAccess[];
}

export interface RBACContext {
  user: AuthUser | null;
  roles: Role[];
  permissions: Permission[];
  hasPermission: (permission: string | string[]) => boolean;
  hasRole: (role: string | string[]) => boolean;
  isSuperAdmin: () => boolean;
  canManageUsers: () => boolean;
  canManageRoles: () => boolean;
  canManagePermissions: () => boolean;
}

export interface PermissionCheckOptions {
  requireAll?: boolean;
  allowSuperAdmin?: boolean;
}
