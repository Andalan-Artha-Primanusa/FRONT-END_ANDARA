/**
 * Employee Module - Main Export Index
 * Centralized exports for all employee-related types and services
 */

// Types
export type {
  EmployeeItem,
  EmployeeWithName,
  EmployeeCreatePayload,
  EmployeeUpdatePayload,
  EmployeeListResponse,
  EmployeeDetailResponse,
} from "./types/employee.types";

// Services
export {
  getAllEmployees,
  getEmployeesPage,
  getEmployeeDetail,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "./api/employee.service";
