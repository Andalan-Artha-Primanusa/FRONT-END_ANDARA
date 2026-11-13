import { api } from "@/shared/api/httpClient";

export type AndalanPayrollRecord = { id: string | number; period_code?: string; period_start?: string; period_end?: string; gross_amount?: number | string; deduction_amount?: number | string; net_amount?: number | string; status?: string };
export type AndalanPayrollPeriod = { id: string | number; period_code: string; period_start: string; period_end: string; status: string; record_count?: number | string };
export type AndalanTrainingProgram = { id: string | number; name: string; description?: string | null; provider?: string | null; start_date?: string | null; end_date?: string | null; status?: string };
export type AndalanTrainingEnrollment = { id: string | number; program_id: string | number; program_name?: string; employee_name?: string; salary_number?: string; status?: string };
export type AndalanAssetAssignment = { id: string | number; asset_code?: string; name?: string; category?: string; serial_number?: string; status?: string; asset_status?: string };
export type AndalanManagedAsset = AndalanAssetAssignment & { notes?: string | null; assigned_employee_name?: string | null; barcode_value?: string };
export type AndalanOvertimeRequest = { id: string | number; work_date: string; start_time: string; end_time: string; total_hours: number | string; reason: string; status?: string };
export type AndalanDocument = { id: string | number; document_type: string; title: string; file_url?: string | null; issued_at?: string | null; expires_at?: string | null; status?: string };

const dataOf = <T>(response: { data?: unknown }) => {
  const root = response.data && typeof response.data === "object" ? response.data as Record<string, unknown> : {};
  return (root.data ?? response.data) as T;
};
const listOf = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

export const getAndalanPayroll = async (user: string) => listOf<AndalanPayrollRecord>(dataOf(await api.get(`/presentation/andalan/workforce/payroll/${encodeURIComponent(user)}`)));
export const getAndalanTrainingPrograms = async () => listOf<AndalanTrainingProgram>(dataOf(await api.get("/presentation/andalan/workforce/training/programs")));
export const createAndalanTrainingProgram = async (data: Record<string, unknown>) => dataOf<AndalanTrainingProgram>(await api.post("/presentation/andalan/workforce/training/programs", data));
export const updateAndalanTrainingProgram = async (id: string | number, data: Record<string, unknown>) => dataOf<AndalanTrainingProgram>(await api.put(`/presentation/andalan/workforce/training/programs/${id}`, data));
export const getAndalanAssets = async (user: string) => listOf<AndalanAssetAssignment>(dataOf(await api.get(`/presentation/andalan/workforce/assets/${encodeURIComponent(user)}`)));
export const getAndalanOvertime = async (user: string) => listOf<AndalanOvertimeRequest>(dataOf(await api.get(`/presentation/andalan/workforce/overtime/${encodeURIComponent(user)}`)));
export const getAndalanDocuments = async (user: string) => listOf<AndalanDocument>(dataOf(await api.get(`/presentation/andalan/workforce/documents/${encodeURIComponent(user)}`)));

export const getAndalanAdminPayroll = async (user: string) => dataOf<{ periods: AndalanPayrollPeriod[]; records: AndalanPayrollRecord[] }>(await api.get(`/presentation/andalan/workforce/admin/${encodeURIComponent(user)}/payroll`));
export const getAndalanAdminTraining = async (user: string) => dataOf<{ programs: AndalanTrainingProgram[]; enrollments: AndalanTrainingEnrollment[] }>(await api.get(`/presentation/andalan/workforce/admin/${encodeURIComponent(user)}/training`));
export const getAndalanAdminAssets = async (user: string) => dataOf<{ assets: AndalanManagedAsset[]; assignments: AndalanAssetAssignment[] }>(await api.get(`/presentation/andalan/workforce/admin/${encodeURIComponent(user)}/assets`));
export const getAndalanAdminOvertime = async (user: string) => listOf<AndalanOvertimeRequest>(dataOf(await api.get(`/presentation/andalan/workforce/admin/${encodeURIComponent(user)}/overtime`)));
export const getAndalanAdminDocuments = async (user: string) => listOf<AndalanDocument>(dataOf(await api.get(`/presentation/andalan/workforce/admin/${encodeURIComponent(user)}/documents`)));

export const createAndalanPayrollPeriod = async (data: Record<string, unknown>) => dataOf<AndalanPayrollPeriod>(await api.post('/presentation/andalan/workforce/payroll/periods', data));
export const updateAndalanPayrollPeriod = async (id: string | number, data: Record<string, unknown>) => dataOf<AndalanPayrollPeriod>(await api.put(`/presentation/andalan/workforce/payroll/periods/${id}`, data));
export const createAndalanPayrollRecord = async (data: Record<string, unknown>) => dataOf<AndalanPayrollRecord>(await api.post('/presentation/andalan/workforce/payroll/records', data));
export const approveAndalanPayrollPeriod = async (id: string | number, data: Record<string, unknown>) => dataOf<AndalanPayrollPeriod>(await api.post(`/presentation/andalan/workforce/payroll/periods/${id}/approve`, data));
export const approveAndalanTraining = async (id: string | number, data: Record<string, unknown>) => dataOf<AndalanTrainingEnrollment>(await api.post(`/presentation/andalan/workforce/training/enrollments/${id}/approve`, data));
export const approveAndalanAsset = async (id: string | number, data: Record<string, unknown>) => dataOf<AndalanAssetAssignment>(await api.post(`/presentation/andalan/workforce/assets/assignments/${id}/approve`, data));
export const approveAndalanOvertime = async (id: string | number, data: Record<string, unknown>) => dataOf<AndalanOvertimeRequest>(await api.post(`/presentation/andalan/workforce/overtime/${id}/approve`, data));
export const approveAndalanDocument = async (id: string | number, data: Record<string, unknown>) => dataOf<AndalanDocument>(await api.post(`/presentation/andalan/workforce/documents/${id}/review`, data));
export const createAndalanDocument = async (data: Record<string, unknown>) => dataOf<AndalanDocument>(await api.post('/presentation/andalan/workforce/documents', data));
export const updateAndalanDocument = async (id: string | number, data: Record<string, unknown>) => dataOf<AndalanDocument>(await api.put(`/presentation/andalan/workforce/documents/${id}`, data));
export const createAndalanAsset = async (data: Record<string, unknown>) => dataOf<{ asset: AndalanManagedAsset; barcode_value: string }>(await api.post('/presentation/andalan/workforce/super-admin/assets', data));
export const updateAndalanAsset = async (id: string | number, data: Record<string, unknown>) => dataOf<AndalanManagedAsset>(await api.put(`/presentation/andalan/workforce/assets/${id}`, data));
export const createAndalanOvertime = async (data: Record<string, unknown>) => dataOf<AndalanOvertimeRequest>(await api.post('/presentation/andalan/workforce/overtime', data));
export const updateAndalanOvertime = async (id: string | number, data: Record<string, unknown>) => dataOf<AndalanOvertimeRequest>(await api.put(`/presentation/andalan/workforce/overtime/${id}`, data));
