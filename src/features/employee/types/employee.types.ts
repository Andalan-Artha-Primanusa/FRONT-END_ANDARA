/**
 * Employee core data structure
 */
export interface EmployeeItem {
  id: string | number;
  user_id: string | number;
  user?: {
    id: string | number;
    name: string;
    email: string;
  };
  employee_code: string;
  company_id?: number | null;
  position: string;
  department: string;
  hire_date: string;
  salary: number;
  location_id?: number | null;
  manager_id?: number | null;
  work_schedule_id?: number | null;
  status?: "active" | "inactive" | "pending";
  probation_end_date?: string | null;
  termination_date?: string | null;
  created_at?: string;
  updated_at?: string;
  CompleteName?: string | null;
  EmailAddress?: string | null;
  CellPhoneNumber?: string | null;
  InputLocation?: string | null;
  ProjectID?: string | null;
  ServerID?: string | null;
  PlaceOfApp?: string | null;
  PlaceOfBirth?: string | null;
  DateOfBirth?: string | null;
  Sex?: string | null;
  BloodGroup?: string | null;
  detail?: {
    kode_pos?: string | null;
    grade?: string | null;
    tanggal_grade?: string | null;
    tanggal_masuk_group?: string | null;
    kelompok_karyawan?: string | null;
    cost_center?: string | null;
    cost_center_text?: string | null;
    atasan_langsung?: string | null;
  } | null;
}

/**
 * Employee for payroll enrichment (with computed employee name)
 */
export interface EmployeeWithName extends EmployeeItem {
  employeeName: string;
}

/**
 * Payload for creating new employee
 */
export interface EmployeeCreatePayload {
  user_id: string | number | null;
  employee_code: string;
  company_id?: string | number | null;
  position: string;
  department: string;
  hire_date: string;
  salary: string | number | null;
  location_id?: string | number | null;
  manager_id?: string | number | null;
  work_schedule_id?: string | number | null;
  status: string;
  probation_end_date?: string | null;
}

/**
 * Payload for updating employee
 */
export interface EmployeeUpdatePayload {
  name?: string;
  user_id?: string | number | null;
  employee_code?: string;
  company_id?: string | number | null;
  hire_date?: string;
  position?: string;
  department?: string;
  salary?: string | number | null;
  location_id?: string | number | null;
  manager_id?: string | number | null;
  work_schedule_id?: string | number | null;
  status?: string;
  probation_end_date?: string | null;
}


/**
 * Payload for start onboarding
 */
export interface EmployeeOnboardingPayload {
  probation_end_date: string;
}

/**
 * Payload for start offboarding
 */
export interface EmployeeOffboardingPayload {
  termination_date: string;
  termination_reason: string;
}

/**
 * API response types
 */
export interface EmployeeListResponse {
  success: boolean;
  data: EmployeeItem[];
  total?: number;
  message?: string;
}

export interface EmployeeDetailResponse {
  success: boolean;
  data: EmployeeItem;
  message?: string;
}
