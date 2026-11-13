import { api } from "@/shared/api/httpClient";

export type DashboardWidget = {
  key: string;
  label: string;
  required_permission: string;
};

export type DashboardConfig = {
  id?: number;
  name: string;
  scope: "self" | "company" | "all_companies";
  company_id?: number | null;
  layout_json?: Array<{ key: string; size: "sm" | "md" | "lg" }>;
  filters_json?: Record<string, unknown>;
  is_default?: boolean;
};

const unwrap = <T>(response: { data: { data?: T } | T }) => {
  const payload = response.data as { data?: T };
  return payload.data ?? (response.data as T);
};

export const dashboardConfigService = {
  async widgets() {
    const response = await api.get("/dashboard/widgets");
    return unwrap<DashboardWidget[]>(response);
  },

  async list() {
    const response = await api.get("/dashboard/configs");
    return unwrap<DashboardConfig[]>(response);
  },

  async save(config: DashboardConfig) {
    const response = config.id
      ? await api.put(`/dashboard/configs/${config.id}`, config)
      : await api.post("/dashboard/configs", config);
    return unwrap<DashboardConfig>(response);
  },
};
