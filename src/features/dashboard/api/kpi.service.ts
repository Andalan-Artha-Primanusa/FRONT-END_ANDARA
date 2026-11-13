import { api } from "@/shared/api/httpClient";
import { isLegacyPresentationSession } from "@/shared/config/legacyPresentation";

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const extractPayload = (raw: unknown) => {
  const root = toRecord(raw);
  return root.data ?? raw;
};

const extractArrayPayload = (raw: unknown) => {
  const payload = extractPayload(raw);

  if (Array.isArray(payload)) {
    return payload.filter((item) => !!item && typeof item === "object");
  }

  const payloadRecord = toRecord(payload);
  const candidates = [payloadRecord.items, payloadRecord.rows, payloadRecord.data, payloadRecord.results];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item) => !!item && typeof item === "object");
    }
  }

  return [];
};

export type KpiPayload = {
  employee_id: number;
  title: string;
  description?: string;
  target: number;
  period: string;
};

export type KpiUpdatePayload = {
  title?: string;
  description?: string;
  target?: number;
  period?: string;
  achievement?: number;
};

export const getAllKpis = async () => {
  const response = await api.get(isLegacyPresentationSession() ? "/presentation/legacy/kpi-ees" : "/kpis");
  if (isLegacyPresentationSession()) {
    const payload = toRecord(extractPayload(response.data));
    const items = Array.isArray(payload.items) ? payload.items : [];
    return { items, raw: response.data };
  }
  return {
    items: extractArrayPayload(response.data),
    raw: response.data,
  };
};

export const getLegacyEes = async () => {
  const response = await api.get("/presentation/legacy/kpi-ees");
  const payload = toRecord(extractPayload(response.data));
  return {
    periods: Array.isArray(payload.periods) ? payload.periods : [],
    questions: Array.isArray(payload.questions) ? payload.questions : [],
    results: Array.isArray(payload.results) ? payload.results : [],
    raw: response.data,
  };
};

export const createKpi = async (payload: KpiPayload) => {
  const response = await api.post("/kpis", payload);
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const getKpiDetail = async (id: string) => {
  const response = await api.get(`/kpis/${id}`);
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const updateKpi = async (id: string, payload: KpiUpdatePayload) => {
  const response = await api.put(`/kpis/${id}`, payload);
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const deleteKpi = async (id: string) => {
  const response = await api.delete(`/kpis/${id}`);
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const getKpisByEmployee = async (employeeId: string) => {
  const response = await api.get(`/kpis/employee/${employeeId}`);
  return {
    items: extractArrayPayload(response.data),
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const approveKpi = async (id: string) => {
  const response = await api.put(`/kpis/${id}/approve`);
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const getMyKpis = async () => {
  const response = await api.get("/my/kpi");
  return {
    items: extractArrayPayload(response.data),
    raw: response.data,
  };
};

export const submitMyKpi = async (id: string) => {
  const response = await api.post(`/my/kpi/${id}/submit`);
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};
