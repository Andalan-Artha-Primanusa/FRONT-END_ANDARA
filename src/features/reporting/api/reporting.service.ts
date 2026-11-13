import { api } from "@/shared/api/httpClient";

export const reportingService = {
  getDashboardSummary: async () => {
    const response = await api.get('/reports/dashboard-summary');
    return response.data;
  },
  getHeadcountTrend: async () => {
    const response = await api.get('/reports/headcount-trend');
    return response.data;
  },
  getTurnoverStats: async () => {
    const response = await api.get('/reports/turnover-stats');
    return response.data;
  }
};
