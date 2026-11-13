import type { Role, Permission, User } from '@/shared/types/rbac.types';

export type AdminEntityItem = Record<string, unknown>;

export interface AssignRolesPayload {
  role_ids: number[];
}

export interface AssignPermissionsPayload {
  permission_ids: number[];
}

export interface AdminUser extends User {
  role_names?: string[];
  permission_count?: number;
}

export interface AdminRole extends Role {
  user_count?: number;
  is_super_admin?: boolean;
  can_modify?: boolean;
}

export interface AdminPermission extends Permission {
  role_count?: number;
}

export interface AdminResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  total?: number;
  page?: number;
  per_page?: number;
}

export interface AdminListResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  per_page?: number;
}

export interface AuditLogItem extends Record<string, unknown> {
  id?: number | string;
  action?: string;
  event?: string;
  description?: string;
  user_name?: string;
  causer_name?: string;
  module?: string;
  ip_address?: string;
  created_at?: string;
}

export interface BiometricDeviceItem extends Record<string, unknown> {
  id?: number | string;
  name?: string;
  ip_address?: string;
  location?: string;
  port?: number;
  is_online?: boolean | number | string;
  status?: string;
}
