import { api } from "@/shared/api/httpClient";

export const documentService = {
  getMyDocuments: async (params?: { per_page?: number; page?: number; search?: string; status?: string }) => {
    const response = await api.get('/my/documents', { params });
    return response.data;
  },

  getDocuments: async (params?: { per_page?: number; page?: number; search?: string; status?: string }) => {
    const response = await api.get('/documents', { params });
    return response.data;
  },
  
  uploadDocument: async (formData: FormData) => {
    const response = await api.post('/my/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getDocumentDetail: async (id: number) => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  approveDocument: async (id: number, note?: string) => {
    const response = await api.put(`/documents/${id}/approve`, {
      note,
      remarks: note,
      review_notes: note,
    });
    return response.data;
  },

  rejectDocument: async (id: number, note: string) => {
    const response = await api.put(`/documents/${id}/reject`, {
      note,
      remarks: note,
      review_notes: note,
      reject_reason: note,
    });
    return response.data;
  },
};
