/**
 * Payroll Item - Core payroll record
 * Matches API: GET /api/payroll
 */
export interface PayrollItem {
  id: string | number;
  employee_id: string | number;
  period: string;
  basic_salary?: string | number;
  allowance?: number | string;
  bonus?: number | string;
  overtime_pay?: number | string;
  paid_leave_days?: number | string;
  paid_leave_amount?: number | string;
  late_days?: number;
  late_deduction?: number | string;
  reimbursement_amount?: number | string;
  deduction?: number | string;
  tax?: number | string;
  bpjs_kesehatan?: string | number;
  bpjs_ketenagakerjaan?: string | number;
  pph21?: string | number;
  total_deduction?: string | number;
  net_salary?: string | number;
  take_home_pay?: string | number;
  status: PayrollStatus;
  // Audit fields
  manager_approved_by?: number | null;
  manager_approved_at?: string | null;
  hr_approved_by?: number | null;
  hr_approved_at?: string | null;
  rejected_by?: number | null;
  rejected_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
  paid_at?: string;
  employee?: EmployeeItemExpanded;
  details?: PayrollDetail[];
  reimbursements?: ReimbursementItem[];
}

/**
 * Payroll Detail Item
 */
export interface PayrollDetail {
  id?: string | number;
  payroll_id?: string | number;
  name?: string;
  description?: string;
  amount?: string | number;
  type?: "deduction" | "allowance";
  created_at?: string;
  updated_at?: string;
}

/**
 * Payroll Slip (Slip Gaji) - GET /api/my/payroll/{id}/slip
 */
export interface PayrollSlip {
  id: string | number;
  period: string;
  status: string;
  employee: {
    id: number;
    employee_code: string;
    name: string;
    email: string;
    department: string;
    position: string;
  };
  summary: {
    basic_salary: number;
    allowance: number;
    bonus: number;
    overtime_pay: number;
    paid_leave_days: number;
    paid_leave_amount: number;
    reimbursement_amount: number;
    gross_pay: number;
    additional_allowances: number;
    late_days: number;
    late_deduction: number;
    bpjs_kesehatan: number;
    bpjs_ketenagakerjaan: number;
    pph21: number;
    additional_deductions: number;
    total_deduction: number;
    take_home_pay: number;
  };
  earnings: Array<{ id?: number; name: string; amount: number }>;
  deductions: Array<{ id?: number; name: string; amount: number }>;
  details: PayrollDetail[];
  reimbursements?: ReimbursementItem[];
  approval_trail?: {
    manager_approved_by?: number | null;
    manager_approved_at?: string | null;
    hr_approved_by?: number | null;
    hr_approved_at?: string | null;
    rejected_by?: number | null;
    rejected_reason?: string | null;
  };
}

/**
 * Employee Item (expanded with user data)
 */
export interface EmployeeItemExpanded {
  id: string | number;
  user_id?: string | number;
  employee_code?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  salary?: string | number;
  manager_id?: string | number | null;
  created_at?: string;
  updated_at?: string;
  user?: UserItem;
  manager?: EmployeeItemExpanded | null;
}

/**
 * User Item
 */
export interface UserItem {
  id: string | number;
  name?: string;
  email?: string;
  email_verified_at?: string | null;
  location_id?: string | number | null;
  created_at?: string;
  updated_at?: string;
  profile?: unknown;
}

export type PayrollStatus = "draft" | "pending_hr" | "approved" | "paid" | "rejected";

// Reimbursement linked to payroll
export interface ReimbursementItem {
  id: number;
  employee_id: number;
  payroll_id?: number | null;
  title: string;
  amount: string | number;
  category?: string;
  status: string;
  expense_date?: string;
}

/**
 * Payroll with enriched employee data
 */
export interface PayrollWithEmployee extends PayrollItem {
  employeeName: string;
  employee?: any; // Full employee object if needed
}

/**
 * Create Payroll Payload
 */
export interface PayrollCreatePayload {
  employee_id: number;
  period: string;
  allowance: number;
  bonus: number;
  deduction?: number;
  tax?: number;
  notes?: string;
}
/**
 * Update Payroll Payload
 */
export interface PayrollUpdatePayload {
  allowance?: number;
  bonus?: number;
  deduction?: number;
  tax?: number;
  notes?: string;
}

/**
 * Generate Monthly Payroll Payload - POST /api/payroll/generate/monthly
 */
export interface PayrollGeneratePayload {
  period: string;
  employee_ids?: number[];
}

/**
 * Approve Payroll Payload (matches API docs)
 */
export interface PayrollApprovePayload {
  payroll_ids: (string | number)[];
}

/**
 * Generate Monthly Payroll Payload (legacy support)
 */
export interface PayrollGenerateMonthlyPayload {
  period: string;
  employee_ids?: number[];
  force_regenerate?: boolean;
}

export interface PayrollDetailEntryPayload {
  type: string;
  name: string;
  amount: number;
}

export interface PayrollDetailsBulkCreatePayload {
  payroll_id: number;
  details: PayrollDetailEntryPayload[];
}

export interface PayrollDetailUpdatePayload {
  type: string;
  name: string;
  amount: number;
}

export interface PayrollDetailBulkUpdatePayload {
  details: Array<{
    id: number;
    amount: number;
  }>;
}
