import { api } from "@/shared/api/httpClient";

export type PatrolCheckpoint = {
  id: number;
  company_id?: number | null;
  name: string;
  area?: string | null;
  floor?: string | null;
  room?: string | null;
  qr_code: string;
  starts_at: string;
  ends_at: string;
  tolerance_minutes: number;
  status: "active" | "inactive" | string;
  company?: { id: number; name: string; code?: string | null } | null;
};

export type PatrolScan = {
  id: number;
  checkpoint_id: number;
  user_id: number;
  employee_id?: number | null;
  company_id?: number | null;
  scanned_at: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status: "on_time" | "outside_window" | string;
  notes?: string | null;
  checkpoint?: PatrolCheckpoint;
  user?: { id: number; name: string; email?: string };
  employee?: { id: number; employee_code?: string };
};

type Paginated<T> = {
  data?: T[];
  current_page?: number;
  total?: number;
};

const unwrap = <T>(response: { data: { data?: T } | T }) => {
  const payload = response.data as { data?: T };
  return payload.data ?? (response.data as T);
};

const listFrom = <T>(payload: Paginated<T> | T[]) => (Array.isArray(payload) ? payload : payload.data ?? []);

export const patrolService = {
  async checkpoints(params: Record<string, unknown> = {}) {
    const response = await api.get("/patrol/checkpoints", { params });
    return listFrom(unwrap<Paginated<PatrolCheckpoint> | PatrolCheckpoint[]>(response));
  },

  async createCheckpoint(data: Partial<PatrolCheckpoint>) {
    const response = await api.post("/patrol/checkpoints", data);
    return unwrap<{ checkpoint: PatrolCheckpoint; qr_payload: Record<string, unknown> }>(response);
  },

  async updateCheckpoint(id: number, data: Partial<PatrolCheckpoint>) {
    const response = await api.put(`/patrol/checkpoints/${id}`, data);
    return unwrap<{ checkpoint: PatrolCheckpoint; qr_payload: Record<string, unknown> }>(response);
  },

  async deleteCheckpoint(id: number) {
    const response = await api.delete(`/patrol/checkpoints/${id}`);
    return response.data;
  },

  async regenerateQr(id: number) {
    const response = await api.post(`/patrol/checkpoints/${id}/regenerate-qr`);
    return unwrap<{ checkpoint: PatrolCheckpoint; qr_payload: Record<string, unknown> }>(response);
  },

  async scan(data: { qr_code: string; latitude?: number; longitude?: number; notes?: string }) {
    const response = await api.post("/patrol/scan", data);
    return unwrap<PatrolScan>(response);
  },

  async scans(params: Record<string, unknown> = {}) {
    const response = await api.get("/patrol/scans", { params });
    return listFrom(unwrap<Paginated<PatrolScan> | PatrolScan[]>(response));
  },
};
