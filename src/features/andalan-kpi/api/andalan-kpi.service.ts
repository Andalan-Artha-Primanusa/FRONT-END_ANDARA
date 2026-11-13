import { api } from "@/shared/api/httpClient";

export type AndalanKpiStatus =
  | "draft"
  | "supervisor_review"
  | "head_review"
  | "hr_review"
  | "director_review"
  | "finalized"
  | "rejected";

export type AndalanKpiItemPayload = {
  user_id?: string;
  salary_number?: string;
  employee_id?: string;
  employee_name: string;
  department?: string;
  position?: string;
  indicator: string;
  description?: string;
  category?: string;
  measurement_method?: string;
  unit?: string;
  target: number;
  achievement?: number;
  weight: number;
};

export type AndalanKpiCyclePayload = {
  name: string;
  period_type: "monthly" | "quarterly" | "semi_annual" | "annual";
  period_label: string;
  start_date: string;
  end_date: string;
  notes?: string;
  items: AndalanKpiItemPayload[];
};

export type AndalanKpiCycle = {
  id: string | number;
  name: string;
  period_type: string;
  period_label: string;
  start_date: string;
  end_date: string;
  status: AndalanKpiStatus | string;
  notes?: string | null;
  item_count?: number;
  employee_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type AndalanKpiItem = AndalanKpiItemPayload & {
  id: string | number;
  cycle_id: string | number;
  score?: number | string;
  status?: string;
};

export type AndalanKpiApproval = {
  id: string | number;
  cycle_id: string | number;
  approval_role: string;
  action: string;
  actor_user_id?: string | null;
  actor_name?: string | null;
  note?: string | null;
  acted_at?: string;
};

export type AndalanKpiDetail = {
  cycle: AndalanKpiCycle;
  items: AndalanKpiItem[];
  approvals: AndalanKpiApproval[];
};

const unwrap = <T>(response: { data?: unknown }): T => {
  const root = response.data && typeof response.data === "object"
    ? response.data as Record<string, unknown>
    : {};
  return root.data as T;
};

export const getAndalanKpiCycles = async () =>
  unwrap<AndalanKpiCycle[]>(await api.get("/presentation/andalan/kpi/cycles?limit=100"));

export const getAndalanKpiDetail = async (id: string | number) =>
  unwrap<AndalanKpiDetail>(await api.get(`/presentation/andalan/kpi/cycles/${id}`));

export const createAndalanKpiCycle = async (data: AndalanKpiCyclePayload) =>
  unwrap<AndalanKpiDetail>(await api.post("/presentation/andalan/kpi/cycles", data));

export const updateAndalanKpiCycle = async (id: string | number, data: AndalanKpiCyclePayload & { actor_user_id?: string | null }) =>
  unwrap<AndalanKpiDetail>(await api.put(`/presentation/andalan/kpi/cycles/${id}`, data));

export const submitAndalanKpi = async (id: string | number) =>
  unwrap<AndalanKpiDetail>(await api.post("/presentation/andalan/kpi/cycles/" + id + "/submit"));

export const approveAndalanKpi = async (
  id: string | number,
  data: { action?: "approved" | "returned" | "rejected"; note?: string; actor_user_id?: string | null } = {},
) => unwrap<AndalanKpiDetail>(await api.post("/presentation/andalan/kpi/cycles/" + id + "/approve", data));

export const deleteAndalanKpi = async (id: string | number) =>
  api.delete("/presentation/andalan/kpi/cycles/" + id);
