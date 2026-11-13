import { api } from "@/shared/api/httpClient";

type ApiCollection<T = unknown> = {
  items?: T[];
  payload?: T[];
  data?: T[] | { data?: T[] };
};

const unwrapCollection = <T>(payload: ApiCollection<T> | T[]): { items: T[]; payload: T[] } => {
  if (Array.isArray(payload)) {
    return { items: payload, payload };
  }

  const nestedData = payload.data && !Array.isArray(payload.data) ? payload.data.data : undefined;
  const items = payload.items ?? payload.payload ?? (Array.isArray(payload.data) ? payload.data : nestedData) ?? [];

  return { items, payload: items };
};

export const workforceService = {
  async getHolidays() {
    const response = await api.get("/workforce/holidays");
    return unwrapCollection(response.data);
  },

  async deleteHoliday(id: string | number) {
    const response = await api.delete(`/workforce/holidays/${id}`);
    return response.data;
  },

  async getOvertimeRules() {
    const response = await api.get("/workforce/overtime-rules");
    return unwrapCollection(response.data);
  },

  async deleteOvertimeRule(id: string | number) {
    const response = await api.delete(`/workforce/overtime-rules/${id}`);
    return response.data;
  },

  async getComplianceStats() {
    const response = await api.get("/workforce/compliance/stats");
    return unwrapCollection(response.data);
  },

  async getComplianceDocuments() {
    const response = await api.get("/workforce/compliance/documents");
    return unwrapCollection(response.data);
  },
};
