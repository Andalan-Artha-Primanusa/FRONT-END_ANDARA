export interface LeaveCreatePayload {
  leave_type_id?: number;
  type?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
}

export interface LeaveUpdatePayload {
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
}

export interface LeaveDecisionPayload {
  note: string;
}

export interface LeavePolicy {
  id: number;
  name: string | null;
  policy_code: string | null;
  entitlement_type: string;
  entitlement_value: number | null;
  max_carryover_days: number | null;
  is_paid: boolean;
  year: number;
  annual_allowance: number;
  carry_over_allowance: number;
  carry_over_enabled: number;
  encashment_enabled: number;
  blackout_ranges: string | null;
  holiday_calendar_id: number | null;
  max_pending_days: number;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  allocated_days: number;
  carry_over_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
}

export interface LeaveBalanceResponse {
  policy: LeavePolicy;
  balance: LeaveBalance;
}

export type LeaveItem = Record<string, unknown>;
