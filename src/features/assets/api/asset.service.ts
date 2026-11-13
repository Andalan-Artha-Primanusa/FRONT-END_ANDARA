import { api } from "@/shared/api/httpClient";

export const assetService = {
  // --- Approval Actions ---
  approveAssignment: async (assignmentId: string | number, note?: string) => {
    const response = await api.put(`/assets/assignments/${assignmentId}/approve`, { note });
    return response.data;
  },
  rejectAssignment: async (assignmentId: string | number, note?: string) => {
    const response = await api.put(`/assets/assignments/${assignmentId}/reject`, { note });
    return response.data;
  },
  // --- Asset Management (Admin/HR) ---
  getAssets: async (params?: { status?: string; search?: string; page?: number; per_page?: number }) => {
    const response = await api.get('/assets', { params });
    return response.data;
  },
  getAsset: async (id: string | number) => {
    const response = await api.get(`/assets/${id}`);
    return response.data;
  },
  createAsset: async (data: any) => {
    const response = await api.post('/assets', data);
    return response.data;
  },
  updateAsset: async (id: string | number, data: any) => {
    const response = await api.put(`/assets/${id}`, data);
    return response.data;
  },
  deleteAsset: async (id: string | number) => {
    const response = await api.delete(`/assets/${id}`);
    return response.data;
  },

  // --- Assignment Transactions ---
  getAssignments: async (page = 1, perPage = 10) => {
    const response = await api.get('/assets/assignments', { params: { page, per_page: perPage } });
    return response.data;
  },
  assignAsset: async (assetId: string | number, data: {
    employee_id: number | string;
    assignment_note?: string;
    assigned_at?: string;
    location_id?: number | string;
  }) => {
    const response = await api.post(`/assets/${assetId}/assign`, data);
    return response.data;
  },
  returnAsset: async (assignmentId: string | number, data: {
    return_note?: string;
    returned_at?: string;
    condition?: string;
  }) => {
    const response = await api.put(`/assets/assignments/${assignmentId}/return`, data);
    return response.data;
  },
  returnAssetByEmployee: async (assignmentId: string | number, data: {
    return_note?: string;
    returned_at?: string;
  }) => {
    const response = await api.put(`/my/assets/return/${assignmentId}`, data);
    return response.data;
  },

  // --- ESS (Employee Self Service) ---
  getMyAssets: async () => {
    const response = await api.get('/my/assets');
    return response.data;
  },

  // --- Analytics ---
  getAssetReports: async () => {
    const response = await api.get('/reports/assets');
    return response.data;
  },
};
