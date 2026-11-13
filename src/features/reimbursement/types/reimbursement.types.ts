// ─── Reimbursement Item (dari backend response) ─────────────────────────────
export interface ReimbursementItem {
  id: string | number;
  employee_id: string | number;
  title: string;
  description?: string;
  amount: number;
  category: string;
  expense_date: string;
  status: string;
  receipt_path?: string;
  note?: string;
  approval_note?: string;
  submitted_at?: string;
  approved_at?: string;
  paid_at?: string;
  approved_by?: string | number | null;
  approval_flow_id?: string | number | null;
  current_step?: number | null;
  created_at?: string;
  updated_at?: string;
  employee?: {
    id: string | number;
    name?: string;
    user?: {
      name: string;
    };
    department?: { id?: string | number; name?: string } | string | null;
    position?: { id?: string | number; name?: string } | string | null;
    departmentRel?: { id?: string | number; name?: string } | null;
    positionRel?: { id?: string | number; name?: string } | null;
  };
  approver?: {
    id?: string | number;
    name?: string;
    email?: string;
  };
  approval_flow?: {
    id?: string | number;
    name?: string;
    module?: string;
    steps?: Array<{
      id?: string | number;
      step_order?: number;
      role_id?: number;
      user_id?: number | null;
      role?: { id?: string | number; name?: string; display_name?: string };
      user?: { id?: string | number; name?: string; email?: string };
    }>;
  };
  approvalFlow?: ReimbursementItem["approval_flow"];
  user?: {
    name: string;
  };
  employee_name?: string;
  can_act?: boolean;
}

// ─── Filters untuk GET /reimbursements ──────────────────────────────────────
export interface ReimbursementFilters {
  status?: string;
  category?: string;
  employee_id?: number;
  page?: number;
  per_page?: number;
}

// ─── Payload CREATE (admin: POST /reimbursements) ───────────────────────────
// Backend: StoreReimbursementRequest → employee_id required untuk admin
export interface ReimbursementCreatePayload {
  employee_id: number;
  title: string;
  description?: string;
  amount: number;
  category: string;
  expense_date: string;
  receipt_path?: string;
}

// ─── Payload UPDATE (PUT /reimbursements/{id}) ───────────────────────────────
// Backend: hanya bisa update jika masih draft
export interface ReimbursementUpdatePayload {
  title?: string;
  description?: string;
  amount?: number;
  category?: string;
  expense_date?: string;
  receipt_path?: string;
}

// ─── Payload APPROVE / REJECT ────────────────────────────────────────────────
export interface ReimbursementDecisionPayload {
  note?: string; 
}

// ─── Payload REJECT (note wajib) ─────────────────────────────────────────────
export interface ReimbursementRejectPayload {
  note: string;
}
