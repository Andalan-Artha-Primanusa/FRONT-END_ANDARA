export interface ProfilePayload {
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  birth_date?: string;
  gender?: string;
  marital_status?: string;
  religion?: string;
  nationality?: string;
  id_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  current_address?: string;
  permanent_address?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  tax_number?: string;
  last_education?: string;
  institution_name?: string;
  graduation_year?: string;
  profile_photo_path?: string;
}

export interface Permission {
  id?: number;
  name?: string;
}

export interface Role {
  id?: number;
  name?: string;
  permissions?: Permission[];
}

export interface UserProfile {
  id?: number;
  location_id?: number | null;
  name?: string;
  email?: string;
  roles?: Role[];
}

export interface EmployeeProfile {
  id?: number;
  employee_code?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  salary?: string | number;
  manager?: {
    id?: number;
    name?: string;
  } | null;
}

export interface LeaveProfile {
  id?: number;
  status?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  total_days?: number;
}

export interface ReimbursementProfile {
  id?: number;
  title?: string;
  category?: string;
  status?: string;
  amount?: string | number;
  expense_date?: string;
}

export type Profile = {
  id: string | number;
} & Partial<ProfilePayload> &
  {
    user_id?: number;
    birth_date?: string;
    gender?: string;
    marital_status?: string;
    religion?: string;
    nationality?: string;
    id_number?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;
    current_address?: string;
    permanent_address?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    tax_number?: string;
    last_education?: string;
    institution_name?: string;
    graduation_year?: number;
    profile_photo_path?: string;
    created_at?: string;
    updated_at?: string;
    user?: UserProfile;
    employee?: EmployeeProfile | null;
    roles?: Role[];
    leaves?: LeaveProfile[];
    reimbursements?: ReimbursementProfile[];
    [key: string]: unknown;
  };
