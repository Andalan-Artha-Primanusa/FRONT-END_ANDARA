/**
 * Payroll Module - Main Export Index
 * Centralized exports for all payroll-related types, services, and components
 */

// Types
export type {
  PayrollItem,
  PayrollCreatePayload,
  PayrollUpdatePayload,
  PayrollGenerateMonthlyPayload,
  PayrollWithEmployee,
  PayrollDetail,
  PayrollDetailUpdatePayload,
  PayrollDetailsBulkCreatePayload,
  PayrollDetailBulkUpdatePayload,
} from "./types/payroll.types";

export type { FilterState } from "./components/PayrollFilters";

// Services
export {
  payrollService,
  toSafeArray,
  getAllPayroll,
  getPayrollDetail,
  createPayroll,
  updatePayroll,
  deletePayroll,
  approvePayroll,
  markPayrollAsPaid,
  generateMonthlyPayroll,
  getPayrollDetails,
  addPayrollDetailsBulk,
  updatePayrollDetails,
} from "./api/payroll.service";

// Components
export { PayrollTable } from "./components/PayrollTable";
export type { PayrollTableProps } from "./components/PayrollTable";

export { PayrollFilters } from "./components/PayrollFilters";
export { default as PayrollStatusBadge } from "@/shared/ui/PayrollStatusBadge";

// Hooks
export { useDataState, useAsync } from "./hooks/usePayrollState";
export type { DataState, StateConfig } from "./hooks/usePayrollState";
