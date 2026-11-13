import { api } from '@/shared/api/httpClient';

export const promotionService = {
  getPromotions: (params?: Record<string, string | number>) => {
    return api.get('/promotions', { params });
  },

  getMyPromotions: (params?: Record<string, string | number>) => {
    return api.get('/my/promotions', { params });
  },

  createPromotion: (data: any) => {
    return api.post('/promotions', data);
  },

  approvePromotion: (id: string | number) => {
    return api.post(`/promotions/${id}/approve`);
  },

  rejectPromotion: (id: string | number, remarks?: string) => {
    return api.post(`/promotions/${id}/reject`, { remarks });
  },

  deletePromotion: (id: string | number) => {
    return api.delete(`/promotions/${id}`);
  },

  submitReport: (id: string | number, data: { activity_report: string }) => {
    return api.post(`/my/promotions/${id}/report/submit`, data);
  },

  approveReport: (id: string | number) => {
    return api.post(`/promotions/${id}/report/approve`);
  },

  rejectReport: (id: string | number, data: { rejection_reason: string }) => {
    return api.post(`/promotions/${id}/report/reject`, data);
  },
};
